# Changelog

All notable changes to this package are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow [Semantic Versioning](https://semver.org/).

## [1.0.1] - 2026-11-02

### Changed

- The README is rewritten around examples, with recipes for keeping a widget in sync, clearing it on sign-out and redrawing one widget.
- The example widget hides its empty value line, so the empty-state text is centred.

## [1.0.0] - 2026-10-30

### Added

- Config plugin that copies Kotlin widget providers and resources into the Android project and declares them in the manifest, on every prebuild.
- `setWidgetData`, `getWidgetData`, `removeWidgetData`, `reloadAllWidgets` and `reloadWidgets`, asynchronous so the native work stays off the JavaScript thread.
- Validation of widget labels and broadcast actions in the plugin options.
- ESM and CommonJS builds, and types for `app.plugin.js`.
- `npm run e2e:android`, which builds the example widget in a new Expo app.
- `WidgetData.read` for widget providers.
- An example widget in `example/widgets/android`.
