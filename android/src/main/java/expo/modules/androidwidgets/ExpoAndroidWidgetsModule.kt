package expo.modules.androidwidgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoAndroidWidgetsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  // Async, so disk writes and the launcher's provider list stay off the JavaScript thread.
  override fun definition() = ModuleDefinition {
    Name("ExpoAndroidWidgets")

    AsyncFunction("setData") { key: String, json: String ->
      WidgetData.write(context, key, json)
    }

    AsyncFunction("getData") { key: String ->
      WidgetData.read(context, key)
    }

    AsyncFunction("removeData") { key: String ->
      WidgetData.remove(context, key)
    }

    AsyncFunction("reloadAll") {
      providers(context).sumOf { update(context, it) }
    }

    AsyncFunction("reload") { provider: String ->
      val className = if (provider.startsWith(".")) context.packageName + provider else provider
      val component = providers(context).firstOrNull {
        it.className == className || it.className.substringAfterLast('.') == provider
      } ?: return@AsyncFunction 0
      update(context, component)
    }
  }

  /** This app's widget providers, as the launcher knows them. */
  private fun providers(context: Context): List<ComponentName> =
    AppWidgetManager.getInstance(context).installedProviders
      .map { it.provider }
      .filter { it.packageName == context.packageName }

  /** Asks one provider to redraw every widget of it that is placed; returns how many. */
  private fun update(context: Context, provider: ComponentName): Int {
    val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(provider)
    if (ids.isEmpty()) return 0
    context.sendBroadcast(
      Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
        .setComponent(provider)
        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids),
    )
    return ids.size
  }
}
