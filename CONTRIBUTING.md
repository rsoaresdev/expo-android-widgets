# Contributing

Thank you for helping. Issues and pull requests are welcome.

## Reporting a problem

Include your Expo SDK version, the plugin options from your app config, and the output of `npx expo prebuild --platform android` or the Gradle error.

## Development

Development needs Node 22.18 or later (the build and test tools require it). The published package runs on Node 20 and later, which CI checks with `npm run smoke`.

```bash
npm install
npm run coverage
npm run lint
npm run typecheck
npm run build && npm run check:package
```

The plugin logic lives in `plugin/src` and is tested without Expo in `test/`. The native module is in `android/src`.

`npm run e2e:android` packs the package, installs it in a new Expo app with the example widget, runs prebuild twice and builds a debug APK. It needs Java 17 and the Android SDK, takes several minutes, and runs in CI on every pull request.
