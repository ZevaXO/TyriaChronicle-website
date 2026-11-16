import { REMINDER_KEY, reminderChoices, dueReminders } from './reminder-core.mjs';
import { clockText } from './timer-core.mjs';
export function createReminders({ events, storage, getState, onChange, report, api = globalThis.Notification, playSound = () => {} }) {
  let choices; try { choices = reminderChoices(JSON.parse(storage?.getItem(REMINDER_KEY) || '{}'), events); } catch { choices = reminderChoices({}, events); }
  let enabled = false, previous = Math.floor(Date.now() / 1000), sent = new Set(), busy = false, releaseLock, pendingEnable = false, destroyed = false;
  const activeNotifications = new Set();
  const persist = () => { try { if (!storage) throw Error(); storage.setItem(REMINDER_KEY, JSON.stringify(choices)); } catch { report('Reminder choices cannot be saved; keep this tab open.'); } };
  const update = () => onChange({ ...choices, enabled, supported: Boolean(api && globalThis.isSecureContext), permission: api?.permission || 'unsupported' });
  function stop(message) { enabled = false; if (releaseLock) { releaseLock(); releaseLock = null; } activeNotifications.forEach(n => n.close()); activeNotifications.clear(); update(); if (message) report(message); }
  async function enable() {
    if (pendingEnable || enabled || destroyed) return;
    if (!api || !globalThis.isSecureContext) { report('System notifications are unavailable here. Use a supported desktop browser over HTTPS.'); update(); return; }
    pendingEnable = true;
    try {
      // Only invoked by an explicit click, never on load or when choosing an event.
      const permission = api.permission === 'default' ? await api.requestPermission() : api.permission;
      if (destroyed) return;
      if (permission !== 'granted') { report(permission === 'denied' ? 'Notifications are blocked. You can change this in your browser site settings.' : 'Notifications were not enabled. You can try again when ready.'); update(); return; }
      if (navigator.locks?.request) {
        await new Promise((resolve, reject) => {
          navigator.locks.request('tyria-chronicle.web-reminders.owner', { ifAvailable: true }, async lock => {
            if (!lock) { report('Reminders are already running in another Tyria Chronicle tab. Pause them there first.'); resolve(); return; }
            enabled = true; previous = Math.floor(Date.now() / 1000); update(); resolve();
            await new Promise(done => { releaseLock = done; });
          }).catch(reject);
        });
      } else { enabled = true; previous = Math.floor(Date.now() / 1000); update(); report('Reminders enabled. Keep only one timer tab active to avoid duplicate notifications.'); }
      if (enabled) tick();
    } catch { stop('System notifications could not be enabled in this browser. The event timer still works.'); }
    finally { pendingEnable = false; }
  }
  function tick() {
    if (!enabled || busy || destroyed) return;
    if (api.permission !== 'granted') { stop('Notification permission changed. Reminders paused.'); return; }
    busy = true;
    const now = Math.floor(Date.now() / 1000);
    try {
      const state = getState();
      // getState refreshes the daily completion boundary before evaluating due events.
      const due = dueReminders(events, choices, state.done, now, previous, sent);
      if (due.length) {
        playSound();
        const body = due.slice(0, 3).map(r => `${clockText(r.start, state.utc)} ${r.event.name} — ${r.event.zone}`).join('\n') + (due.length > 3 ? `\n+ ${due.length - 3} more events` : '');
        const notification = new api(due.length === 1 ? 'Tyria Chronicle · Event reminder' : `Tyria Chronicle · ${due.length} upcoming events`, { body, tag: 'tyria-chronicle-event-reminders', icon: new URL('./images/web-header-clock-v1.png', import.meta.url).href });
        activeNotifications.add(notification);
        notification.onclose = () => activeNotifications.delete(notification);
        notification.onclick = () => { window.focus(); notification.close(); };
        for (const row of due) sent.add(`${row.event.id}@${row.start}`);
        if (sent.size > 2000) sent = new Set([...sent].filter(key => Number(key.slice(key.lastIndexOf('@') + 1)) > now - 86400));
      }
    } catch { stop('This browser could not display system notifications. Reminders paused; event browsing still works.'); }
    finally { previous = now; busy = false; }
  }
  const interval = setInterval(tick, 15000);
  const resume = () => { if (enabled) tick(); };
  document.addEventListener('visibilitychange', resume); window.addEventListener('pageshow', resume);
  const unload = () => { destroyed = true; clearInterval(interval); stop(); };
  window.addEventListener('pagehide', () => stop());
  update();
  function test() { if (!enabled || api?.permission !== 'granted') return; try { const n = new api('Tyria Chronicle · Test notification', { body: 'This is a test. Real event reminders need this tab to stay open.', tag: 'tyria-chronicle-reminder-test' }); activeNotifications.add(n); n.onclose = () => activeNotifications.delete(n); report('Test requested. If it does not appear, check browser and operating-system notification settings.'); } catch { stop('This browser could not display the test notification. Reminders paused.'); } }
  return { has: id => choices.watched.includes(id), toggle(id) { const watched = new Set(choices.watched); watched.has(id) ? watched.delete(id) : watched.add(id); choices.watched = [...watched]; persist(); update(); }, setLead(value) { const n = Number(value); if (!Number.isInteger(n) || n < 0 || n > 60) return; choices.lead = n; persist(); update(); }, enable, stop, test, tick, destroy: unload };
}
