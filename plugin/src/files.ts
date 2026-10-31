import fs from "node:fs";
import path from "node:path";

import type { ResolvedOptions } from "./options.js";

/** The record of what the last run wrote, so a run can remove it first. */
export const LEDGER = ".expo-android-widgets.json";

const TEXT = /\.(kt|java|xml|json|txt|properties)$/i;

interface Ledger {
	files: string[];
}

function readLedger(platformRoot: string): Ledger {
	try {
		const parsed = JSON.parse(
			fs.readFileSync(path.join(platformRoot, LEDGER), "utf8"),
		) as Partial<Ledger>;
		return { files: Array.isArray(parsed.files) ? parsed.files : [] };
	} catch {
		return { files: [] };
	}
}

function listFiles(dir: string): string[] {
	return fs
		.readdirSync(dir, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile() && !entry.name.startsWith("."))
		.map((entry) => path.join(entry.parentPath, entry.name));
}

/**
 * Copies the widget sources into the Android project.
 *
 * Kotlin files go in `app/src/main/java/<package>/<subpackage>/`, resources
 * merge into `app/src/main/res/`. `__PACKAGE__` in a text file becomes the app
 * package and `__WIDGETS_PACKAGE__` the widgets package. Whatever the last run
 * wrote is removed first, so a deleted widget does not linger in the build.
 * Returns the written paths, relative to the Android project.
 */
export function writeWidgetFiles(
	platformRoot: string,
	packageName: string,
	options: ResolvedOptions,
): string[] {
	const main = path.join(platformRoot, "app", "src", "main");
	const widgetsPackage = `${packageName}.${options.subpackage}`;
	const fill = (text: string) =>
		text
			.replaceAll("__WIDGETS_PACKAGE__", widgetsPackage)
			.replaceAll("__PACKAGE__", packageName);

	for (const file of readLedger(platformRoot).files) {
		const absolute = path.resolve(platformRoot, file);
		// Only ever delete inside the Android project.
		if (absolute.startsWith(path.resolve(platformRoot) + path.sep))
			fs.rmSync(absolute, { force: true });
	}

	const plan: Array<{ source: string; target: string; from: string }> = [];
	const add = (from: string, toDir: string) => {
		for (const source of listFiles(from))
			plan.push({
				source,
				from,
				target: path.join(toDir, path.relative(from, source)),
			});
	};
	if (options.kotlinDir)
		add(
			options.kotlinDir,
			path.join(main, "java", ...widgetsPackage.split(".")),
		);
	if (options.resDir) add(options.resDir, path.join(main, "res"));

	// Checked before anything is written. A file still there after the cleanup
	// belongs to the app or another plugin, and overwriting it would break the
	// build in ways that are hard to trace.
	for (const { source, target, from } of plan) {
		if (fs.existsSync(target))
			throw new Error(
				`expo-android-widgets: ${path.relative(platformRoot, target)} already exists. Rename ${path.relative(from, source)} in your widget sources, for example with a widget_ prefix.`,
			);
	}

	const written: string[] = [];
	for (const { source, target } of plan) {
		fs.mkdirSync(path.dirname(target), { recursive: true });
		if (TEXT.test(source)) {
			fs.writeFileSync(target, fill(fs.readFileSync(source, "utf8")));
		} else {
			fs.copyFileSync(source, target);
		}
		written.push(path.relative(platformRoot, target).split(path.sep).join("/"));
	}

	fs.writeFileSync(
		path.join(platformRoot, LEDGER),
		`${JSON.stringify({ files: written.sort() }, null, 2)}\n`,
	);
	return written;
}
