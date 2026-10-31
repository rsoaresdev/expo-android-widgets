import type { ConfigPlugin } from "expo/config-plugins";

import type { PluginOptions } from "./plugin/build/index.js";

declare const withAndroidWidgets: ConfigPlugin<PluginOptions>;
export = withAndroidWidgets;
