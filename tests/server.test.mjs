import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, mkdir, copyFile, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomInt, randomUUID} from 'node:crypto';
import {deflateSync} from 'node:zlib';

function png(width, height) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const size = Buffer.alloc(4), checksum = Buffer.alloc(4);
    size.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, body, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.alloc((width + 1) * height))), chunk('IEND', Buffer.alloc(0))
  ]);
}

test('local server serves files and validates stored events and result cards', {timeout: 20000}, async t => {
  const folder = await mkdtemp(path.join(tmpdir(), 'wizard-combat-test-'));
  let child;
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit'); child.kill(); await exited;
    }
    await rm(folder, {recursive: true, force: true});
  });
  await mkdir(path.join(folder, 'dist'));
  await copyFile(new URL('../server.mjs', import.meta.url), path.join(folder, 'server.mjs'));
  await copyFile(new URL('../dist/index.html', import.meta.url), path.join(folder, 'dist/index.html'));
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: folder, env: {...process.env, PORT: String(randomInt(20000, 60000))}, stdio: ['ignore', 'pipe', 'pipe']
  });
  const base = await new Promise((resolve, reject) => {
    let output = '', errors = '';
    const timer = setTimeout(() => reject(Error('Server start timed out: ' + errors)), 10000);
    child.stderr.on('data', data => { errors += data; });
    child.stdout.on('data', data => {
      output += data;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(Error(`Server exited with ${code}: ${errors}`)); });
  });
  const origin = new URL(base).origin;
  const post = (endpoint, data, requestOrigin = origin) => fetch(base + endpoint, {
    method: 'POST', headers: {'Content-Type': 'application/json', Origin: requestOrigin},
    body: JSON.stringify(data), signal: AbortSignal.timeout(3000)
  });
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /^text\/html/);
  assert.match(await page.text(), /<title>Wizard Combat<\/title>/);
  assert.equal((await fetch(base + 'api/events')).status, 405);
  assert.equal((await fetch(base + 'server.mjs')).status, 404);
  const event = {id: randomUUID(), type: 'cast', shape: 'Expelliarmus', score: 90, version: 3, difficulty: 'hard',
    expelliarmusDistance: 0.01, expelliarmusGate: 'ok', expelliarmusLimit: 0.045,
    expelliarmusBend: 0.02, expelliarmusEfficiency: 0.95, lessonState: 'active', lessonCount: 1};
  assert.equal((await post('api/events', event)).status, 201);
  assert.equal((await post('api/events', event, 'http://invalid.example')).status, 403);
  assert.equal((await post('api/events', {...event, unexpected: 'value'})).status, 400);
  assert.equal((await post('api/events', {...event, reason: 'x'.repeat(201)})).status, 400);
  assert.equal((await post('api/events', {...event, reason: 'x'.repeat(5000)})).status, 413);
  const fight = {id: randomUUID(), type: 'fight', source: 'fight', cause: 'hit', activeTab: 'fight',
    previousTab: 'legacy-practice', castId: event.id, castToHitMs: 131, playerHealth: 200,
    dummyHealth: 170, previousDummyHealth: 200, maxHealth: 200, damage: 30, hits: 1};
  assert.equal((await post('api/events', fight)).status, 201);
  assert.equal((await post('api/events', {...fight, unexpected: 'value'})).status, 400);
  const confringo = {id: randomUUID(), type: 'cast', shape: 'Confringo', expected: 'Confringo', score: 90, difficulty: 'normal',
    matchCandidates: 'Confringo', confringoDistance: .01, confringoGate: 'ok', confringoLimit: .045,
    confringoBend: .02, confringoEfficiency: .95, confringoOrientation: 'normal', confringoTrim: 0};
  assert.equal((await post('api/events', confringo)).status, 201);
  const basiccast = {id: randomUUID(), type: 'cast', shape: 'Basic Cast', expected: 'Basic Cast', score: 90, difficulty: 'easy',
    matchCandidates: 'Basic Cast', basiccastDistance: .01, basiccastGate: 'ok', basiccastLimit: .065,
    basiccastBend: .02, basiccastEfficiency: .95, basiccastCornerTurn: 125};
  assert.equal((await post('api/events', basiccast)).status, 201);
  const legacyV = {id: randomUUID(), type: 'cast', shape: 'V', vDistance: .01, vGate: 'ok', vCornerTurn: 125};
  assert.equal((await post('api/events', legacyV)).status, 201);
  const protego = {id: randomUUID(), type: 'cast', shape: 'Protego', expected: 'Protego', score: 90,
    matchCandidates: 'Protego', protegoDistance: .01, protegoGate: 'ok'};
  assert.equal((await post('api/events', protego)).status, 201);
  const shield = {id: randomUUID(), type: 'fight', cause: 'shield', shape: 'Protego',
    castId: protego.id, damage: 0, duration: 3000, playerHealth: 200, dummyHealth: 200, hits: 0};
  assert.equal((await post('api/events', shield)).status, 201);
  const records = (await readFile(path.join(folder, 'play-data/events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(records, [event, fight, confringo, basiccast, legacyV, protego, shield]);
  const bytes = png(720, 440), card = {id: event.id, png: 'data:image/png;base64,' + bytes.toString('base64')};
  assert.equal((await post('api/results', card)).status, 201);
  assert.deepEqual(await readFile(path.join(folder, 'play-data/results', event.id + '.png')), bytes);
  assert.equal((await post('api/results', card)).status, 201);
  assert.equal((await post('api/results', {...card, id: '../invalid'})).status, 400);
  assert.equal((await post('api/results', {id: randomUUID(), png: 'data:image/png;base64,' + png(1, 1).toString('base64')})).status, 400);
  assert.deepEqual(await readdir(path.join(folder, 'play-data/results')), [event.id + '.png']);
});
