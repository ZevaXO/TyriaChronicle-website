import { categories, completionKey, validateCatalog, filteredRows, unscheduledEvents, shareMessage, clockText, countdown, fishingAt, phases, loadState, saveState, resetDaily } from './timer-core.mjs';

const $ = id => document.getElementById(id);
const categorySymbols = { 'World Bosses': 'boss', 'Meta Events': 'meta', Convergences: 'rift', 'Public Instances': 'arch', 'Timed Events': 'timed', Festivals: 'festival' };
const paths = {
  waypoint: ['M10 2 18 10 10 18 2 10Z', 'M10 5 15 10 10 15 5 10Z'],
  message: ['M4 3H13V15H4Z', 'M8 6H17V18H8Z', 'M10 9H15M10 12H15M10 15H13'],
  star: ['M10 2 12.4 7.1 18 7.9 14 11.8 15 17.5 10 14.8 5 17.5 6 11.8 2 7.9 7.6 7.1Z'],
  gem: ['M3 4H17L20 9 10 19 0 9Z', 'M0 9H20M7 4 5 9 10 19 15 9 13 4'],
  fish: ['M2 10Q8 1 15 10Q8 19 2 10ZM15 10 19 5V15ZM6 9V10']
};
function icon(name, filled = false) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 20 20'); svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', filled ? 'currentColor' : 'none'); svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.25'); svg.setAttribute('stroke-linejoin', 'round');
  for (const [index, d] of paths[name].entries()) {
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', d);
    if (name === 'waypoint') { path.setAttribute('fill', index ? '#6db9c8' : '#e4c88d'); path.setAttribute('stroke', 'none'); }
    if (name === 'message' && index < 2) path.setAttribute('fill', '#283026');
    svg.append(path);
  }
  return svg;
}
function el(tag, className, text) {
  const node = document.createElement(tag); if (className) node.className = className;
  if (text !== undefined) node.textContent = text; return node;
}
function button(text, action, eventId, className = '') {
  const node = el('button', className, text); node.type = 'button';
  if (action) node.dataset.action = action; if (eventId) node.dataset.eventId = eventId; return node;
}
function iconButton(symbol, label, action, eventId, pressed) {
  const node = button(undefined, action, eventId, 'icon-button'); node.append(icon(symbol, symbol === 'star' && pressed));
  node.title = label; node.setAttribute('aria-label', label);
  if (pressed !== undefined) node.setAttribute('aria-pressed', String(pressed)); return node;
}

