/**
 * Hand data to the app's Android home screen widgets and have them redrawn.
 *
 * Every function is safe to call on iOS, on the web, in tests and in a build
 * made before this package was installed: there it does nothing and resolves
 * to an empty value, so shared code needs no platform checks. The native work
 * runs off the JavaScript thread.
 */

import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

interface NativeModule {
	setData(key: string, json: string): Promise<void>;
	getData(key: string): Promise<string | null>;
	removeData(key: string): Promise<void>;
	reloadAll(): Promise<number>;
	reload(provider: string): Promise<number>;
}

const native =
	Platform.OS === "android"
		? requireOptionalNativeModule<NativeModule>("ExpoAndroidWidgets")
		: null;

const KEY = /^[A-Za-z0-9_-]{1,64}$/;

function assertKey(key: string): void {
	if (!KEY.test(key)) {
		throw new TypeError(
			`Widget data key must be 1 to 64 letters, digits, "_" or "-": "${key}"`,
		);
	}
}

/** Whether this binary can talk to Android widgets. */
export const isAvailable: boolean = native !== null;

/**
 * Store `value` as JSON under `key`, for a widget provider to read with
 * `WidgetData.read(context, key)`. The write is atomic: a widget drawn at the
 * same moment reads the old value or the new one, never half of one.
 */
export async function setWidgetData(
	key: string,
	value: unknown,
): Promise<void> {
	assertKey(key);
	const json = JSON.stringify(value);
	if (json === undefined) {
		throw new TypeError(`Widget data for "${key}" cannot be stored as JSON`);
	}
	await native?.setData(key, json);
}

/** The value stored under `key`, or null when there is none. */
export async function getWidgetData<T = unknown>(
	key: string,
): Promise<T | null> {
	assertKey(key);
	const json = (await native?.getData(key)) ?? null;
	return json === null ? null : (JSON.parse(json) as T);
}

/** Delete the value stored under `key`. */
export async function removeWidgetData(key: string): Promise<void> {
	assertKey(key);
	await native?.removeData(key);
}

/** Redraw every placed widget of this app. Returns how many were asked to redraw. */
export async function reloadAllWidgets(): Promise<number> {
	return (await native?.reloadAll()) ?? 0;
}

/**
 * Redraw the placed widgets of one provider, named by its class: the simple
 * name (`"WeatherWidget"`), the name relative to the app package
 * (`".widgets.WeatherWidget"`) or the full name. Returns how many were asked
 * to redraw.
 */
export async function reloadWidgets(provider: string): Promise<number> {
	return (await native?.reload(provider)) ?? 0;
}
