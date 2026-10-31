import {
	type ConfigPlugin,
	createRunOncePlugin,
	withAndroidManifest,
	withDangerousMod,
} from "expo/config-plugins";

import { writeWidgetFiles } from "./files.js";
import { applyWidgetsToManifest, type Manifest } from "./manifest.js";
import { type PluginOptions, resolveOptions } from "./options.js";

export type {
	ConfigureActivityOptions,
	PluginOptions,
	WidgetOptions,
} from "./options.js";

const withAndroidWidgets: ConfigPlugin<PluginOptions> = (config, options) => {
	const packageName = config.android?.package;
	if (!packageName)
		throw new Error(
			"expo-android-widgets: set `android.package` in your app config",
		);

	config = withDangerousMod(config, [
		"android",
		(mod) => {
			const { projectRoot, platformProjectRoot } = mod.modRequest;
			writeWidgetFiles(
				platformProjectRoot,
				packageName,
				resolveOptions(options, projectRoot),
			);
			return mod;
		},
	]);

	return withAndroidManifest(config, (mod) => {
		applyWidgetsToManifest(
			mod.modResults as unknown as Manifest,
			resolveOptions(options, mod.modRequest.projectRoot),
		);
		return mod;
	});
};

export default createRunOncePlugin(withAndroidWidgets, "expo-android-widgets");
