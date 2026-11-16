import { occurrences, completionKey } from './timer-core.mjs';
export const REMINDER_KEY = 'tyria-chronicle.web-reminders.v1';
export function reminderChoices(raw, events) {
  const valid = new Set(events.map(e => e.id));
  return { watched: [...new Set(Array.isArray(raw?.watched) ? raw.watched.filter(id => valid.has(id)) : [])], lead: Number.isInteger(raw?.lead) && raw.lead >= 0 && raw.lead <= 60 ? raw.lead : 5 };
}
// Independent of filters/timezone. Never send expired events after waking from sleep.
export function dueReminders(events, choices, done, now, previous, sent) {
  const watched = new Set(choices.watched), completed = new Set(done);
  const rows = occurrences(events.filter(e => watched.has(e.id) && !completed.has(completionKey(e.id))), now - 60, 120);
  return rows.filter(row => {
    const key = `${row.event.id}@${row.start}`;
    const inWindow = now >= row.start - choices.lead * 60 && (row.start >= now || (choices.lead === 0 && now - row.start <= 30 && previous <= row.start && now - previous <= 90));
    return inWindow && !sent.has(key);
  });
}
