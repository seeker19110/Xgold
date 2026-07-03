'use client';

import type { ChartConfig } from '@/lib/indicators/config';
import type { MaLine, MaType, RsiLine } from '@/lib/indicators/types';

interface IndicatorPanelProps {
  config: ChartConfig;
  onChange: (config: ChartConfig) => void;
}

const MA_COLORS = ['#facc15', '#38bdf8', '#f472b6', '#4ade80', '#fb923c', '#c084fc'];
const RSI_COLORS = ['#a78bfa', '#f87171', '#38bdf8', '#facc15', '#4ade80', '#fb923c'];

function nextColor(existingCount: number, palette: string[]): string {
  return palette[existingCount % palette.length] ?? '#94a3b8';
}

const inputClass = 'border-border bg-input text-foreground min-h-11 rounded-md border px-2 text-sm';
const buttonGhostClass = 'text-primary min-h-11 rounded-md px-2 text-sm font-medium';
const buttonDangerClass = 'text-danger min-h-11 min-w-11 rounded-md px-2 text-sm';

export function IndicatorPanel({ config, onChange }: IndicatorPanelProps) {
  function addMaLine() {
    const id = `ma-${Date.now()}-${config.maLines.length}`;
    onChange({
      ...config,
      maLines: [
        ...config.maLines,
        {
          id,
          type: 'SMA',
          period: 20,
          color: nextColor(config.maLines.length, MA_COLORS),
          visible: true,
        },
      ],
    });
  }

  function updateMaLine(id: string, patch: Partial<MaLine>) {
    onChange({
      ...config,
      maLines: config.maLines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    });
  }

  function removeMaLine(id: string) {
    onChange({ ...config, maLines: config.maLines.filter((line) => line.id !== id) });
  }

  function addRsiLine() {
    const id = `rsi-${Date.now()}-${config.rsiLines.length}`;
    onChange({
      ...config,
      rsiLines: [
        ...config.rsiLines,
        { id, period: 14, color: nextColor(config.rsiLines.length, RSI_COLORS), visible: true },
      ],
    });
  }

  function updateRsiLine(id: string, patch: Partial<RsiLine>) {
    onChange({
      ...config,
      rsiLines: config.rsiLines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    });
  }

  function removeRsiLine(id: string) {
    onChange({ ...config, rsiLines: config.rsiLines.filter((line) => line.id !== id) });
  }

  function handlePeriodChange(raw: string, apply: (period: number) => void) {
    const period = Number(raw);
    if (Number.isFinite(period) && period > 0) apply(Math.floor(period));
  }

  return (
    <div className="border-border bg-surface flex flex-col gap-5 rounded-lg border p-4">
      <section aria-labelledby="ma-panel-heading" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 id="ma-panel-heading" className="text-sm font-semibold">
            Multi-MA
          </h2>
          <button type="button" onClick={addMaLine} className={buttonGhostClass}>
            + Thêm đường MA
          </button>
        </div>
        {config.maLines.length === 0 && (
          <p className="text-muted-foreground text-sm">Chưa có đường MA nào.</p>
        )}
        <ul className="flex flex-col gap-2">
          {config.maLines.map((line) => (
            <li key={line.id} className="flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                checked={line.visible}
                onChange={(e) => updateMaLine(line.id, { visible: e.target.checked })}
                aria-label={`Hiện/ẩn đường ${line.type} ${line.period}`}
                className="h-5 w-5"
              />
              <label className="sr-only" htmlFor={`ma-type-${line.id}`}>
                Loại đường trung bình động
              </label>
              <select
                id={`ma-type-${line.id}`}
                value={line.type}
                onChange={(e) => updateMaLine(line.id, { type: e.target.value as MaType })}
                className={inputClass}
              >
                <option value="SMA">SMA</option>
                <option value="EMA">EMA</option>
              </select>
              <label className="sr-only" htmlFor={`ma-period-${line.id}`}>
                Chu kỳ
              </label>
              <input
                id={`ma-period-${line.id}`}
                type="number"
                min={1}
                value={line.period}
                onChange={(e) =>
                  handlePeriodChange(e.target.value, (period) => updateMaLine(line.id, { period }))
                }
                className={`${inputClass} w-20`}
              />
              <label className="sr-only" htmlFor={`ma-color-${line.id}`}>
                Màu đường
              </label>
              <input
                id={`ma-color-${line.id}`}
                type="color"
                value={line.color}
                onChange={(e) => updateMaLine(line.id, { color: e.target.value })}
                className="h-9 w-9 rounded"
              />
              <button
                type="button"
                onClick={() => removeMaLine(line.id)}
                aria-label={`Xóa đường ${line.type} ${line.period}`}
                className={buttonDangerClass}
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="rsi-panel-heading" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 id="rsi-panel-heading" className="text-sm font-semibold">
            Multi-RSI
          </h2>
          <button type="button" onClick={addRsiLine} className={buttonGhostClass}>
            + Thêm đường RSI
          </button>
        </div>
        {config.rsiLines.length === 0 && (
          <p className="text-muted-foreground text-sm">Chưa có đường RSI nào.</p>
        )}
        <ul className="flex flex-col gap-2">
          {config.rsiLines.map((line) => (
            <li key={line.id} className="flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                checked={line.visible}
                onChange={(e) => updateRsiLine(line.id, { visible: e.target.checked })}
                aria-label={`Hiện/ẩn RSI ${line.period}`}
                className="h-5 w-5"
              />
              <label className="sr-only" htmlFor={`rsi-period-${line.id}`}>
                Chu kỳ RSI
              </label>
              <input
                id={`rsi-period-${line.id}`}
                type="number"
                min={1}
                value={line.period}
                onChange={(e) =>
                  handlePeriodChange(e.target.value, (period) => updateRsiLine(line.id, { period }))
                }
                className={`${inputClass} w-20`}
              />
              <label className="sr-only" htmlFor={`rsi-color-${line.id}`}>
                Màu đường RSI
              </label>
              <input
                id={`rsi-color-${line.id}`}
                type="color"
                value={line.color}
                onChange={(e) => updateRsiLine(line.id, { color: e.target.value })}
                className="h-9 w-9 rounded"
              />
              <button
                type="button"
                onClick={() => removeRsiLine(line.id)}
                aria-label={`Xóa RSI ${line.period}`}
                className={buttonDangerClass}
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
