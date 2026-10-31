import { describe, expect, it } from "vitest";

import {
	applyWidgetsToManifest,
	type Manifest,
	OWNER_META,
} from "../plugin/src/manifest.js";
import type { ResolvedOptions } from "../plugin/src/options.js";

const options: ResolvedOptions = {
	src: "/project/widgets/android",
	kotlinDir: null,
	resDir: null,
	subpackage: "widgets",
	widgets: [
		{
			name: "WeatherWidget",
			info: "weather_widget_info",
			label: "@string/weather_widget_label",
			actions: [],
		},
		{
			name: "ClockWidget",
			info: "clock_widget_info",
			actions: ["android.intent.action.TIME_SET"],
		},
	],
	configureActivity: null,
};

const appManifest = (): Manifest => ({
	manifest: {
		application: [
			{
				$: { "android:name": ".MainApplication" },
				activity: [{ $: { "android:name": ".MainActivity" } }],
				receiver: [{ $: { "android:name": "com.other.BootReceiver" } }],
			},
		],
	},
});

describe("applyWidgetsToManifest", () => {
	it("declares one receiver per widget, beside the app's own", () => {
		const application = applyWidgetsToManifest(appManifest(), options).manifest
			.application?.[0];
		expect(
			application?.receiver?.map((receiver) => receiver.$["android:name"]),
		).toEqual([
			"com.other.BootReceiver",
			".widgets.WeatherWidget",
			".widgets.ClockWidget",
		]);
	});

	it("wires the provider info, the update action and the label", () => {
		const weather = applyWidgetsToManifest(appManifest(), options).manifest
			.application?.[0]?.receiver?.[1];
		expect(weather).toEqual({
			$: {
				"android:name": ".widgets.WeatherWidget",
				"android:exported": "false",
				"android:label": "@string/weather_widget_label",
			},
			"intent-filter": [
				{
					action: [
						{
							$: {
								"android:name": "android.appwidget.action.APPWIDGET_UPDATE",
							},
						},
					],
				},
			],
			"meta-data": [
				{
					$: {
						"android:name": "android.appwidget.provider",
						"android:resource": "@xml/weather_widget_info",
					},
				},
				{ $: { "android:name": OWNER_META, "android:value": "true" } },
			],
		});
	});

	it("adds the extra actions a widget asks for", () => {
		const clock = applyWidgetsToManifest(appManifest(), options).manifest
			.application?.[0]?.receiver?.[2];
		expect(
			clock?.["intent-filter"]?.[0]?.action?.map(
				(action) => action.$["android:name"],
			),
		).toEqual([
			"android.appwidget.action.APPWIDGET_UPDATE",
			"android.intent.action.TIME_SET",
		]);
		expect(clock?.$["android:label"]).toBeUndefined();
	});

	it("replaces its own entries on a second run instead of adding to them", () => {
		const manifest = applyWidgetsToManifest(appManifest(), options);
		applyWidgetsToManifest(manifest, {
			...options,
			widgets: options.widgets.slice(0, 1),
		});
		expect(
			manifest.manifest.application?.[0]?.receiver?.map(
				(receiver) => receiver.$["android:name"],
			),
		).toEqual(["com.other.BootReceiver", ".widgets.WeatherWidget"]);
	});

	it("declares an exported configure activity when asked", () => {
		const manifest = applyWidgetsToManifest(appManifest(), {
			...options,
			configureActivity: {
				name: "WidgetConfigureActivity",
				theme: "@style/Configure",
			},
		});
		const activity = manifest.manifest.application?.[0]?.activity?.[1];
		expect(activity?.$).toMatchObject({
			"android:name": ".widgets.WidgetConfigureActivity",
			"android:exported": "true",
			"android:theme": "@style/Configure",
		});
		expect(
			activity?.["intent-filter"]?.[0]?.action?.[0]?.$["android:name"],
		).toBe("android.appwidget.action.APPWIDGET_CONFIGURE");
		applyWidgetsToManifest(manifest, options);
		expect(manifest.manifest.application?.[0]?.activity).toHaveLength(1);
	});

	it("fails clearly without an <application> element", () => {
		expect(() => applyWidgetsToManifest({ manifest: {} }, options)).toThrow(
			/<application>/,
		);
	});
});
