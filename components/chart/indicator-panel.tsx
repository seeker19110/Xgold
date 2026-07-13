'use client';

import type {
  BollingerSettings,
  ChartConfig,
  IchimokuSettings,
  MacdSettings,
} from '@/lib/indicators/config';
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

  // Chỉ áp thay đổi giữ được bất biến fast < slow (khớp ChartConfigSchema — cấu hình vi phạm sẽ
  // bị Zod từ chối lúc giải mã URL/localStorage, làm mất toàn bộ cấu hình đã lưu).
  function updateMacd(patch: Partial<MacdSettings>) {
    const next = { ...config.macd, ...patch };
    if (next.fast >= next.slow) return;
    onChange({ ...config, macd: next });
  }

  function updateBollinger(patch: Partial<BollingerSettings>) {
    onChange({ ...config, bollinger: { ...config.bollinger, ...patch } });
  }

  function updateIchimoku(patch: Partial<IchimokuSettings>) {
    onChange({ ...config, ichimoku: { ...config.ichimoku, ...patch } });
  }

  function handleMultiplierChange(raw: string) {
    const multiplier = Number(raw);
    if (Number.isFinite(multiplier) && multiplier > 0) updateBollinger({ multiplier });
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

      <section aria-labelledby="macd-panel-heading" className="flex flex-col gap-2">
        <h2 id="macd-panel-heading" className="text-sm font-semibold">
          MACD
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="checkbox"
            checked={config.macd.visible}
            onChange={(e) => updateMacd({ visible: e.target.checked })}
            aria-label="Hiện/ẩn MACD"
            className="h-5 w-5"
          />
          <label className="sr-only" htmlFor="macd-fast">
            Chu kỳ EMA nhanh
          </label>
          <input
            id="macd-fast"
            type="number"
            min={1}
            value={config.macd.fast}
            onChange={(e) => handlePeriodChange(e.target.value, (fast) => updateMacd({ fast }))}
            className={`${inputClass} w-20`}
          />
          <label className="sr-only" htmlFor="macd-slow">
            Chu kỳ EMA chậm
          </label>
          <input
            id="macd-slow"
            type="number"
            min={2}
            value={config.macd.slow}
            onChange={(e) => handlePeriodChange(e.target.value, (slow) => updateMacd({ slow }))}
            className={`${inputClass} w-20`}
          />
          <label className="sr-only" htmlFor="macd-signal">
            Chu kỳ đường signal
          </label>
          <input
            id="macd-signal"
            type="number"
            min={1}
            value={config.macd.signal}
            onChange={(e) => handlePeriodChange(e.target.value, (signal) => updateMacd({ signal }))}
            className={`${inputClass} w-20`}
          />
          <span className="text-muted-foreground text-xs">nhanh / chậm / signal</span>
        </div>
      </section>

      <section aria-labelledby="bb-panel-heading" className="flex flex-col gap-2">
        <h2 id="bb-panel-heading" className="text-sm font-semibold">
          Bollinger Bands
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="checkbox"
            checked={config.bollinger.visible}
            onChange={(e) => updateBollinger({ visible: e.target.checked })}
            aria-label="Hiện/ẩn Bollinger Bands"
            className="h-5 w-5"
          />
          <label className="sr-only" htmlFor="bb-period">
            Chu kỳ Bollinger Bands
          </label>
          <input
            id="bb-period"
            type="number"
            min={1}
            value={config.bollinger.period}
            onChange={(e) =>
              handlePeriodChange(e.target.value, (period) => updateBollinger({ period }))
            }
            className={`${inputClass} w-20`}
          />
          <label className="sr-only" htmlFor="bb-multiplier">
            Hệ số độ lệch chuẩn
          </label>
          <input
            id="bb-multiplier"
            type="number"
            min={0.1}
            step={0.1}
            value={config.bollinger.multiplier}
            onChange={(e) => handleMultiplierChange(e.target.value)}
            className={`${inputClass} w-20`}
          />
          <span className="text-muted-foreground text-xs">chu kỳ / hệ số σ</span>
        </div>
      </section>

      <section aria-labelledby="ichimoku-panel-heading" className="flex flex-col gap-2">
        <h2 id="ichimoku-panel-heading" className="text-sm font-semibold">
          Mây Ichimoku
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="checkbox"
            checked={config.ichimoku.visible}
            onChange={(e) => updateIchimoku({ visible: e.target.checked })}
            aria-label="Hiện/ẩn mây Ichimoku"
            className="h-5 w-5"
          />
          <label className="sr-only" htmlFor="ichimoku-conversion">
            Chu kỳ Conversion Line
          </label>
          <input
            id="ichimoku-conversion"
            type="number"
            min={1}
            value={config.ichimoku.conversionPeriod}
            onChange={(e) =>
              handlePeriodChange(e.target.value, (conversionPeriod) =>
                updateIchimoku({ conversionPeriod }),
              )
            }
            className={`${inputClass} w-20`}
          />
          <label className="sr-only" htmlFor="ichimoku-base">
            Chu kỳ Base Line
          </label>
          <input
            id="ichimoku-base"
            type="number"
            min={1}
            value={config.ichimoku.basePeriod}
            onChange={(e) =>
              handlePeriodChange(e.target.value, (basePeriod) => updateIchimoku({ basePeriod }))
            }
            className={`${inputClass} w-20`}
          />
          <label className="sr-only" htmlFor="ichimoku-spanb">
            Chu kỳ Leading Span B
          </label>
          <input
            id="ichimoku-spanb"
            type="number"
            min={1}
            value={config.ichimoku.spanBPeriod}
            onChange={(e) =>
              handlePeriodChange(e.target.value, (spanBPeriod) => updateIchimoku({ spanBPeriod }))
            }
            className={`${inputClass} w-20`}
          />
          <label className="sr-only" htmlFor="ichimoku-displacement">
            Độ dịch mây (Lagging Span)
          </label>
          <input
            id="ichimoku-displacement"
            type="number"
            min={1}
            value={config.ichimoku.displacement}
            onChange={(e) =>
              handlePeriodChange(e.target.value, (displacement) => updateIchimoku({ displacement }))
            }
            className={`${inputClass} w-20`}
          />
          <span className="text-muted-foreground text-xs">
            Conversion / Base / Span B / độ dịch
          </span>
        </div>
      </section>
    </div>
  );
}
