/**
 * Audio math helpers for Behringer XR18 / X-Air
 */

/**
 * Converts a normalized linear fader position (0.0 to 1.0) to decibels (dB)
 * Behringer XR18 / X32 fader scale:
 * 0.0 -> -inf
 * 0.0 .. 0.0625 -> -90dB to -60dB
 * 0.0625 .. 0.25 -> -60dB to -30dB
 * 0.25 .. 0.5 -> -30dB to -10dB
 * 0.5 .. 0.75 -> -10dB to 0dB (0.75 is unity 0dB)
 * 0.75 .. 1.0 -> 0dB to +10dB
 */
export function faderToDb(faderVal: number): number {
  const f = Math.max(0, Math.min(1, faderVal));
  if (f <= 0.0001) return -Infinity;

  if (f < 0.0625) {
    // 0.0 to 0.0625 -> -90 to -60 dB
    return -90 + (f / 0.0625) * 30;
  } else if (f < 0.25) {
    // 0.0625 to 0.25 -> -60 to -30 dB
    const ratio = (f - 0.0625) / (0.25 - 0.0625);
    return -60 + ratio * 30;
  } else if (f < 0.5) {
    // 0.25 to 0.5 -> -30 to -10 dB
    const ratio = (f - 0.25) / 0.25;
    return -30 + ratio * 20;
  } else if (f < 0.75) {
    // 0.5 to 0.75 -> -10 to 0 dB
    const ratio = (f - 0.5) / 0.25;
    return -10 + ratio * 10;
  } else {
    // 0.75 to 1.0 -> 0 to +10 dB
    const ratio = (f - 0.75) / 0.25;
    return ratio * 10;
  }
}

/**
 * Converts decibels (dB) back to normalized fader value (0.0 to 1.0)
 */
export function dbToFader(db: number): number {
  if (db <= -90 || !isFinite(db)) return 0;
  if (db <= -60) {
    return ((db + 90) / 30) * 0.0625;
  } else if (db <= -30) {
    return 0.0625 + ((db + 60) / 30) * (0.25 - 0.0625);
  } else if (db <= -10) {
    return 0.25 + ((db + 30) / 20) * 0.25;
  } else if (db <= 0) {
    return 0.5 + ((db + 10) / 10) * 0.25;
  } else {
    const capped = Math.min(10, db);
    return 0.75 + (capped / 10) * 0.25;
  }
}

/**
 * Formats a dB number into a clean string e.g. "-12.5 dB", "0.0 dB", "+3.2 dB", "-∞"
 */
export function formatDb(db: number): string {
  if (!isFinite(db) || db <= -80) return '-∞';
  if (Math.abs(db) < 0.05) return '0.0 dB';
  const prefix = db > 0 ? '+' : '';
  return `${prefix}${db.toFixed(1)} dB`;
}

/**
 * Formats a normalized fader value directly to a display string
 */
export function formatFader(faderVal: number): string {
  const db = faderToDb(faderVal);
  return formatDb(db);
}

/**
 * Format pan value (-100 to +100)
 */
export function formatPan(pan: number): string {
  if (pan === 0) return 'C';
  if (pan < 0) return `L ${Math.abs(pan)}`;
  return `R ${pan}`;
}

/**
 * Format Gain value
 */
export function formatGain(gainDb: number): string {
  const prefix = gainDb > 0 ? '+' : '';
  return `${prefix}${gainDb.toFixed(1)} dB`;
}

/**
 * Formats channel index with zero-padding (e.g. 1 -> "01", 16 -> "16")
 */
export function padChannel(chId: number): string {
  return chId < 10 ? `0${chId}` : `${chId}`;
}

/**
 * Converts meter dBFS (-60 to +6) to 0-100% height
 */
export function meterDbToPercent(db: number): number {
  if (!isFinite(db) || db <= -60) return 0;
  if (db >= 6) return 100;
  // Map -60 to 0% and +6 to 100%
  return Math.min(100, Math.max(0, ((db + 60) / 66) * 100));
}
