// Round dates: the 1st of each month at 00:00 in the settings' time zone (protocol 6.1).

function offsetMinutes(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find(p => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - utcMs) / 60000);
}

/** Unix time of the 1st of `month` (0-11) of `year` at 00:00 in `tz`. */
export function monthStart(year: number, month: number, tz: string): number {
  const guess = Date.UTC(year, month, 1);
  let t = guess - offsetMinutes(guess, tz) * 60000;
  t = guess - offsetMinutes(t, tz) * 60000; // settle across a DST change
  return Math.floor(t / 1000);
}

function localYearMonth(unix: number, tz: string): [number, number] {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit' }).formatToParts(new Date(unix * 1000));
  return [Number(parts.find(p => p.type === 'year')!.value), Number(parts.find(p => p.type === 'month')!.value) - 1];
}

/** The next `n` round dates strictly after `t`. */
export function roundDatesAfter(t: number, tz: string, n: number): number[] {
  let [y, m] = localYearMonth(t, tz);
  const out: number[] = [];
  while (out.length < n) {
    m++;
    if (m > 11) (m = 0), y++;
    const d = monthStart(y, m, tz);
    if (d > t) out.push(d);
  }
  return out;
}

/** The round's label, "YYYY-MM", for a round prepared at time `t`. */
export function roundLabel(t: number, tz: string): string {
  const [y, m] = localYearMonth(t, tz);
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}
