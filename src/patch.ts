export type PatchedMethod<Receiver, Args extends unknown[], Result> = (
  this: Receiver,
  ...args: Args
) => Result;

export interface MethodPatch {
  dispose(): void;
  isCurrent(): boolean;
}

/** A disposed wrapper always delegates, even if another plugin kept a reference to it. */
export function patchMethod<Receiver = unknown, Args extends unknown[] = unknown[], Result = unknown>(
  target: object,
  key: string,
  handler: (original: PatchedMethod<Receiver, Args, Result>, receiver: Receiver, args: Args) => Result
): MethodPatch {
  const record = target as Record<string, unknown>;
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  const candidate = record[key];
  if (typeof candidate !== 'function') throw new Error(`Incompatible method: ${key}`);
  // The caller provides the private signature after checking that the method is callable.
  const original = candidate as PatchedMethod<Receiver, Args, Result>;
  let active = true;
  const wrapper: PatchedMethod<Receiver, Args, Result> = function (this: Receiver, ...args: Args) {
    return active ? handler(original, this, args) : original.apply(this, args);
  };
  Object.defineProperty(target, key, {
    value: wrapper,
    writable: true,
    configurable: true,
    enumerable: descriptor?.enumerable ?? false
  });
  return {
    isCurrent: () => active && record[key] === wrapper,
    dispose() {
      if (!active) return;
      active = false;
      if (record[key] !== wrapper) return;
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else delete record[key];
    }
  };
}