let data, state, storage, storageAvailable = true, scope = 'all', category = '', activeEvent = null, toastTimer;
let rowSignature = '', lastMinute = -1;
const filters = { query: '', horizon: 120, view: 'next', expansion: '', gemstone: false, hideDone: false };
const epoch = () => Math.floor(Date.now() / 1000);
function persist() {
  if (!saveState(storage, state)) storageAvailable = false;
  $('storage-warning').hidden = storageAvailable;
}
function status(text) {
  clearTimeout(toastTimer); $('copy-status').textContent = text; $('copy-status').hidden = false;
  toastTimer = setTimeout(() => { $('copy-status').hidden = true; }, 3500);
}
async function copy(text, label) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text); status(`${label} copied`);
  } catch {
    $('manual-copy').value = text;
    if (!$('copy-dialog').open) $('copy-dialog').showModal();
    $('manual-copy').focus(); $('manual-copy').select();
  }
}
function toggleValue(key, id) {
  const values = new Set(state[key]); if (values.has(id)) values.delete(id); else values.add(id);
  state[key] = [...values]; persist(); refresh(true);
  if ($('event-dialog').open && activeEvent?.event.id === id) showEvent(activeEvent, false);
}
function syncNavigation() {
  document.querySelectorAll('[data-scope]').forEach(b => b.setAttribute('aria-pressed', String(scope === b.dataset.scope && !category)));
  document.querySelectorAll('[data-category]').forEach(b => b.setAttribute('aria-pressed', String(category === b.dataset.category)));
  $('favourites-count').textContent = state.favourites.length;
  $('view-title').textContent = category || (scope === 'favourites' ? 'Favourites' : 'All events');
}
function actionButtons(event, row) {
  const group = el('div', 'card-buttons');
  if (event.waypoint) group.append(iconButton('waypoint', `Copy waypoint: ${event.name}`, 'waypoint', event.id));
  if (row) { const b = iconButton('message', `Copy event message: ${event.name}`, 'message', event.id); b.dataset.start = row.start; group.append(b); }
  const done = state.done.includes(completionKey(event.id));
  const b = button(done ? 'Undo done' : 'Done today', 'done', event.id, 'done-button');
  b.setAttribute('aria-pressed', String(done)); b.title = 'Mark done until 00:00 UTC. Ley-Line locations share one checkmark. This does not detect reward claims.';
  group.append(b); return group;
}
function makeCard(row) {
  const event = row.event, done = state.done.includes(completionKey(event.id));
  const card = el('article', `event-card${done ? ' is-done' : ''}${row.start === null ? ' unscheduled-card' : ''}`);
  const top = el('div', 'card-top'), symbol = el('span', `category-symbol ${categorySymbols[event.category]}`);
  symbol.setAttribute('aria-hidden', 'true'); top.append(symbol);
  const titleBlock = el('div'), title = button(event.name, 'details', event.id, 'event-name');
  if (row.start !== null) title.dataset.start = row.start;
  title.setAttribute('aria-label', `Event details: ${event.name}`); titleBlock.append(title);
  const map = el('p', 'card-map', event.zone);
  if (event.gemstone) {
    const badge = el('span', 'gemstone-label'); badge.append(icon('gem'));
    badge.title = `Amalgamated Gemstone — reward choice. ${event.gemstone.note}`;
    badge.setAttribute('role', 'img'); badge.setAttribute('aria-label', badge.title); map.append(badge);
  }
  titleBlock.append(map); top.append(titleBlock);
  const favourite = state.favourites.includes(event.id);
  const star = iconButton('star', `${favourite ? 'Remove favourite' : 'Add favourite'}: ${event.name}`, 'favourite', event.id, favourite);
  star.classList.add('favourite-button'); top.append(star); card.append(top);
  const description = el('p', 'card-description', event.description.split('. ')[0]); description.title = event.description; card.append(description);
  const controls = el('div', 'card-controls');
  if (row.start !== null) {
    const time = el('time', 'event-time', clockText(row.start, state.utc)); time.dateTime = new Date(row.start * 1000).toISOString();
    const remaining = el('span', 'event-countdown', countdown(row.start, epoch())); remaining.dataset.countdown = row.start;
    controls.append(time, remaining);
  } else controls.append(el('span', 'event-countdown', 'Schedule unverified'));
  controls.append(actionButtons(event, row.start === null ? null : row)); card.append(controls);
  return card;
}
function restoreActionFocus(previous) {
  if (!previous) return;
  const candidates = $('events-grid').querySelectorAll('button[data-action]');
  const target = [...candidates].find(b => b.dataset.action === previous.action && b.dataset.eventId === previous.id && (b.dataset.start || '') === previous.start);
  target?.focus({ preventScroll: true });
}
function refresh(force = false) {
  if (!data) return;
  const now = epoch(); if (resetDaily(state, now)) { persist(); force = true; }
  syncNavigation();
  const selected = { ...filters, category, favourites: scope === 'favourites' };
  const rows = filteredRows(data.events, now, selected, state);
  const untimed = filters.view === 'now' ? [] : unscheduledEvents(data.events, selected, state);
  const signature = JSON.stringify([rows.map(r => [r.event.id, r.start]), untimed.map(e => e.id), state.done, state.favourites, state.utc]);
  const total = rows.length + untimed.length;
  $('result-count').textContent = `${rows.length} ${filters.view === 'all' ? 'starts' : filters.view === 'now' ? 'scheduled windows' : 'upcoming'}${untimed.length ? ` · ${untimed.length} unverified` : ''}`;
  $('view-note').textContent = filters.view === 'now' ? '*Estimated active windows — not live map status.' : filters.gemstone ? 'Verified gemstone choices. Shared daily chest limits apply; claims are not detected.' : 'Scheduled times are estimates, not live map status.';
  $('empty-results').hidden = total > 0; $('events-grid').setAttribute('aria-busy', 'false');
  if (force || signature !== rowSignature) {
    const focused = document.activeElement;
    const previous = $('events-grid').contains(focused) ? { action: focused.dataset.action, id: focused.dataset.eventId, start: focused.dataset.start || '' } : null;
    const fragment = document.createDocumentFragment();
    for (const row of rows) fragment.append(makeCard(row));
    for (const event of untimed) fragment.append(makeCard({ event, start: null }));
    $('events-grid').replaceChildren(fragment); rowSignature = signature; restoreActionFocus(previous);
  }
  tickClocks(now);
}
function showEvent(row, open = true) {
  activeEvent = row;
  const e = row.event;
  $('event-title').textContent = e.name; $('event-map').textContent = e.zone;
  $('event-category').textContent = `${e.category} / ${e.expansion}`;
  $('event-description').textContent = e.description;
  $('event-reward').hidden = !e.gemstone; $('event-reward').replaceChildren();
  if (e.gemstone) $('event-reward').append(el('strong', '', 'Amalgamated Gemstone — reward choice'), el('p', '', `${e.gemstone.note} Choose the gemstone from the reward; it is not an automatic drop.`));
  $('event-schedule').textContent = row.start === null ? 'No verified start time. Countdowns are paused for this event.' : `${clockText(row.start, state.utc)} ${state.utc ? 'UTC' : 'local'} · ${countdown(row.start, epoch())}`;
  if (e.id.startsWith('Base Game|Ley-Line Anomaly|')) $('event-schedule').append(el('p', '', 'The waypoint is a meeting point. The anomaly appears elsewhere on the map — follow its event marker.'));
  const group = actionButtons(e, row.start === null ? null : row);
  const favourite = state.favourites.includes(e.id);
  group.append(iconButton('star', `${favourite ? 'Remove favourite' : 'Add favourite'}: ${e.name}`, 'favourite', e.id, favourite));
  $('event-actions').replaceChildren(group);
  if (open && !$('event-dialog').open) $('event-dialog').showModal();
}
function tickClocks(now = epoch()) {
  if (!state) return;
  $('current-clock').textContent = `${clockText(now, state.utc)} ${state.utc ? 'UTC' : 'local'}`;
  document.querySelectorAll('[data-countdown]').forEach(n => { n.textContent = countdown(Number(n.dataset.countdown), now); });
  const fishing = fishingAt(now, state.region), next = countdown(fishing.nextAt, now);
  $('fishing-status').textContent = `${state.region ? 'Cantha / Castora' : 'Tyria'}: ${phases[fishing.phase]} · ${phases[fishing.next]} ${next}`;
  if ($('fishing-dialog').open) {
    $('fishing-current').replaceChildren(el('strong', '', phases[fishing.phase]), el('p', '', `${phases[fishing.next]} ${next}`));
    const base = Math.floor(now / 7200) * 7200;
    $('fishing-timeline').replaceChildren(...phases.map((name, index) => {
      const node = el('div', `fishing-phase${index === fishing.phase ? ' current' : ''}`, name);
      node.append(el('span', '', clockText(base + fishing.starts[index] * 60, state.utc))); return node;
    }));
  }
}
function resetFilters() {
  Object.assign(filters, { query: '', horizon: 120, view: 'next', expansion: '', gemstone: false, hideDone: false });
  scope = 'all'; category = '';
  $('event-search').value = ''; $('event-view').value = 'next'; $('horizon').value = '120'; $('expansion').value = '';
  $('gemstone-only').checked = false; $('hide-done').checked = false; refresh(true);
}
function closeBrowse() {
  if (matchMedia('(max-width: 680px)').matches) { $('timer-sidebar').classList.remove('is-open'); $('browse-toggle').setAttribute('aria-expanded', 'false'); }
}
document.addEventListener('click', event => {
  const target = event.target.closest('button'); if (!target) return;
  if (target.classList.contains('close-dialog')) { target.closest('dialog').close(); return; }
  if (!data) return;
  if (target.dataset.scope) { scope = target.dataset.scope; category = ''; refresh(true); closeBrowse(); return; }
  if (target.dataset.category) { category = target.dataset.category; scope = 'all'; refresh(true); closeBrowse(); return; }
  const action = target.dataset.action, id = target.dataset.eventId;
  if (!action) return;
  const e = data.events.find(e => e.id === id); if (!e) return;
  if (action === 'favourite') toggleValue('favourites', id);
  else if (action === 'done') { toggleValue('done', completionKey(id)); status(state.done.includes(completionKey(id)) ? 'Marked done until 00:00 UTC' : 'Daily checkmark removed'); if ($('event-dialog').open && activeEvent?.event.id === id) showEvent(activeEvent, false); }
  else if (action === 'waypoint') copy(e.waypoint, 'Waypoint');
  else if (action === 'message') { const start = Number(target.dataset.start); if (Number.isFinite(start)) copy(shareMessage(e, start), 'Event message'); }
  else if (action === 'details') showEvent({ event: e, start: target.dataset.start === undefined ? null : Number(target.dataset.start) });
});
$('event-search').addEventListener('input', e => { filters.query = e.target.value; refresh(); });
for (const [id, key, value] of [['event-view', 'view', v => v], ['horizon', 'horizon', Number], ['expansion', 'expansion', v => v]]) $(id).addEventListener('change', e => { filters[key] = value(e.target.value); refresh(true); });
for (const [id, key] of [['gemstone-only', 'gemstone'], ['hide-done', 'hideDone']]) $(id).addEventListener('change', e => { filters[key] = e.target.checked; refresh(true); });
$('timezone').addEventListener('change', e => { if (!state) return; state.utc = e.target.value === 'utc'; persist(); refresh(true); if ($('event-dialog').open && activeEvent) showEvent(activeEvent, false); });
$('fishing-region').addEventListener('change', e => { if (!state) return; state.region = Number(e.target.value) === 1 ? 1 : 0; persist(); tickClocks(); });
$('reset-filters').addEventListener('click', resetFilters); $('clear-results').addEventListener('click', resetFilters);
$('quick-help').addEventListener('click', () => $('help-dialog').showModal());
$('fishing-open').addEventListener('click', () => { if (state) { $('fishing-dialog').showModal(); tickClocks(); } });
$('browse-toggle').addEventListener('click', () => { const open = $('timer-sidebar').classList.toggle('is-open'); $('browse-toggle').setAttribute('aria-expanded', String(open)); });
$('retry-load').addEventListener('click', initialise);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
window.addEventListener('pageshow', () => refresh());
window.addEventListener('storage', e => { if (data && e.key === 'tyria-chronicle.web-timer.v1') { const loaded = loadState(storage, data.events, epoch()); state = loaded.state; $('timezone').value = state.utc ? 'utc' : 'local'; $('fishing-region').value = state.region; refresh(true); } });
async function initialise() {
  $('load-error').hidden = true; $('events-grid').setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(new URL('./timer-data/catalog.json', import.meta.url));
    if (!response.ok) throw new Error('Schedule request failed');
    data = validateCatalog(await response.json());
    try { storage = window.localStorage; } catch { storage = null; }
    const loaded = loadState(storage, data.events, epoch()); state = loaded.state; storageAvailable = loaded.available;
    $('storage-warning').hidden = storageAvailable;
    $('category-nav').replaceChildren(...categories.map(name => { const b = button(name); b.dataset.category = name; b.setAttribute('aria-pressed', 'false'); return b; }));
    const options = [el('option', '', 'All expansions'), ...[...new Set(data.events.map(e => e.expansion))].sort().map(name => { const o = el('option', '', name); o.value = name; return o; })]; options[0].value = '';
    $('expansion').replaceChildren(...options); $('timezone').value = state.utc ? 'utc' : 'local'; $('fishing-region').value = state.region;
    const fish = $('fishing-open').querySelector('[aria-hidden]'); fish.replaceChildren(icon('fish')); fish.className = 'fish-symbol';
    $('event-search').disabled = false; $('event-view').disabled = false; refresh(true);
  } catch (error) {
    $('load-error').hidden = false; $('events-grid').setAttribute('aria-busy', 'false'); $('result-count').textContent = 'Schedule unavailable';
    console.error('Tyria Chronicle could not load its local schedule.', error);
  }
}
setInterval(() => { if (!data || document.hidden) return; const now = epoch(), minute = Math.floor(now / 60); if (minute !== lastMinute || resetDaily(state, now)) { lastMinute = minute; refresh(); } else tickClocks(now); }, 1000);
initialise();
