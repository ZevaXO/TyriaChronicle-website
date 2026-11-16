// Browser-independent schedule rules. Epoch timestamps and slot minutes are UTC.
export const DAY = 86400;
export const STORAGE_KEY = 'tyria-chronicle.web-timer.v1';
export const categories = ['World Bosses', 'Meta Events', 'Convergences', 'Public Instances', 'Timed Events', 'Festivals'];
export const dayStart = now => Math.floor(now / DAY) * DAY;
export function completionKey(id) {
  return id.startsWith('Base Game|Ley-Line Anomaly|') ? 'Base Game|Ley-Line Anomaly|daily' : id;
}
export function seasonActive(event, at) {
  return !event.festival || (at >= event.activeFrom && at < event.activeUntil);
}
export function validateCatalog(data) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.events)) throw new Error('Unsupported schedule format.');
  const ids = new Set();
  for (const e of data.events) {
    if (typeof e.id !== 'string' || ids.has(e.id) || !['name', 'zone', 'description', 'waypoint', 'expansion', 'category'].every(k => typeof e[k] === 'string') || !categories.includes(e.category) || !Array.isArray(e.slots)) throw new Error('Invalid event record.');
    ids.add(e.id);
    if (!e.slots.every(s => Array.isArray(s) && s.length === 2 && Number.isInteger(s[0]) && s[0] >= 0 && s[0] < 1440 && Number.isInteger(s[1]) && s[1] > 0 && s[1] <= 1440)) throw new Error('Invalid UTC schedule slot.');
    if (e.festival && !(Number.isFinite(e.activeFrom) && Number.isFinite(e.activeUntil) && e.activeUntil > e.activeFrom)) throw new Error('Invalid festival dates.');
  }
  return data;
}
export function occurrences(events, now, horizon = 120) {
  const rows = [], day = dayStart(now);
  for (const event of events) {
    if (!seasonActive(event, now)) continue;
    for (const [minute, duration] of event.slots) for (let d = -1; d <= 2; d++) {
      const start = day + d * DAY + minute * 60, end = start + duration * 60;
      if (end > now && start <= now + horizon * 60 && seasonActive(event, start)) rows.push({ event, start, end });
    }
  }
  return rows.sort((a, b) => a.start - b.start || (a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0));
}
export function filteredRows(events, now, filters = {}, state = {}) {
  const query = (filters.query || '').trim().toLocaleLowerCase();
  const favourites = new Set(state.favourites || []), completed = new Set(state.done || []);
  const matches = e => (!filters.category || e.category === filters.category) && (!filters.expansion || e.expansion === filters.expansion)
    && (!filters.favourites || favourites.has(e.id))
    && (!filters.gemstone || e.gemstone) && (!filters.hideDone || !completed.has(completionKey(e.id)))
    && (!query || `${e.name} ${e.zone} ${e.expansion} ${e.gemstone ? 'Amalgamated Gemstone' : ''}`.toLocaleLowerCase().includes(query));
  let rows = occurrences(events.filter(matches), now, Math.max(30, Math.min(1440, filters.horizon || 120)));
  if (filters.view === 'now') rows = rows.filter(r => r.start <= now);
  if (filters.view !== 'all' && filters.view !== 'now') {
    const seen = new Set();
    rows = rows.filter(r => r.start >= now && !seen.has(r.event.id) && seen.add(r.event.id));
  }
  return rows;
}
export function unscheduledEvents(events, filters = {}, state = {}) {
  const ids = events.filter(e => !e.slots.length).map(e => e.id);
  // Use the same filters without fabricating timestamps for these information cards.
  return events.filter(e => ids.includes(e.id)
    && (!filters.category || e.category === filters.category) && (!filters.expansion || e.expansion === filters.expansion)
    && (!filters.favourites || state.favourites?.includes(e.id)) && (!filters.gemstone || e.gemstone)
    && (!filters.hideDone || !state.done?.includes(completionKey(e.id)))
    && (!filters.query || `${e.name} ${e.zone} ${e.expansion}`.toLowerCase().includes(filters.query.trim().toLowerCase())));
}
export function shareTime(start) {
  const minute = Math.floor(((start % 3600) + 3600) % 3600 / 60);
  return `xx:${String(minute).padStart(2, '0')}`;
}
export const shareMessage = (event, start) => `${shareTime(start)} ${event.name} @ ${event.waypoint || event.zone}`;
export function countdown(start, now) {
  const delta = start - now;
  if (delta <= 0) return 'Scheduled now*';
  if (delta < 60) return `in ${Math.ceil(delta)}s`;
  const minutes = Math.ceil(delta / 60);
  return minutes >= 60 ? `in ${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `in ${minutes} min`;
}
export function clockText(start, utc = false) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', ...(utc ? { timeZone: 'UTC' } : {}) }).format(start * 1000);
}
export function fishingAt(now, region = 0) {
  const base = Math.floor(now / 7200) * 7200, offset = now - base;
  const starts = region === 1 ? [35, 40, 95, 100] : [25, 30, 100, 105];
  const next = starts.findIndex(minute => offset < minute * 60);
  const index = next === -1 ? 0 : next;
  return { phase: next === -1 ? 3 : (next + 3) % 4, next: index, nextAt: base + (next === -1 ? 7200 : 0) + starts[index] * 60, starts };
}
export const phases = ['Dawn', 'Day', 'Dusk', 'Night'];
export function normaliseState(input, events, now) {
  const valid = new Set(events.map(e => e.id));
  const list = (a, allowed = valid) => [...new Set(Array.isArray(a) ? a.filter(x => typeof x === 'string' && allowed.has(x)) : [])].slice(0, 1000);
  const completedKeys = new Set(events.map(e => completionKey(e.id)));
  const savedDay = Number.isFinite(input?.day) && input.day >= dayStart(now) ? input.day : dayStart(now);
  const done = input?.day === savedDay ? list(input.done, completedKeys) : [];
  return { schemaVersion: 1, day: savedDay, favourites: list(input?.favourites), done, utc: input?.utc === true, region: input?.region === 1 ? 1 : 0 };
}
export function loadState(storage, events, now) {
  try { const raw = storage.getItem(STORAGE_KEY); const value = raw ? JSON.parse(raw) : {}; if (value.schemaVersion && value.schemaVersion !== 1) throw new Error('Unknown saved format'); return { state: normaliseState(value, events, now), available: true }; }
  catch { return { state: normaliseState({}, events, now), available: false }; }
}
export function saveState(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
export function resetDaily(state, now) {
  if (dayStart(now) <= state.day) return false;
  state.day = dayStart(now); state.done = []; return true;
}
