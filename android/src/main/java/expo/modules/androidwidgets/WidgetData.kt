package expo.modules.androidwidgets

import android.content.Context
import java.io.File

/**
 * The data the app hands its widgets: one JSON text per key, in the app's own
 * files directory. JavaScript writes it with `setWidgetData`; a widget
 * provider reads it with `WidgetData.read`.
 *
 * A widget provider runs in the app's process but not necessarily while the
 * app is open, so the data has to be on disk, not in memory.
 */
object WidgetData {
  private const val DIRECTORY = "expo-android-widgets"
  private val KEY = Regex("^[A-Za-z0-9_-]{1,64}$")

  /** The JSON text stored under [key], or null when nothing was written yet. */
  @JvmStatic
  fun read(context: Context, key: String): String? {
    val file = file(context, key)
    return if (file.exists()) file.readText(Charsets.UTF_8) else null
  }

  internal fun write(context: Context, key: String, json: String) {
    val target = file(context, key)
    target.parentFile?.mkdirs()
    // Written beside the target and renamed over it, so a widget drawn mid-write
    // reads the old data or the new data, never half of one.
    val partial = File(target.parentFile, "${target.name}.partial")
    partial.writeText(json, Charsets.UTF_8)
    if (!partial.renameTo(target)) {
      partial.delete()
      throw IllegalStateException("Could not save widget data for key \"$key\"")
    }
  }

  internal fun remove(context: Context, key: String) {
    file(context, key).delete()
  }

  private fun file(context: Context, key: String): File {
    require(KEY.matches(key)) {
      "Widget data key must be 1 to 64 letters, digits, '_' or '-': \"$key\""
    }
    return File(File(context.filesDir, DIRECTORY), "$key.json")
  }
}
