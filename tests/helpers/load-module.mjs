import {registerHooks} from 'node:module';
import {randomUUID} from 'node:crypto';

const dist = new URL('../../dist/', import.meta.url).href;

// Give each test fresh module state without changing the source being tested.
// Optional replacements are limited to the dependencies named by the caller.
export async function loadModule(file, replacements = {}) {
  const key = randomUUID();
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier.startsWith('.') || specifier.startsWith('file:')) {
        const candidate = new URL(specifier, context.parentURL || dist);
        const name = candidate.href.split('?')[0].slice(dist.length);
        if (candidate.href.startsWith(dist) && Object.hasOwn(replacements, name)) {
          candidate.searchParams.set('test', key);
          return {url:candidate.href, format:'module', shortCircuit:true};
        }
      }
      const result = next(specifier, context);
      if (result.url.startsWith(dist)) {
        const url = new URL(result.url);
        url.searchParams.set('test', key);
        return {...result, url:url.href};
      }
      return result;
    },
    load(url, context, next) {
      const name = url.split('?')[0].slice(dist.length);
      if (url.startsWith(dist) && Object.hasOwn(replacements, name)) {
        return {format:'module', shortCircuit:true, source:replacements[name]};
      }
      return next(url, context);
    }
  });
  try { return await import(new URL(file, dist)); }
  finally { hooks.deregister(); }
}
