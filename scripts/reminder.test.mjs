import test from 'node:test'; import assert from 'node:assert/strict';
import { dueReminders, reminderChoices } from '../reminder-core.mjs';
const event = { id: 'test', name: 'Test', slots: [[60, 10]], category: 'World Bosses' };
const choices = { watched: ['test'], lead: 5 };
test('lead threshold, deduplication and expired reminders after sleep', () => {
  assert.equal(dueReminders([event], choices, [], 3299, 3280, new Set()).length, 0);
  assert.equal(dueReminders([event], choices, [], 3300, 3280, new Set()).length, 1);
  assert.equal(dueReminders([event], choices, [], 3340, 3300, new Set(['test@3600'])).length, 0);
  assert.equal(dueReminders([event], choices, [], 3660, 3300, new Set()).length, 0);
});
test('zero lead tolerates a short tick delay but never a long sleep', () => {
  const c = { ...choices, lead: 0 };
  assert.equal(dueReminders([event], c, [], 3599, 3590, new Set()).length, 0);
  assert.equal(dueReminders([event], c, [], 3608, 3595, new Set()).length, 1);
  assert.equal(dueReminders([event], c, [], 3608, 2000, new Set()).length, 0);
  assert.equal(dueReminders([event], c, [], 3640, 3595, new Set()).length, 0);
});
test('Done today, shared Anomaly completion, unverified slots and season bounds', () => {
  assert.equal(dueReminders([event], choices, ['test'], 3300, 3200, new Set()).length, 0);
  const anomaly = { ...event, id: 'Base Game|Ley-Line Anomaly|map' };
  assert.equal(dueReminders([anomaly], { watched: [anomaly.id], lead: 5 }, ['Base Game|Ley-Line Anomaly|daily'], 3300, 3200, new Set()).length, 0);
  assert.equal(dueReminders([{ ...event, slots: [] }], choices, [], 3300, 3200, new Set()).length, 0);
  assert.equal(dueReminders([{ ...event, festival: true, activeFrom: 4000, activeUntil: 8000 }], choices, [], 3300, 3200, new Set()).length, 0);
});
test('midnight, next day occurrences and safe saved choices', () => {
  const midnight = { ...event, slots: [[0, 10]] };
  assert.equal(dueReminders([midnight], choices, [], 86100, 86090, new Set()).at(0).start, 86400);
  assert.equal(dueReminders([event], choices, [], 89700, 89690, new Set(['test@3600'])).length, 1);
  assert.deepEqual(reminderChoices({ watched: ['test', 'test', 'missing'], lead: -5 }, [event]), { watched: ['test'], lead: 5 });
});
