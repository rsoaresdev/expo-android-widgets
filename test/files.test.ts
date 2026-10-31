import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LEDGER, writeWidgetFiles } from "../plugin/src/files.js";
import { resolveOptions } from "../plugin/src/options.js";
import { makeProject, read } from "./helpers.js";

const options = {
	src: "./widgets/android",
	widgets: [{ name: "WeatherWidget", info: "weather_widget_info" }],
};
const main = (android: string, ...parts: string[]) =>
	path.join(android, "app", "src", "main", ...parts);

describe("writeWidgetFiles", () => {
	it("puts the Kotlin in the widgets package and fills in the package names", () => {
		const { root, android } = makeProject();
		writeWidgetFiles(android, "com.example.app", resolveOptions(options, root));
		const kotlin = read(
			main(
				android,
				"java",
				"com",
				"example",
				"app",
				"widgets",
				"WeatherWidget.kt",
			),
		);
		expect(kotlin).toContain("package com.example.app.widgets");
		expect(kotlin).toContain("import com.example.app.R");
		expect(kotlin).not.toContain("__");
	});

	it("merges the resources into the app's res folder", () => {
		const { root, android } = makeProject();
		writeWidgetFiles(android, "com.example.app", resolveOptions(options, root));
		expect(
			fs.existsSync(main(android, "res", "xml", "weather_widget_info.xml")),
		).toBe(true);
		expect(
			fs.existsSync(main(android, "res", "layout", "weather_widget.xml")),
		).toBe(true);
	});

	it("copies binary files byte for byte", () => {
		const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
		const { root, android } = makeProject();
		const png = path.join(
			root,
			"widgets/android/res/drawable/weather_preview.png",
		);
		fs.mkdirSync(path.dirname(png), { recursive: true });
		fs.writeFileSync(png, bytes);
		writeWidgetFiles(android, "com.example.app", resolveOptions(options, root));
		expect(
			fs.readFileSync(main(android, "res", "drawable", "weather_preview.png")),
		).toEqual(bytes);
	});

	it("removes what the last run wrote, so a deleted widget does not linger", () => {
		const { root, android } = makeProject({
			"widgets/android/res/layout/old_widget.xml": "<LinearLayout />\n",
		});
		writeWidgetFiles(android, "com.example.app", resolveOptions(options, root));
		fs.rmSync(path.join(root, "widgets/android/res/layout/old_widget.xml"));
		const written = writeWidgetFiles(
			android,
			"com.example.app",
			resolveOptions(options, root),
		);
		expect(
			fs.existsSync(main(android, "res", "layout", "old_widget.xml")),
		).toBe(false);
		expect(written).not.toContain("app/src/main/res/layout/old_widget.xml");
		expect(JSON.parse(read(path.join(android, LEDGER))).files).toEqual(written);
	});

	it("runs again without complaint", () => {
		const { root, android } = makeProject();
		const resolved = resolveOptions(options, root);
		const first = writeWidgetFiles(android, "com.example.app", resolved);
		expect(writeWidgetFiles(android, "com.example.app", resolved)).toEqual(
			first,
		);
	});

	it("refuses to overwrite a file it did not write, and writes nothing", () => {
		const { root, android } = makeProject({
			"widgets/android/res/values/strings.xml": "<resources />\n",
		});
		fs.writeFileSync(
			main(android, "res", "values", "strings.xml"),
			"<resources>app</resources>",
		);
		expect(() =>
			writeWidgetFiles(
				android,
				"com.example.app",
				resolveOptions(options, root),
			),
		).toThrow(/strings\.xml already exists/);
		expect(read(main(android, "res", "values", "strings.xml"))).toBe(
			"<resources>app</resources>",
		);
		expect(
			fs.existsSync(main(android, "res", "xml", "weather_widget_info.xml")),
		).toBe(false);
	});

	it("never deletes outside the Android project, whatever the ledger says", () => {
		const { root, android } = makeProject();
		const outside = path.join(root, "keep.txt");
		fs.writeFileSync(outside, "keep");
		fs.writeFileSync(
			path.join(android, LEDGER),
			JSON.stringify({ files: ["../keep.txt"] }),
		);
		writeWidgetFiles(android, "com.example.app", resolveOptions(options, root));
		expect(read(outside)).toBe("keep");
	});

	it("uses a custom subpackage", () => {
		const { root, android } = makeProject();
		writeWidgetFiles(
			android,
			"com.example.app",
			resolveOptions({ ...options, package: "home.widgets" }, root),
		);
		const kotlin = read(
			main(
				android,
				"java",
				"com",
				"example",
				"app",
				"home",
				"widgets",
				"WeatherWidget.kt",
			),
		);
		expect(kotlin).toContain("package com.example.app.home.widgets");
	});
});
