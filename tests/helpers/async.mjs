export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}

export const settle = () => new Promise(resolve => setImmediate(resolve));

export function replaceGlobal(t, name, value) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {value, configurable:true, writable:true});
  t.after(() => {
    if (saved) Object.defineProperty(globalThis, name, saved);
    else delete globalThis[name];
  });
}
