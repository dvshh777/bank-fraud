/**
 * Utilities to convert raw transaction seconds (from the 48-hour monitoring dataset)
 * into standard human-readable wall-clock and date timestamps.
 */

export interface FormattedTimeInfo {
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  time24: string;
  time12: string;
  period: 'AM' | 'PM';
  standardTime: string; // e.g. "Day 1, 02:29:00 PM"
  compact: string;      // e.g. "D1 14:29:00"
  duration: string;     // e.g. "14h 29m 00s"
  rawSec: string;       // e.g. "T+52,140s"
}

export function parseSecondsToTime(totalSeconds: number): FormattedTimeInfo {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  
  // 86,400 seconds in a day
  const day = Math.floor(safeSeconds / 86400) + 1;
  const remDaySeconds = safeSeconds % 86400;

  const hours24 = Math.floor(remDaySeconds / 3600);
  const remHourSeconds = remDaySeconds % 3600;

  const minutes = Math.floor(remHourSeconds / 60);
  const seconds = remHourSeconds % 60;

  const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  const pad = (n: number) => n.toString().padStart(2, '0');

  const time24 = `${pad(hours24)}:${pad(minutes)}:${pad(seconds)}`;
  const time12 = `${pad(hours12)}:${pad(minutes)}:${pad(seconds)} ${period}`;
  const standardTime = `Day ${day}, ${time12}`;
  const compact = `D${day} ${time24}`;
  const duration = safeSeconds < 3600 
    ? `${minutes}m ${pad(seconds)}s`
    : `${Math.floor(safeSeconds / 3600)}h ${pad(minutes)}m ${pad(seconds)}s`;
  const rawSec = `T+${safeSeconds.toLocaleString()}s`;

  return {
    day,
    hours: hours24,
    minutes,
    seconds,
    time24,
    time12,
    period,
    standardTime,
    compact,
    duration,
    rawSec
  };
}

/**
 * Quick format helper returning standard time: e.g. "Day 1, 02:14:00 PM"
 */
export function formatStandardTime(seconds: number): string {
  return parseSecondsToTime(seconds).standardTime;
}

/**
 * Compact clock time with Day: e.g. "Day 1 • 14:29:00"
 */
export function formatClockTime(seconds: number, format: '12h' | '24h' = '12h'): string {
  const info = parseSecondsToTime(seconds);
  return `Day ${info.day} • ${format === '12h' ? info.time12 : info.time24}`;
}
