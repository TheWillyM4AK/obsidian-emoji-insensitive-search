import { describe, expect, it, vi } from "vitest";
import { patchMethod, type PatchedMethod } from "../src/patch";

describe("patchMethod", () => {
  it("keeps this and the arguments, and restores the method when disposed", () => {
    const target = {
      offset: 4,
      sum(left: number, right: number) { return this.offset + left + right; },
    };
    const original = target.sum;
    const patch = patchMethod<typeof target, [number, number], number>(
      target, "sum", (method, receiver, args) => method.apply(receiver, args) * 2,
    );
    expect(patch.isCurrent()).toBe(true);
    expect(target.sum(1, 2)).toBe(14);
    patch.dispose();
    expect(target.sum).toBe(original);
    expect(target.sum(1, 2)).toBe(7);
    expect(patch.isCurrent()).toBe(false);
    patch.dispose();
    expect(target.sum).toBe(original);
  });

  it("restores the complete original descriptor", () => {
    const target = {};
    const original = () => "original";
    const descriptor = { value: original, enumerable: true, writable: false, configurable: true };
    Object.defineProperty(target, "read", descriptor);
    const patch = patchMethod(target, "read", () => "patched");
    patch.dispose();
    expect(Object.getOwnPropertyDescriptor(target, "read")).toEqual(descriptor);
  });

  it("removes its own wrapper to restore an inherited method", () => {
    const prototype = { value() { return 7; } };
    const target = Object.create(prototype) as typeof prototype;
    const patch = patchMethod(target, "value", () => 8);
    expect(Object.hasOwn(target, "value")).toBe(true);
    expect(target.value()).toBe(8);
    patch.dispose();
    expect(Object.hasOwn(target, "value")).toBe(false);
    expect(target.value()).toBe(7);
  });

  it("delegates after disposal even if another plugin keeps and wraps the wrapper", () => {
    const target = { value(input: number) { return input * 2; } };
    const handler = vi.fn((
      method: PatchedMethod<typeof target, [number], number>,
      receiver: typeof target,
      args: [number],
    ) => method.apply(receiver, args) + 10);
    const patch = patchMethod(target, "value", handler);
    const preserved = target.value;
    const otherPlugin = (input: number) => preserved.call(target, input) + 100;
    target.value = otherPlugin;
    expect(patch.isCurrent()).toBe(false);
    expect(target.value(3)).toBe(116);
    expect(handler).toHaveBeenCalledTimes(1);
    patch.dispose();
    expect(target.value).toBe(otherPlugin);
    expect(target.value(3)).toBe(106);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("rejects missing methods and values that are not functions", () => {
    expect(() => patchMethod({}, "missing", () => null)).toThrow("Incompatible method: missing");
    expect(() => patchMethod({ value: 42 }, "value", () => null)).toThrow("Incompatible method: value");
  });

  it("keeps exceptions thrown by the original method", () => {
    const failure = new Error("original failure");
    const target = { fail() { throw failure; } };
    const patch = patchMethod(target, "fail", (original, receiver, args) => original.apply(receiver, args));
    expect(() => target.fail()).toThrow(failure);
    patch.dispose();
    expect(() => target.fail()).toThrow(failure);
  });

  it("keeps async methods and delegates after disposal", async () => {
    const target = { value(input: number) { return Promise.resolve(input * 2); } };
    const original = target.value;
    const patch = patchMethod<typeof target, [number], Promise<number>>(
      target, "value", async (method, receiver, args) => (await method.apply(receiver, args)) + 10,
    );
    const preserved = target.value;
    await expect(target.value(3)).resolves.toBe(16);
    patch.dispose();
    expect(target.value).toBe(original);
    await expect(preserved.call(target, 3)).resolves.toBe(6);
  });
});
