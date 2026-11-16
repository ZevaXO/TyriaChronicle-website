// Original synthesized two-note chime; no downloaded audio or external service.
export function createReminderSound(report) {
  let context, enabled = false;
  async function play() {
    if (!context || !enabled) return;
    try {
      await context.resume();
      if (context.state !== 'running') throw Error();
      const now = context.currentTime;
      [660, 880].forEach((frequency, index) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const start = now + index * 0.18;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start); oscillator.stop(start + 0.36);
      });
    } catch { report('Sound could not play. Check that this tab is unmuted and try Test sound.'); }
  }
  async function setEnabled(value) {
    enabled = value;
    if (!enabled) return;
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) throw Error();
      context ||= new Audio();
      await play();
    } catch { enabled = false; report('Reminder sound is unavailable in this browser.'); }
  }
  return { play, setEnabled };
}
