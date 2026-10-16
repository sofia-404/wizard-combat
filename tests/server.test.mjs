import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, mkdir, copyFile, readFile, readdir, rm, rename, symlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomInt, randomUUID} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {request} from 'node:http';

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
  const temporary = fileURLToPath(new URL('../.tmp/', import.meta.url));
  await mkdir(temporary, {recursive:true});
  const folder = await mkdtemp(path.join(temporary, 'server-test-'));
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
  const legacyEvents = [0, 1].map(swap => ({...event, id:randomUUID(), swap}));
  for(const legacy of legacyEvents)assert.equal((await post('api/events', legacy)).status, 201);
  for(const swap of [2, '1', null, {}])assert.equal((await post('api/events', {...event, swap})).status, 400);
  assert.equal((await post('api/events', {...event, reason: 'x'.repeat(201)})).status, 400);
  assert.equal((await post('api/events', {...event, reason: 'x'.repeat(5000)})).status, 413);
  const practiceArena = {id: randomUUID(), type: 'practiceArena', source: 'practiceArena', cause: 'hit', activeTab: 'practiceArena',
    previousTab: 'spellTraining', castId: event.id, castToHitMs: 131, playerHealth: 200,
    dummyHealth: 170, previousDummyHealth: 200, maxHealth: 200, damage: 30, hits: 1};
  assert.equal((await post('api/events', practiceArena)).status, 201);
  assert.equal((await post('api/events', {...practiceArena, unexpected: 'value'})).status, 400);
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
  const shield = {id: randomUUID(), type: 'practiceArena', cause: 'shield', shape: 'Protego',
    castId: protego.id, damage: 0, duration: 3000, playerHealth: 200, dummyHealth: 200, hits: 0};
  assert.equal((await post('api/events', shield)).status, 201);
  const records = (await readFile(path.join(folder, 'play-data/events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(records, [event, ...legacyEvents.map(({swap, ...record}) => record), practiceArena, confringo, basiccast, legacyV, protego, shield]);
  const bytes = png(720, 440), card = {id: event.id, png: 'data:image/png;base64,' + bytes.toString('base64')};
  assert.equal((await post('api/results', card)).status, 201);
  assert.deepEqual(await readFile(path.join(folder, 'play-data/results', event.id + '.png')), bytes);
  assert.equal((await post('api/results', card)).status, 201);
  assert.equal((await post('api/results', {...card, id: '../invalid'})).status, 400);
  assert.equal((await post('api/results', {id: randomUUID(), png: 'data:image/png;base64,' + png(1, 1).toString('base64')})).status, 400);
  assert.deepEqual(await readdir(path.join(folder, 'play-data/results')), [event.id + '.png']);

  const logPath = path.join(folder, 'play-data/events.jsonl');
  await t.test('missing or mismatched local headers cannot write events or images', async () => {
    // fetch normalizes Host. Use HTTP directly to send the header under test.
    const rawPost = (endpoint, data, headers) => new Promise((resolve, reject) => {
      const req = request(new URL(endpoint, base), {method:'POST',
        headers:{'Content-Type':'application/json', ...headers}}, response => {
        response.resume();
        response.on('end', () => resolve(response.statusCode));
        response.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(3000, () => req.destroy(Error('Request timed out')));
      req.end(JSON.stringify(data));
    });
    const before = await readFile(logPath, 'utf8');
    for (const [endpoint, data] of [['api/events', event], ['api/results', {...card, id:randomUUID()}]]) {
      for (const headers of [
        {}, {Origin:origin, Host:'invalid.example'},
        {Origin:'null'}, {Origin:origin.replace('127.0.0.1', 'localhost')}
      ]) {
        assert.equal(await rawPost(endpoint, data, headers), 403, `${endpoint}: ${JSON.stringify(headers)}`);
      }
    }
    assert.equal(await readFile(logPath, 'utf8'), before);
    assert.deepEqual(await readdir(path.join(folder, 'play-data/results')), [event.id + '.png']);
  });

  await t.test('malformed request bodies cannot append a record or stop later requests', async () => {
    const before = await readFile(logPath, 'utf8');
    for (const body of ['{', 'null', '[]', '"cast"', '{"type":"cast","shape":{}}', '{"type":"cast","score":null}']) {
      const response = await fetch(base + 'api/events', {method:'POST',
        headers:{'Content-Type':'application/json', Origin:origin}, body, signal:AbortSignal.timeout(3000)});
      assert.ok(response.status >= 400 && response.status < 500, `${body}: ${response.status}`);
    }
    assert.equal(await readFile(logPath, 'utf8'), before);
    const next = {...event, id:randomUUID()};
    assert.equal((await post('api/events', next)).status, 201);
    assert.equal(await readFile(logPath, 'utf8'), before + JSON.stringify(next) + '\n');
  });

  await t.test('encoded traversal and a symlink cannot serve files outside dist', async () => {
    await symlink('../server.mjs', path.join(folder, 'dist/server-link.mjs'));
    for (const requestPath of ['..%2fserver.mjs', 'server-link.mjs']) {
      const response = await fetch(base + requestPath, {signal:AbortSignal.timeout(3000)});
      assert.equal(response.status, 403, requestPath);
      assert.doesNotMatch(await response.text(), /http\.createServer/);
    }
    assert.equal((await fetch(base)).status, 200, 'rejected paths do not stop the server');
  });

  await t.test('concurrent writes save each complete event once', async () => {
    const before = await readFile(logPath, 'utf8');
    const batch = Array.from({length:12}, () => ({...event, id:randomUUID()}));
    const responses = await Promise.all(batch.map(item => post('api/events', item)));
    assert.ok(responses.every(response => response.status === 201));
    const after = await readFile(logPath, 'utf8');
    assert.ok(after.startsWith(before));
    const saved = after.slice(before.length).trim().split('\n').map(JSON.parse);
    const byId = (a, b) => a.id.localeCompare(b.id);
    assert.deepEqual(saved.sort(byId), batch.sort(byId));
  });

  await t.test('a disk write failure does not permanently block the server write queue', async () => {
    const before = await readFile(logPath, 'utf8');
    const backup = path.join(folder, 'play-data/saved-events.jsonl');
    await rename(logPath, backup);
    await mkdir(logPath); // A directory gives a reliable write failure, even with elevated permissions.
    try {
      const response = await post('api/events', {...event, id:randomUUID()});
      assert.ok(response.status >= 400, 'a failed write must not be acknowledged as saved');
    } finally {
      await rm(logPath, {recursive:true});
      await rename(backup, logPath);
    }
    const next = {...event, id:randomUUID()};
    assert.equal((await post('api/events', next)).status, 201);
    assert.equal(await readFile(logPath, 'utf8'), before + JSON.stringify(next) + '\n');
  });
});
