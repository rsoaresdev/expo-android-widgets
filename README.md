# expo-android-widgets

![expo-android-widgets: Android home screen widgets for Expo, in native Kotlin](.github/assets/cover.png)

[![npm](https://img.shields.io/npm/v/expo-android-widgets.svg)](https://www.npmjs.com/package/expo-android-widgets)
[![CI](https://github.com/rsoaresdev/expo-android-widgets/actions/workflows/ci.yml/badge.svg)](https://github.com/rsoaresdev/expo-android-widgets/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/expo-android-widgets.svg)](LICENSE)

**Native Android home screen widgets for Expo apps.** Write the widget in Kotlin, keep its sources in your project, and let `expo prebuild` put it in the Android project. The `android` folder can stay out of git.

<img src="docs/widget.png" alt="Three steps side by side. setWidgetData with Fuel this month, 62,40 euros, and the widget shows it. setWidgetData with Next service, in 1 240 km, and the widget updates. removeWidgetData followed by reloadAllWidgets, and the widget shows its empty state, Open the app to start." width="800">

Every widget above is a real screenshot of the [example widget](example/widgets/android) on a Pixel emulator, after the code beside it ran in the app.

## How it works

```text
your project                       prebuild                    the phone
--------------------------------   ------------------------    ------------------------------
widgets/android/kotlin/*.kt    ->  copied into android/app ->  the launcher draws the widget
widgets/android/res/**         ->  copied into android/app     with RemoteViews, even when
app.json plugin options        ->  <receiver> in manifest      the app is closed

JS:     setWidgetData(key, value) + reloadAllWidgets()
Kotlin: WidgetData.read(context, key)  -> the same JSON
```

- The app writes data with `setWidgetData` and asks the widgets to redraw with `reloadAllWidgets`.
- The widget reads that data with one line of Kotlin and draws it.
- No JavaScript runs in the widget, so it draws instantly and works while the app is closed.

Requires Expo SDK 58 or later, with a development build or EAS Build. Not available in Expo Go, like any native code.

## Quick start

### 1. Install

```bash
npx expo install expo-android-widgets
```

### 2. Copy the example widget

Copy [`example/widgets/android`](example/widgets/android) into your project as `widgets/android`:

```text
widgets/android/
  kotlin/SummaryWidget.kt                      the widget's code
  res/layout/widget_summary.xml                its layout
  res/xml/widget_summary_info.xml              its size and preview
  res/drawable/widget_summary_background.xml   its rounded white background
  res/values/widget_summary_strings.xml        its name and empty-state text
```

### 3. Add the plugin to `app.json`

```json
{
	"expo": {
		"android": { "package": "com.example.myapp" },
		"plugins": [
			[
				"expo-android-widgets",
				{
					"src": "./widgets/android",
					"widgets": [
						{
							"name": "SummaryWidget",
							"info": "widget_summary_info",
							"label": "@string/widget_summary_label"
						}
					]
				}
			]
		]
	}
}
```

### 4. Build and place the widget

```bash
npx expo prebuild --platform android
npx expo run:android
```

Long-press the home screen, choose **Widgets**, find your app and add **Summary**. It shows "Open the app to start" until the app sends it data.

### 5. Send it data

```ts
import { reloadAllWidgets, setWidgetData } from "expo-android-widgets";

await setWidgetData("summary", { title: "Fuel this month", value: "62,40 €" });
await reloadAllWidgets();
```

Go back to the home screen: the widget shows "Fuel this month" and "62,40 €".

## Recipes

### Keep the widget in sync with app state

Write and redraw wherever the data changes. A hook works well:

```tsx
import { useEffect } from "react";
import { reloadAllWidgets, setWidgetData } from "expo-android-widgets";

function useFuelWidget(total: string) {
	useEffect(() => {
		setWidgetData("summary", { title: "Fuel this month", value: total })
			.then(reloadAllWidgets)
			.catch(console.warn);
	}, [total]);
}
```

Send text that is ready to show (formatted numbers, translated sentences). The widget only draws it, so the app and the widget always agree.

### Clear the widget on sign-out

```ts
import { reloadAllWidgets, removeWidgetData } from "expo-android-widgets";

await removeWidgetData("summary");
await reloadAllWidgets();
```

Both lines are needed. `removeWidgetData` only deletes the stored data. Widgets already on the home screen keep showing the old value until they redraw, so without `reloadAllWidgets` the previous user's data stays visible. The example widget draws its empty state when the data is missing.

### Redraw one widget only

When an app has several widgets, redraw only the one whose data changed:

```ts
import { reloadWidgets, setWidgetData } from "expo-android-widgets";

await setWidgetData("weather", { temperature: "18°" });
await reloadWidgets("WeatherWidget");
```

`reloadAllWidgets` and `reloadWidgets` resolve to how many placed widgets were asked to redraw, so `0` means the user has not added one yet.

### Read the data in Kotlin

```kotlin
val json = WidgetData.read(context, "summary") // the JSON text, or null
val data = json?.let { runCatching { JSONObject(it) }.getOrNull() }
val title = data?.optString("title")?.takeIf { it.isNotEmpty() }
  ?: context.getString(R.string.widget_summary_empty)
```

Treat `null` as "nothing yet" and draw an empty state. See [`SummaryWidget.kt`](example/widgets/android/kotlin/SummaryWidget.kt) for the full provider, including opening the app on tap.

### Share code with iOS and the web

Every function is safe to call on every platform. Outside Android it does nothing and resolves to an empty value, so shared code needs no `Platform.OS` checks. Use `isAvailable` to show an "Add the widget" hint only where a widget can exist:

```tsx
import { isAvailable } from "expo-android-widgets";

{isAvailable && <AddWidgetHint />}
```

### Add a second widget

1. Add its Kotlin provider to `widgets/android/kotlin/` and its resources to `widgets/android/res/`. Prefix resource names with `widget_` so they never clash with the app's.
2. Add an entry to `widgets` in the plugin options.
3. Run `npx expo prebuild --platform android` again.

## Writing Kotlin for the plugin

The plugin fills in two placeholders in your Kotlin files, so the same sources work in any app:

```kotlin
package __WIDGETS_PACKAGE__          // becomes com.example.myapp.widgets

import __PACKAGE__.R                 // becomes com.example.myapp.R
import expo.modules.androidwidgets.WidgetData
```

Everything else is plain Android: any `RemoteViews` layout, collection widgets, configuration activities, `updatePeriodMillis`, alarms, broadcasts and Material You colours.

Keep `onUpdate` small, because it runs on the main thread. Set `android:updatePeriodMillis="0"` and redraw from the app when the data changes. The system runs periodic updates at most every 30 minutes anyway.

## API

### JavaScript

All functions return a promise and do their native work off the JavaScript thread.

| Function | What it does |
| --- | --- |
| `setWidgetData(key, value)` | Stores `value` as JSON under `key`. The write is atomic, so a widget never reads half of it. Does not redraw. |
| `getWidgetData(key)` | Resolves to the stored value, or `null`. |
| `removeWidgetData(key)` | Deletes the stored value. Does not redraw. |
| `reloadAllWidgets()` | Redraws every placed widget of the app. Resolves to how many. |
| `reloadWidgets(provider)` | Redraws the placed widgets of one provider: `"WeatherWidget"`, `".widgets.WeatherWidget"` or the full class name. Resolves to how many. |
| `isAvailable` | `true` when the native module is in the build. |

Keys are 1 to 64 letters, digits, `_` or `-`. The data lives in the app's private files directory, under `expo-android-widgets/<key>.json`.

### Kotlin

```kotlin
WidgetData.read(context: Context, key: String): String?
```

Returns the JSON text stored under `key`, or `null` when there is none. Parse it with `org.json.JSONObject` or your JSON library.

### Plugin options

| Option | Type | Description |
| --- | --- | --- |
| `src` | `string` | Folder with your widget sources, relative to the project root. It may contain `kotlin/` and `res/`. |
| `widgets` | `WidgetOptions[]` | One entry per widget provider. |
| `configureActivity` | `{ name, theme? }` | Optional activity the launcher opens when a widget is placed or reconfigured. It is exported, as Android requires, so it must reject a widget id that is not your app's. |
| `package` | `string` | Subpackage of your app package for the Kotlin files. Defaults to `widgets`. |

Each entry in `widgets`:

| Field | Type | Description |
| --- | --- | --- |
| `name` | `string` | The provider class. A simple name lives in the widgets package; a name starting with `.` is relative to the app package. |
| `info` | `string` | The widget info file in `res/xml`, without `.xml`. |
| `label` | `string` | Name in the widget picker: text or a `@string/` resource. |
| `actions` | `string[]` | Extra broadcast actions the provider receives, for example `android.intent.action.TIME_SET`. |

On every prebuild the plugin:

1. Copies `kotlin/` into `app/src/main/java/<package>/widgets/` and `res/` into `app/src/main/res/`, filling in the placeholders.
2. Removes the files it wrote on the previous run, so a deleted widget does not stay in the build.
3. Refuses to overwrite a file it did not write, and names it.
4. Declares a `<receiver>` for each widget, and the configure activity, in `AndroidManifest.xml`, replacing its own earlier entries.

## Troubleshooting

**The widget is not in the widget picker.** Rebuild the app after changing the plugin options or adding a widget: `npx expo prebuild --platform android` and `npx expo run:android`. Expo Go cannot show it.

**The widget shows old data.** Call `reloadAllWidgets()` after `setWidgetData` or `removeWidgetData`. Neither redraws by itself.

**Prebuild fails with "... already exists".** One of your widget files has the same name as a file already in the Android project. Rename yours, for example with a `widget_` prefix. The error names both files.

**The functions do nothing.** Check `isAvailable`. It is `false` on iOS, on the web, in Expo Go and in a build made before the package was installed.

## Why native Kotlin

Android draws widgets with `RemoteViews`, in the launcher's process, while your app may not be running. Writing them in Kotlin is the way Android expects, and gives you every widget feature with nothing in between.

If you prefer to describe widgets in JSX, [react-native-android-widget](https://github.com/sAleksovski/react-native-android-widget) is a good choice. This package is for when you want plain Android widgets in an Expo app.

## License

[MIT](LICENSE)
