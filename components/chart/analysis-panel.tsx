'use client';

import { useMemo } from 'react';
import type { Candle, Timeframe } from '@/lib/candles/types';
import {
  RULE_IDS,
  suggestLatest,
  type AnalysisConfig,
  type RuleId,
  type RuleSetting,
  type SignalDirection,
} from '@/lib/analysis';

interface AnalysisPanelProps {
  candles: readonly Candle[];
  timeframe: Timeframe;
  config: AnalysisConfig;
  onChange: (config: AnalysisConfig) => void;
}

const RULE_LABELS: Record<RuleId, string> = {
  'ma-cross': 'Giao cắt MA (SMA 50/200)',
  'price-vs-ma': 'Giá so với SMA200',
  'rsi-zone': 'Vùng RSI 14 (30/70)',
  'macd-cross': 'Giao cắt MACD (12/26/9)',
  'bb-touch': 'Chạm băng Bollinger (20, 2σ)',
};

const DIRECTION_LABEL: Record<SignalDirection, string> = {
  buy: 'Thiên MUA',
  sell: 'Thiên BÁN',
  neutral: 'TRUNG LẬP',
};

const DIRECTION_ICON: Record<SignalDirection, string> = { buy: '▲', sell: '▼', neutral: '–' };

// Màu chỉ nằm ở VIỀN khối gợi ý; chữ luôn text-foreground để giữ tương phản AA cả 2 theme
// (cùng pattern banner "dữ liệu mẫu" — bài học a11y Đợt 2).
const DIRECTION_BORDER: Record<SignalDirection, string> = {
  buy: 'border-success/60 bg-success/10',
  sell: 'border-danger/60 bg-danger/10',
  neutral: 'border-border bg-surface',
};

const inputClass = 'border-border bg-input text-foreground min-h-11 rounded-md border px-2 text-sm';

/**
 * Khối "Phân tích kết hợp": gợi ý tổng hợp Mua/Bán/Trung lập từ 5 quy tắc rule-based
 * (`lib/analysis/`) trên nến đã đóng gần nhất của khung đang xem, kèm lý do từng quy tắc,
 * bật/tắt + trọng số từng quy tắc, và disclaimer bắt buộc (ADR-0007).
 */
export function AnalysisPanel({ candles, timeframe, config, onChange }: AnalysisPanelProps) {
  const suggestion = useMemo(
    () => (config.enabled ? suggestLatest(candles, config) : null),
    [candles, config],
  );

  function updateRule(ruleId: RuleId, patch: Partial<RuleSetting>) {
    onChange({
      ...config,
      rules: { ...config.rules, [ruleId]: { ...config.rules[ruleId], ...patch } },
    });
  }

  function handleWeightChange(ruleId: RuleId, raw: string) {
    const weight = Number(raw);
    if (Number.isFinite(weight) && weight >= 0 && weight <= 1) updateRule(ruleId, { weight });
  }

  const noRuleEnabled = RULE_IDS.every((id) => !config.rules[id].enabled);

  return (
    <section
      aria-labelledby="analysis-panel-heading"
      className="border-border bg-surface flex flex-col gap-4 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="analysis-panel-heading" className="text-sm font-semibold">
          Phân tích kết hợp — tín hiệu kỹ thuật
        </h2>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            aria-label="Bật/tắt phân tích kết hợp"
            className="h-5 w-5"
          />
          Bật phân tích
        </label>
      </div>

      {config.enabled && suggestion && !noRuleEnabled && (
        <div
          role="status"
          className={`rounded-md border px-3 py-2 ${DIRECTION_BORDER[suggestion.direction]}`}
        >
          <p className="text-base font-semibold">
            {DIRECTION_ICON[suggestion.direction]} {DIRECTION_LABEL[suggestion.direction]}
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              điểm {suggestion.score >= 0 ? '+' : ''}
              {suggestion.score.toFixed(2)} / ±{suggestion.maxScore.toFixed(2)} (ngưỡng ±
              {config.buyThreshold.toFixed(2)})
            </span>
          </p>
          <p className="text-muted-foreground text-xs">
            Theo nến đã đóng gần nhất của khung {timeframe} đang chọn.
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {suggestion.signals.map((signal) => (
              <li key={signal.ruleId} className="text-sm">
                <span aria-hidden="true">{DIRECTION_ICON[signal.direction]}</span>{' '}
                <span className="font-medium">{RULE_LABELS[signal.ruleId]}</span>
                <span className="text-muted-foreground"> (trọng số {signal.weight}):</span>{' '}
                {signal.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {config.enabled && noRuleEnabled && (
        <p role="status" className="text-muted-foreground text-sm">
          Chưa có quy tắc nào được bật — bật ít nhất một quy tắc bên dưới để có tín hiệu.
        </p>
      )}

      {config.enabled && (
        <ul className="flex flex-col gap-2">
          {RULE_IDS.map((ruleId) => {
            const setting = config.rules[ruleId];
            return (
              <li key={ruleId} className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={setting.enabled}
                  onChange={(e) => updateRule(ruleId, { enabled: e.target.checked })}
                  aria-label={`Bật/tắt quy tắc ${RULE_LABELS[ruleId]}`}
                  className="h-5 w-5"
                />
                <span className="min-w-52 text-sm">{RULE_LABELS[ruleId]}</span>
                <label className="sr-only" htmlFor={`rule-weight-${ruleId}`}>
                  Trọng số quy tắc {RULE_LABELS[ruleId]}
                </label>
                <input
                  id={`rule-weight-${ruleId}`}
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={setting.weight}
                  onChange={(e) => handleWeightChange(ruleId, e.target.value)}
                  className={`${inputClass} w-24`}
                />
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-muted-foreground border-border border-t pt-2 text-xs">
        Tín hiệu kỹ thuật tự động từ quy tắc chỉ báo, chỉ mang tính tham khảo —{' '}
        <strong className="text-foreground">không phải lời khuyên đầu tư</strong>. Không dùng làm
        căn cứ duy nhất cho quyết định mua/bán.
      </p>
    </section>
  );
}
