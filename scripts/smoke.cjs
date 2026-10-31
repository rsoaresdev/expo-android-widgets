// Loads the config plugin the way Expo CLI does, on the oldest Node in `engines`.
const assert = require("node:assert/strict");

const plugin = require("expo-android-widgets/app.plugin.js");
assert.equal(typeof plugin, "function");
console.log("app.plugin.js: ok");
