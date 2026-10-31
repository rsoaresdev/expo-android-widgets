import { describe, expect, it } from "vitest";

import {
	DEFAULT_CONFIGURE_THEME,
	manifestName,
	type PluginOptions,
	resolveOptions,
} from "../plugin/src/options.js";
import { makeProject } from "./helpers.js";

const base: PluginOptions = {
	src: "./widgets/android",
	widgets: [{ name: "WeatherWidget", info: "weather_widget_info" }],
};

describe("resolveOptions", () => {
	it("fills in the defaults", () => {
		const { root } = makeProject();
		const resolved = resolveOptions(base, root);
		expect(resolved.subpackage).toBe("widgets");
		expect(resolved.widgets).toEqual([
			{ name: "WeatherWidget", info: "weather_widget_info", actions: [] },
		]);
		expect(resolved.kotlinDir).toMatch(/widgets\/android\/kotlin$/);
		expect(resolved.configureActivity).toBeNull();
	});

	it("gives the configure activity a translucent theme by default", () => {
		const { root } = makeProject();
		const resolved = resolveOptions(
			{ ...base, configureActivity: { name: "WidgetConfigureActivity" } },
			root,
		);
		expect(resolved.configureActivity).toEqual({
			name: "WidgetConfigureActivity",
			theme: DEFAULT_CONFIGURE_THEME,
		});
	});

	it.each([
		[undefined, /pass options/],
		[{ ...base, src: "" }, /`src`/],
		[{ ...base, src: "./missing" }, /not found/],
		[{ ...base, widgets: [] }, /at least one widget/],
		[
			{ ...base, widgets: [{ name: "9Lives", info: "weather_widget_info" }] },
			/class name/,
		],
		[
			{ ...base, widgets: [{ name: "WeatherWidget", info: "Weather-Info" }] },
			/resource name/,
		],
		[
			{ ...base, widgets: [{ name: "WeatherWidget", info: "absent_info" }] },
			/info file not found/,
		],
		[
			{
				...base,
				widgets: [
					{ name: "WeatherWidget", info: "weather_widget_info" },
					{ name: "WeatherWidget", info: "weather_widget_info" },
				],
			},
			/listed twice/,
		],
		[{ ...base, package: "Widgets" }, /lower-case package/],
		[
			{
				...base,
				widgets: [
					{
						name: "WeatherWidget",
						info: "weather_widget_info",
						actions: ["not an action"],
					},
				],
			},
			/action names/,
		],
		[
			{
				...base,
				widgets: [
					{ name: "WeatherWidget", info: "weather_widget_info", actions: [42] },
				],
			},
			/action names/,
		],
		[
			{
				...base,
				widgets: [
					{
						name: "WeatherWidget",
						info: "weather_widget_info",
						label: "@weather",
					},
				],
			},
			/string resource/,
		],
		[
			{
				...base,
				widgets: [
					{ name: "WeatherWidget", info: "weather_widget_info", label: "" },
				],
			},
			/label/,
		],
		[{ ...base, configureActivity: { name: "bad name" } }, /configureActivity/],
	])("rejects %#", (options, message) => {
		const { root } = makeProject();
		expect(() => resolveOptions(options as PluginOptions, root)).toThrow(
			message,
		);
	});
});

describe("labels and actions", () => {
	it("accepts plain text, a string resource and dotted action names", () => {
		const { root } = makeProject();
		const text = resolveOptions(
			{
				...base,
				widgets: [
					{
						name: "WeatherWidget",
						info: "weather_widget_info",
						label: "Weather",
						actions: ["android.intent.action.TIME_SET"],
					},
				],
			},
			root,
		);
		expect(text.widgets[0]?.label).toBe("Weather");
		const resource = resolveOptions(
			{
				...base,
				widgets: [
					{
						name: "WeatherWidget",
						info: "weather_widget_info",
						label: "@string/weather",
					},
				],
			},
			root,
		);
		expect(resource.widgets[0]?.label).toBe("@string/weather");
	});
});

describe("manifestName", () => {
	it("puts a simple name in the widgets package", () => {
		expect(manifestName("WeatherWidget", "widgets")).toBe(
			".widgets.WeatherWidget",
		);
	});

	it("keeps a relative or full name as written", () => {
		expect(manifestName(".home.WeatherWidget", "widgets")).toBe(
			".home.WeatherWidget",
		);
		expect(manifestName("com.example.WeatherWidget", "widgets")).toBe(
			"com.example.WeatherWidget",
		);
	});
});
