'use client';

import type { AnalysisConfig, SignalDirection } from '@/lib/analysis';
import { useConfluence } from '@/components/chart/use-confluence';
import { AnalysisDisclaimer } from '@/components/chart/analysis-disclaimer';

interface ConfluencePanelProps {
  symbol: string;
  label: string;
  config: AnalysisConfig;
}

const DIRECTION_LABEL: Record<SignalDirection, string> = {
  buy: 'Mua',
  sell: 'Bán',
  neutral: 'Trung lập',
};

const DIRECTION_ICON: Record<SignalDirection, string> = { buy: '▲', sell: '▼', neutral: '–' };

// Cùng bảng màu VIỀN với analysis-panel.tsx — chữ luôn text-foreground để giữ tương phản AA cả 2
// theme (không lặp logic tính hướng, chỉ lặp bảng tra cứu hiển thị nhỏ theo direction).
const DIRECTION_BORDER: Record<SignalDirection, string> = {
  buy: 'border-success/60 bg-success/10',
  sell: 'border-danger/60 bg-danger/10',
  neutral: 'border-border bg-surface',
};

const DIRECTION_BAR: Record<SignalDirection, string> = {
  buy: 'bg-success',
  sell: 'bg-danger',
  neutral: 'bg-muted-foreground',
};

function NormBar({ norm, direction }: { norm: number; direction: SignalDirection }) {
  const widthPercent = Math.round(Math.abs(norm) * 100);
  return (
    <div
      className="border-border bg-input h-2 w-24 overflow-hidden rounded-full border"
      aria-hidden="true"
    >
      <div className={`h-full ${DIRECTION_BAR[direction]}`} style={{ width: `${widthPercent}%` }} />
    </div>
  );
}

/**
 * Bảng hợp lưu tín hiệu đa khung (1h/4h/1D/1W) cho mã đang xem — mỗi khung 1 tín hiệu + dòng tổng
 * hợp (Đợt 10, mục 2.3). Đặt DƯỚI `analysis-panel` trên trang chart, dùng đúng bộ quy tắc người
 * dùng đang đặt (`config` truyền từ `use-indicator-config`).
 */
export function ConfluencePanel({ symbol, label, config }: ConfluencePanelProps) {
  const { status, confluence, error } = useConfluence(symbol, config);

  return (
    <section
      aria-labelledby="confluence-panel-heading"
      className="border-border bg-surface flex flex-col gap-4 rounded-lg border p-4"
    >
      <h2 id="confluence-panel-heading" className="text-sm font-semibold">
        Hợp lưu tín hiệu đa khung — {label}
      </h2>

      {status === 'loading' && (
        <p role="status" aria-live="polite" className="text-muted-foreground text-sm">
          Đang tính hợp lưu đa khung…
        </p>
      )}

      {status === 'error' && (
        <p role="alert" className="text-danger text-sm">
          Không tính được hợp lưu đa khung: {error}
        </p>
      )}

      {status === 'success' && confluence && (
        <div
          role="region"
          aria-label={`Hợp lưu tín hiệu đa khung theo mã ${label}`}
          className="overflow-x-auto"
          tabIndex={0}
        >
          <table className="w-full min-w-[420px] text-left text-sm">
            <caption className="sr-only">Hợp lưu tín hiệu đa khung theo mã {label}</caption>
            <thead>
              <tr className="border-border text-muted-foreground border-b">
                <th scope="col" className="px-3 py-2 font-medium">
                  Khung
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Tín hiệu
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Độ mạnh
                </th>
              </tr>
            </thead>
            <tbody>
              {confluence.perTimeframe.map((verdict) => {
                const direction = verdict.suggestion?.direction ?? 'neutral';
                return (
                  <tr key={verdict.timeframe} className="border-border border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{verdict.timeframe}</td>
                    <td className="px-3 py-2">
                      {verdict.suggestion ? (
                        <span
                          className={`inline-flex min-h-11 items-center gap-1 rounded-md border px-2 py-1 ${DIRECTION_BORDER[direction]}`}
                        >
                          <span aria-hidden="true">{DIRECTION_ICON[direction]}</span>
                          {DIRECTION_LABEL[direction]}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">— (thiếu nến)</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <NormBar norm={verdict.norm} direction={direction} />
                        <span className="tabular-nums">
                          {verdict.norm >= 0 ? '+' : ''}
                          {verdict.norm.toFixed(2)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr
                className={`border-border border-t-2 font-semibold ${DIRECTION_BORDER[confluence.overall]}`}
              >
                <td className="px-3 py-2">Tổng hợp</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden="true">{DIRECTION_ICON[confluence.overall]}</span>
                    {DIRECTION_LABEL[confluence.overall]}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {confluence.buyCount}/{confluence.perTimeframe.length} khung thiên Mua ·{' '}
                  {confluence.sellCount}/{confluence.perTimeframe.length} khung thiên Bán
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <AnalysisDisclaimer />
    </section>
  );
}
