package __WIDGETS_PACKAGE__

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import __PACKAGE__.R
import expo.modules.androidwidgets.WidgetData
import org.json.JSONObject

/**
 * Draws the `summary` data the app stores with
 * `setWidgetData("summary", { title, value })`.
 */
class SummaryWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val data = WidgetData.read(context, "summary")?.let { runCatching { JSONObject(it) }.getOrNull() }
    val title = data?.optString("title")?.takeIf { it.isNotEmpty() }
      ?: context.getString(R.string.widget_summary_empty)
    val value = data?.optString("value").orEmpty()

    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val open = launch?.let {
      PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    for (id in ids) {
      val views = RemoteViews(context.packageName, R.layout.widget_summary)
      views.setTextViewText(R.id.widget_summary_title, title)
      views.setTextViewText(R.id.widget_summary_value, value)
      if (open != null) views.setOnClickPendingIntent(R.id.widget_summary_root, open)
      manager.updateAppWidget(id, views)
    }
  }
}
