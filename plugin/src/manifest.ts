import { manifestName, type ResolvedOptions } from "./options.js";

/*
 * The slice of the AndroidManifest object model this plugin touches, as
 * `@expo/config-plugins` parses it with xml2js. Kept structural so the
 * function can be tested without Expo installed.
 */
interface Attributes {
	$: Record<string, string | undefined>;
}
interface Action extends Attributes {}
interface IntentFilter {
	action?: Action[];
}
interface Component extends Attributes {
	"intent-filter"?: IntentFilter[];
	"meta-data"?: Attributes[];
}
interface Application extends Attributes {
	receiver?: Component[];
	activity?: Component[];
}
export interface Manifest {
	manifest: {
		$?: Record<string, string | undefined>;
		application?: Application[];
	};
}

/** Marks the components this plugin owns, so a later run can replace exactly those. */
export const OWNER_META = "expo-android-widgets.owner";

const owned = (component: Component) =>
	component["meta-data"]?.some(
		(meta) => meta.$["android:name"] === OWNER_META,
	) ?? false;

const ownerMeta = (): Attributes => ({
	$: { "android:name": OWNER_META, "android:value": "true" },
});

/**
 * Declares one receiver per widget and the optional configure activity, and
 * removes whatever an earlier run declared. Returns the same manifest object.
 */
export function applyWidgetsToManifest<M extends Manifest>(
	manifest: M,
	options: ResolvedOptions,
): M {
	const application = manifest.manifest.application?.[0];
	if (!application)
		throw new Error(
			"expo-android-widgets: AndroidManifest.xml has no <application> element",
		);

	application.receiver = (application.receiver ?? []).filter(
		(receiver) => !owned(receiver),
	);
	application.activity = (application.activity ?? []).filter(
		(activity) => !owned(activity),
	);

	for (const widget of options.widgets) {
		const actions = [
			"android.appwidget.action.APPWIDGET_UPDATE",
			...widget.actions,
		];
		application.receiver.push({
			$: {
				"android:name": manifestName(widget.name, options.subpackage),
				"android:exported": "false",
				...(widget.label === undefined
					? {}
					: { "android:label": widget.label }),
			},
			"intent-filter": [
				{ action: actions.map((name) => ({ $: { "android:name": name } })) },
			],
			"meta-data": [
				{
					$: {
						"android:name": "android.appwidget.provider",
						"android:resource": `@xml/${widget.info}`,
					},
				},
				ownerMeta(),
			],
		});
	}

	if (options.configureActivity) {
		// The launcher starts it from its own process, so it has to be exported.
		// The activity must refuse a widget id that is not one of this app's.
		application.activity.push({
			$: {
				"android:name": manifestName(
					options.configureActivity.name,
					options.subpackage,
				),
				"android:exported": "true",
				"android:excludeFromRecents": "true",
				"android:taskAffinity": "",
				"android:theme": options.configureActivity.theme,
			},
			"intent-filter": [
				{
					action: [
						{
							$: {
								"android:name": "android.appwidget.action.APPWIDGET_CONFIGURE",
							},
						},
					],
				},
			],
			"meta-data": [ownerMeta()],
		});
	}

	return manifest;
}
