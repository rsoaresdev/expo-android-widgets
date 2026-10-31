import { beforeEach, describe, expect, it, vi } from "vitest";

const platform = { OS: "android" };
const native = {
	setData: vi.fn(async (_key: string, _json: string) => {}),
	getData: vi.fn(async (_key: string): Promise<string | null> => null),
	removeData: vi.fn(async (_key: string) => {}),
	reloadAll: vi.fn(async () => 3),
	reload: vi.fn(async (_provider: string) => 1),
};
let installed = true;

vi.mock("react-native", () => ({ Platform: platform }));
vi.mock("expo", () => ({
	requireOptionalNativeModule: () => (installed ? native : null),
}));

async function load() {
	vi.resetModules();
	return import("../src/index.js");
}

beforeEach(() => {
	platform.OS = "android";
	installed = true;
	for (const fn of Object.values(native)) fn.mockClear();
});

describe("on Android", () => {
	it("stores data as JSON and reads it back", async () => {
		const widgets = await load();
		await widgets.setWidgetData("summary", { title: "Fuel", value: "62,40 €" });
		expect(native.setData).toHaveBeenCalledWith(
			"summary",
			'{"title":"Fuel","value":"62,40 €"}',
		);
		native.getData.mockResolvedValueOnce('{"value":1}');
		expect(await widgets.getWidgetData("summary")).toEqual({ value: 1 });
		native.getData.mockResolvedValueOnce(null);
		expect(await widgets.getWidgetData("summary")).toBeNull();
	});

	it("removes data", async () => {
		const widgets = await load();
		await widgets.removeWidgetData("summary");
		expect(native.removeData).toHaveBeenCalledWith("summary");
	});

	it("asks for a redraw and reports how many widgets", async () => {
		const widgets = await load();
		expect(await widgets.reloadAllWidgets()).toBe(3);
		expect(await widgets.reloadWidgets("SummaryWidget")).toBe(1);
		expect(native.reload).toHaveBeenCalledWith("SummaryWidget");
	});

	it.each(["", "../secrets", "a/b", "x".repeat(65), "with space"])(
		"rejects the key %j before it reaches the device",
		async (key) => {
			const widgets = await load();
			await expect(widgets.setWidgetData(key, 1)).rejects.toThrow(TypeError);
			await expect(widgets.getWidgetData(key)).rejects.toThrow(TypeError);
			await expect(widgets.removeWidgetData(key)).rejects.toThrow(TypeError);
			expect(native.setData).not.toHaveBeenCalled();
		},
	);

	it("rejects a value JSON cannot hold", async () => {
		const widgets = await load();
		await expect(widgets.setWidgetData("summary", undefined)).rejects.toThrow(
			TypeError,
		);
	});
});

describe("anywhere else", () => {
	it("does nothing on iOS", async () => {
		platform.OS = "ios";
		const widgets = await load();
		expect(widgets.isAvailable).toBe(false);
		await widgets.setWidgetData("summary", { value: 1 });
		expect(await widgets.reloadAllWidgets()).toBe(0);
		expect(await widgets.getWidgetData("summary")).toBeNull();
		expect(native.setData).not.toHaveBeenCalled();
	});

	it("does nothing in a build without the native module", async () => {
		installed = false;
		const widgets = await load();
		expect(widgets.isAvailable).toBe(false);
		expect(await widgets.reloadWidgets("SummaryWidget")).toBe(0);
	});
});
