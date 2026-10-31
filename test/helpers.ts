import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** A throwaway project: widget sources under `widgets/android`, an empty Android project. */
export function makeProject(files: Record<string, string> = {}) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "expo-android-widgets-"));
	const defaults: Record<string, string> = {
		"widgets/android/kotlin/WeatherWidget.kt":
			"package __WIDGETS_PACKAGE__\n\nimport __PACKAGE__.R\n\nclass WeatherWidget\n",
		"widgets/android/res/xml/weather_widget_info.xml":
			"<appwidget-provider />\n",
		"widgets/android/res/layout/weather_widget.xml": "<LinearLayout />\n",
	};
	for (const [name, content] of Object.entries({ ...defaults, ...files })) {
		const file = path.join(root, name);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, content);
	}
	const android = path.join(root, "android");
	fs.mkdirSync(path.join(android, "app", "src", "main", "res", "values"), {
		recursive: true,
	});
	return { root, android };
}

export const read = (file: string) => fs.readFileSync(file, "utf8");
