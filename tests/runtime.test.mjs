import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('evidence/runtime-integrity.json', root), 'utf8'));

test('bundled runtime files match their recorded sizes and hashes', async () => {
  assert.ok(manifest.length > 0);
  assert.equal(new Set(manifest.map(entry => entry.file)).size, manifest.length);
  for (const entry of manifest) {
    const bytes = await readFile(new URL(entry.file, root));
    assert.equal(bytes.length, entry.bytes, entry.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
  }
});
for (const name of ['vision_wasm_internal', 'vision_wasm_module_internal', 'vision_wasm_nosimd_internal']) {
  test(`${name}: valid WASM binary`, async () => {
    const bytes = await readFile(new URL(`dist/vendor/wasm/${name}.wasm`, root));
    assert.equal(WebAssembly.validate(bytes), true);
  });
}
