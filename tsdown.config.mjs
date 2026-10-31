// @ts-check
import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	outDir: "build",
	format: ["esm", "cjs"],
	dts: true,
	sourcemap: true,
	clean: true,
	target: "es2022",
	platform: "neutral",
	external: ["expo", "react-native"],
});
