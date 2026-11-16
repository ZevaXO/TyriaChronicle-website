import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { validateCatalog, occurrences, filteredRows, unscheduledEvents, completionKey, normaliseState, loadState, saveState, resetDaily, dayStart, fishingAt, shareMessage, countdown, STORAGE_KEY } from '../timer-core.mjs';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const data = validateCatalog(read('../timer-data/catalog.json'));
const fixture = read('../timer-data/parity-fixtures.json');

test('public export contains data only and no addon-only templates', () => {
  assert.equal(data.events.length, 88); assert.equal('templates' in data, false);
  const ids = new Set(data.events.map(e => e.id)); assert.equal(ids.size, data.events.length);
  for (const e of data.events) assert.ok(!Object.keys(e).some(k => /token|account|password|userPath/i.test(k)));
  assert.ok(statSync(new URL('../timer-data/catalog.json', import.meta.url)).size < 150_000);
});
for (const f of fixture.occurrences) test(`UTC occurrence parity with C++ at ${f.now}`, () => {
  assert.deepEqual(occurrences(data.events, f.now, 120).map(r => [r.event.id, r.start, r.end]), f.rows);
});
for (const f of fixture.fishing) test(`C++ fishing parity region=${f.region} at ${f.now}`, () => {
  const { phase, next, nextAt } = fishingAt(f.now, f.region);
  assert.deepEqual({ phase, next, nextAt }, { phase: f.phase, next: f.next, nextAt: f.nextAt });
});
test('next up has one future start per event; all and now are distinct', () => {
  const now = 1794787200;
  const next = filteredRows(data.events, now, { horizon: 1440 }, {});
  assert.equal(new Set(next.map(r => r.event.id)).size, next.length); assert.ok(next.every(r => r.start >= now));
  const active = filteredRows(data.events, now, { view: 'now', horizon: 1440 }, {});
  assert.ok(active.length); assert.ok(active.every(r => r.start <= now && r.end > now));
  assert.ok(filteredRows(data.events, now, { view: 'all', horizon: 1440 }, {}).length > next.length);
});
test('reward filter and reward search select verified choices only', () => {
  const now = 1794787200, choose = f => new Set(filteredRows(data.events, now, { horizon: 1440, ...f }, {}).map(r => r.event.id));
  assert.deepEqual(choose({ gemstone: true }), choose({ query: 'AMALGAMATED GEMSTONE' }));
  assert.ok(choose({ gemstone: true }).size > 10);
  assert.equal([...choose({ gemstone: true })].some(id => id.endsWith('|Aspenwood') || id.includes('Janthir Syntri')), false);
});
test('favourite/category/expansion/hide-done filters compose without changing completion', () => {
  const e = data.events.find(e => e.id.endsWith('|Battle in Tarir')), now = 1794787200;
  const state = { favourites: [e.id], done: [e.id] };
  assert.equal(filteredRows(data.events, now, { horizon: 1440, favourites: true, hideDone: true }, state).length, 0);
  assert.equal(filteredRows(data.events, now, { horizon: 1440, favourites: true, category: 'World Bosses' }, state).length, 0);
  assert.equal(filteredRows(data.events, now, { horizon: 1440, favourites: true, expansion: 'End of Dragons' }, state).length, 0);
  assert.equal(filteredRows(data.events, now, { horizon: 1440, favourites: true }, state).length, 1);
  assert.deepEqual(state.done, [e.id]);
});
test('Ley-Line locations share completion and reset only forward at UTC midnight', () => {
  const anomaly = data.events.filter(e => e.id.startsWith('Base Game|Ley-Line Anomaly|'));
  assert.equal(new Set(anomaly.map(e => completionKey(e.id))).size, 1);
  const now = 1794787199, state = normaliseState({ day: dayStart(now), done: [completionKey(anomaly[0].id)] }, data.events, now);
  assert.equal(resetDaily(state, now - 86400), false);
  assert.equal(resetDaily(state, now + 1), true); assert.deepEqual(state.done, []);
});
test('expired seasonal events and unverified schedules are never fabricated', () => {
  const rows = filteredRows(data.events, Date.UTC(2027, 4, 1) / 1000, { horizon: 1440 }, {});
  assert.ok(rows.every(r => !r.event.festival));
  assert.ok(rows.every(r => !r.event.name.includes('Shackles')));
  assert.ok(unscheduledEvents(data.events, { query: 'Shackles' }, {}).length);
  assert.equal(unscheduledEvents(data.events, { query: 'Shackles', gemstone: true }, {}).length, 0);
});
test('chat sharing omits local hour and falls back to map when waypoint is absent', () => {
  const e = { name: 'Test boss', waypoint: '[&TEST=]', zone: 'Test map' };
  assert.equal(shareMessage(e, 3600 * 17 + 45 * 60), 'xx:45 Test boss @ [&TEST=]');
  assert.equal(shareMessage({ ...e, waypoint: '' }, -1), 'xx:59 Test boss @ Test map');
  assert.equal(countdown(100, 99), 'in 1s'); assert.equal(countdown(100, 100), 'Scheduled now*');
});
test('storage failures and bad data use a safe in-memory state', () => {
  const now = 1794787200;
  assert.equal(loadState(null, data.events, now).available, false);
  assert.equal(saveState(null, {}), false);
  assert.equal(loadState({ getItem: () => '{broken' }, data.events, now).available, false);
  const s = normaliseState({ lists: [{ name: 'Addon only' }], favourites: [data.events[0].id, 'invented', data.events[0].id], done: ['invented'] }, data.events, now);
  assert.equal('lists' in s, false); assert.deepEqual(s.favourites, [data.events[0].id]); assert.deepEqual(s.done, []);
  assert.match(STORAGE_KEY, /^tyria-chronicle\.web-timer\./);
  let saved; assert.equal(saveState({ setItem: (k, v) => { saved = [k, v]; } }, s), true);
  assert.deepEqual(loadState({ getItem: () => saved[1] }, data.events, now).state, s);
});
