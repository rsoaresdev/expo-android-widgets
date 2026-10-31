import fs from "node:fs";
import path from "node:path";

export interface WidgetOptions {
	/**
	 * The provider class, an `AppWidgetProvider` subclass in your Kotlin
	 * sources: a simple name (`"WeatherWidget"`) lives in the widgets package,
	 * a name starting with a dot is relative to the app package.
	 */
	name: string;
	/** The widget info file in `res/xml`, without the extension. */
	info: string;
	/** The name in the launcher's widget picker: text or a `@string/` resource. */
	label?: string;
	/** Extra broadcast actions the provider should receive. */
	actions?: string[];
}

export interface ConfigureActivityOptions {
	/** The activity class, resolved like a widget's `name`. */
	name: string;
	/** Defaults to a translucent theme with no title bar. */
	theme?: string;
}

export interface PluginOptions {
	/**
	 * A folder in your project holding `kotlin/` and `res/`, relative to the
	 * project root. Both are optional.
	 */
	src: string;
	widgets: WidgetOptions[];
	/** An activity the launcher opens when a widget is placed or reconfigured. */
	configureActivity?: ConfigureActivityOptions;
	/** The subpackage of the app package the Kotlin files go in. Defaults to `widgets`. */
	package?: string;
}

export interface ResolvedOptions {
	src: string;
	kotlinDir: string | null;
	resDir: string | null;
	subpackage: string;
	widgets: Array<{
		name: string;
		info: string;
		actions: string[];
		label?: string;
	}>;
	configureActivity: Required<ConfigureActivityOptions> | null;
}

const CLASS_NAME = /^\.?[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const RESOURCE_NAME = /^[a-z_][a-z0-9_]*$/;
const PACKAGE_NAME = /^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/;
const ACTION_NAME = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/;
const STRING_RESOURCE = /^@(?:[a-z][a-z0-9_.]*:)?string\/[a-z_][a-z0-9_]*$/;

export const DEFAULT_CONFIGURE_THEME =
	"@android:style/Theme.Translucent.NoTitleBar";

function fail(message: string): never {
	throw new Error(`expo-android-widgets: ${message}`);
}

/** Checks the options against the project on disk, and fills in the defaults. */
export function resolveOptions(
	options: PluginOptions | undefined,
	projectRoot: string,
): ResolvedOptions {
	if (!options || typeof options !== "object")
		fail(
			'pass options, for example ["expo-android-widgets", { src, widgets }]',
		);
	if (typeof options.src !== "string" || options.src.length === 0)
		fail("`src` must be the folder that holds your widget sources");
	if (!Array.isArray(options.widgets) || options.widgets.length === 0)
		fail("`widgets` must list at least one widget");

	const src = path.resolve(projectRoot, options.src);
	if (!fs.existsSync(src)) fail(`\`src\` folder not found: ${src}`);
	const kotlinDir = path.join(src, "kotlin");
	const resDir = path.join(src, "res");

	const subpackage = options.package ?? "widgets";
	if (!PACKAGE_NAME.test(subpackage))
		fail(`\`package\` must be a lower-case package name: "${subpackage}"`);

	const seen = new Set<string>();
	const widgets = options.widgets.map((widget, index) => {
		if (
			!widget ||
			typeof widget.name !== "string" ||
			!CLASS_NAME.test(widget.name)
		)
			fail(`widgets[${index}].name must be a class name: "${widget?.name}"`);
		if (seen.has(widget.name)) fail(`widget "${widget.name}" is listed twice`);
		seen.add(widget.name);
		if (typeof widget.info !== "string" || !RESOURCE_NAME.test(widget.info))
			fail(
				`widgets[${index}].info must be a resource name like "weather_widget_info": "${widget.info}"`,
			);
		if (!fs.existsSync(path.join(resDir, "xml", `${widget.info}.xml`)))
			fail(
				`widget info file not found: ${path.join(resDir, "xml", `${widget.info}.xml`)}`,
			);
		if (
			widget.actions !== undefined &&
			(!Array.isArray(widget.actions) ||
				!widget.actions.every(
					(action) => typeof action === "string" && ACTION_NAME.test(action),
				))
		)
			fail(
				`widgets[${index}].actions must be a list of action names like "android.intent.action.TIME_SET"`,
			);
		if (widget.label !== undefined) {
			if (typeof widget.label !== "string" || widget.label.length === 0)
				fail(`widgets[${index}].label must be text or a @string/ resource`);
			// Android reads a label that starts with @ as a resource reference.
			if (widget.label.startsWith("@") && !STRING_RESOURCE.test(widget.label))
				fail(
					`widgets[${index}].label starts with "@" but is not a string resource like "@string/weather_label": "${widget.label}"`,
				);
		}
		return {
			name: widget.name,
			info: widget.info,
			actions: widget.actions ?? [],
			...(widget.label === undefined ? {} : { label: widget.label }),
		};
	});

	let configureActivity: ResolvedOptions["configureActivity"] = null;
	if (options.configureActivity) {
		const { name, theme } = options.configureActivity;
		if (typeof name !== "string" || !CLASS_NAME.test(name))
			fail(`configureActivity.name must be a class name: "${name}"`);
		configureActivity = { name, theme: theme ?? DEFAULT_CONFIGURE_THEME };
	}

	return {
		src,
		kotlinDir: fs.existsSync(kotlinDir) ? kotlinDir : null,
		resDir: fs.existsSync(resDir) ? resDir : null,
		subpackage,
		widgets,
		configureActivity,
	};
}

/** The manifest name of a class: relative names stay as written, simple names go in the subpackage. */
export function manifestName(name: string, subpackage: string): string {
	if (name.startsWith(".") || name.includes(".")) return name;
	return `.${subpackage}.${name}`;
}
