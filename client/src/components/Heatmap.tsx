import { localDayKey } from '../analytics';
import type { DayActivity } from '../analytics';

const WEEKS = 27; // ~6 months of activity, fits comfortably in the panel
const ALPHA = [0, 0.3, 0.5, 0.72, 1]; // intensity per level 0–4
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Cell {
  key: string;
  count: number;
  tokens: number;
  month: number;
}

function level(count: number, max: number): number {
  if (!count) return 0;
  if (max <= 1) return 4;
  const r = count / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

function alphaFor(lvl: number): number {
  return ALPHA[lvl] ?? 0;
}

/** Build column-major weeks (Sun→Sat) ending today, spanning WEEKS columns. */
function buildWeeks(days: Map<string, DayActivity>): { weeks: Cell[][]; max: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));
  start.setDate(start.getDate() - start.getDay()); // back up to Sunday

  let max = 0;
  const cells: Cell[] = [];
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = localDayKey(d.getTime());
    const info = days.get(key);
    const count = info ? info.count : 0;
    if (count > max) max = count;
    cells.push({ key, count, tokens: info ? info.tokens : 0, month: d.getMonth() });
  }

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { weeks, max };
}

export default function Heatmap({ days }: { days: Map<string, DayActivity> }) {
  const { weeks, max } = buildWeeks(days);

  return (
    <div data-testid="heatmap" className="overflow-x-auto">
      {/* Month labels aligned to the week columns. */}
      <div className="mb-1 flex gap-[3px] pl-1 text-[10px] text-fg-subtle">
        {weeks.map((week, w) => {
          const firstMonth = week[0]?.month;
          const prevMonth = w > 0 ? weeks[w - 1]?.[0]?.month : undefined;
          const show = w === 0 || firstMonth !== prevMonth;
          return (
            <span key={w} className="w-[11px] shrink-0">
              {show && firstMonth !== undefined ? (MONTHS[firstMonth] ?? '') : ''}
            </span>
          );
        })}
      </div>
      <div className="flex gap-[3px]">
        {weeks.map((week, w) => (
          <div key={w} className="flex flex-col gap-[3px]">
            {week.map((cell) => {
              const lvl = level(cell.count, max);
              return (
                <div
                  key={cell.key}
                  data-testid={cell.count > 0 ? 'heatmap-day-active' : 'heatmap-day'}
                  title={`${cell.count} session${cell.count === 1 ? '' : 's'} · ${cell.key}`}
                  className={`h-[11px] w-[11px] rounded-[2px] ${lvl === 0 ? 'bg-surface-hover' : ''}`}
                  style={lvl > 0 ? { backgroundColor: `rgb(var(--accent) / ${alphaFor(lvl)})` } : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-fg-subtle">
        <span>Less</span>
        <span className="h-[11px] w-[11px] rounded-[2px] bg-surface-hover" />
        {[1, 2, 3, 4].map((l) => (
          <span
            key={l}
            className="h-[11px] w-[11px] rounded-[2px]"
            style={{ backgroundColor: `rgb(var(--accent) / ${alphaFor(l)})` }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
