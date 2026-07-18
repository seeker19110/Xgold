'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { getInstrumentBySymbol, type Instrument } from '@/lib/instruments';
import { shouldTrigger, type AlertDirection, type PriceAlert } from '@/lib/alerts/types';
import { useAlerts } from '@/components/alerts/use-alerts';

interface AlertsPanelProps {
  /** Mã chuẩn đang xem (vd 'XAUUSD') — alert đặt/kích hoạt gắn với mã này. */
  symbol: string;
  /** Nhãn ngắn hiển thị (vd 'XAU/USD'). */
  label: string;
  /** Giá đóng cửa nến mới nhất của mã đang xem; `null` khi chưa có dữ liệu. */
  latestClose: number | null;
}

const DIRECTION_LABEL: Record<AlertDirection, string> = {
  above: 'Vượt lên trên',
  below: 'Xuống dưới',
};

const usdFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const vndFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

function formatPrice(price: number, currency: Instrument['currency']): string {
  return currency === 'VND' ? `${vndFormatter.format(price)} đ` : `$${usdFormatter.format(price)}`;
}

/** Giá nhập tay: số dương hữu hạn (giá không âm, không 0). Chuỗi rỗng/không phải số → lỗi validate. */
const priceInputSchema = z.coerce.number().positive().finite();

/**
 * Gửi thông báo hệ thống khi alert chạm ngưỡng. Guard phòng thủ: không hỗ trợ Notification hoặc chưa
 * được cấp quyền → bỏ qua, KHÔNG throw (đúng ràng buộc W-514: từ chối quyền không chặn UI). Bọc
 * try/catch vì `new Notification` có thể ném ở một số trình duyệt khi thiếu service worker.
 */
function fireNotification(alert: PriceAlert, label: string, latestClose: number): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(`Cảnh báo giá ${label}`, {
      body: `${label} đã ${alert.direction === 'above' ? 'vượt lên trên' : 'xuống dưới'} ${
        alert.targetPrice
      } (giá hiện tại ${latestClose}).`,
      tag: alert.id,
    });
  } catch {
    // Nuốt lỗi runtime của Notification — cảnh báo vẫn được đánh dấu đã kích hoạt ở nơi gọi.
  }
}

function alertRowLabel(symbol: string): string {
  return getInstrumentBySymbol(symbol)?.label ?? symbol;
}

function alertRowCurrency(symbol: string): Instrument['currency'] {
  return getInstrumentBySymbol(symbol)?.currency ?? 'USD';
}

/**
 * Cảnh báo giá v1 (W-514) — client-side thuần. Form đặt cảnh báo (chọn hướng + nhập mức giá) + danh
 * sách cảnh báo đang hoạt động/đã kích hoạt (mã, hướng, mức giá, nút xóa) + disclaimer bắt buộc:
 * cảnh báo CHỈ chạy khi tab đang mở (không nền, không email).
 *
 * Logic kích hoạt: mỗi khi `latestClose` (nến mới nhất từ `use-candles`) đổi, quét các alert đang
 * hoạt động (`triggeredAt === null`) đúng mã đang xem — chạm ngưỡng (`shouldTrigger`) thì bắn thông
 * báo đúng 1 lần rồi đánh dấu `triggeredAt` (không lặp lại).
 */
export function AlertsPanel({ symbol, label, latestClose }: AlertsPanelProps) {
  const {
    alerts,
    isHydrated,
    notificationPermission,
    addAlert,
    removeAlert,
    markTriggered,
    requestPermission,
  } = useAlerts();

  const [direction, setDirection] = useState<AlertDirection>('above');
  const [priceInput, setPriceInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const directionId = useId();
  const priceId = useId();
  const errorId = useId();

  // Chặn bắn trùng khi React Strict Mode double-invoke effect trong cùng 1 commit (cả 2 lần chạy
  // đọc `alerts` cũ, chưa kịp thấy `triggeredAt` mà lần chạy trước vừa đánh dấu) — theo dõi id đã
  // bắn TRONG PHIÊN COMPONENT NÀY bằng ref, cập nhật đồng bộ ngay trong thân effect (không phụ
  // thuộc batching của setState như `markTriggered`).
  const firedIdsRef = useRef<Set<string>>(new Set());

  // Kích hoạt: chạy khi nến mới nhất đổi. Chỉ xét alert đúng mã đang xem + còn hoạt động — mã khác
  // không có giá "sống" ở trang này nên không kiểm được (ghi rõ ở disclaimer). markTriggered đổi
  // `alerts` khiến effect chạy lại nhưng alert đã có triggeredAt nên bị bỏ qua → bắn đúng 1 lần.
  useEffect(() => {
    if (!isHydrated || latestClose === null) return;
    for (const alert of alerts) {
      if (alert.symbol !== symbol || alert.triggeredAt !== null) continue;
      if (firedIdsRef.current.has(alert.id)) continue;
      if (shouldTrigger(alert, latestClose)) {
        firedIdsRef.current.add(alert.id);
        fireNotification(alert, alertRowLabel(alert.symbol), latestClose);
        markTriggered(alert.id);
      }
    }
  }, [alerts, isHydrated, latestClose, symbol, markTriggered]);

  // Sắp xếp: đang hoạt động trước, giữ thứ tự tạo trong từng nhóm — người dùng thấy alert còn chờ trên cùng.
  const sortedAlerts = useMemo(() => {
    const active = alerts.filter((a) => a.triggeredAt === null);
    const triggered = alerts.filter((a) => a.triggeredAt !== null);
    return [...active, ...triggered];
  }, [alerts]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = priceInputSchema.safeParse(priceInput.trim());
    if (!parsed.success) {
      setFormError('Nhập mức giá là số dương (ví dụ 2500).');
      return;
    }
    setFormError(null);
    addAlert({ symbol, direction, targetPrice: parsed.data });
    setPriceInput('');
  }

  return (
    <section
      aria-label={`Cảnh báo giá ${label}`}
      className="border-border bg-background flex flex-col gap-3 rounded-lg border p-4"
    >
      <h2 className="text-foreground text-sm font-semibold">Cảnh báo giá</h2>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={directionId} className="text-muted-foreground text-xs">
            Hướng
          </label>
          <select
            id={directionId}
            value={direction}
            onChange={(e) => setDirection(e.target.value as AlertDirection)}
            className="border-border bg-background text-foreground min-h-11 rounded-md border px-2 text-sm"
          >
            <option value="above">Vượt lên trên</option>
            <option value="below">Xuống dưới</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={priceId} className="text-muted-foreground text-xs">
            Mức giá
          </label>
          <input
            id={priceId}
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            aria-invalid={formError !== null}
            aria-describedby={formError !== null ? errorId : undefined}
            placeholder={latestClose !== null ? String(latestClose) : 'Mức giá'}
            className="border-border bg-background text-foreground min-h-11 w-32 rounded-md border px-2 text-sm tabular-nums"
          />
        </div>

        <button
          type="submit"
          className="bg-primary text-primary-foreground min-h-11 rounded-md px-4 text-sm font-medium"
        >
          Đặt cảnh báo
        </button>
      </form>

      {formError !== null && (
        <p id={errorId} role="alert" className="text-danger text-xs">
          {formError}
        </p>
      )}

      {notificationPermission !== 'granted' && (
        <p className="text-muted-foreground text-xs">
          {notificationPermission === 'unsupported'
            ? 'Trình duyệt không hỗ trợ thông báo hệ thống — cảnh báo vẫn được lưu nhưng không có thông báo.'
            : notificationPermission === 'denied'
              ? 'Thông báo đang bị chặn. Bật thông báo cho trang này trong cài đặt trình duyệt để nhận cảnh báo.'
              : 'Bật thông báo trình duyệt để nhận cảnh báo.'}
          {notificationPermission === 'default' && (
            <>
              {' '}
              <button type="button" onClick={requestPermission} className="text-primary underline">
                Bật thông báo
              </button>
            </>
          )}
        </p>
      )}

      {sortedAlerts.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có cảnh báo nào.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {sortedAlerts.map((alert) => {
            const triggered = alert.triggeredAt !== null;
            return (
              <li
                key={alert.id}
                className="border-border flex items-center justify-between gap-2 border-b py-2 last:border-0"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground text-sm font-medium">
                    {alertRowLabel(alert.symbol)}{' '}
                    <span className="text-muted-foreground font-normal">
                      {DIRECTION_LABEL[alert.direction].toLowerCase()}
                    </span>{' '}
                    <span className="tabular-nums">
                      {formatPrice(alert.targetPrice, alertRowCurrency(alert.symbol))}
                    </span>
                  </span>
                  <span
                    className={triggered ? 'text-success text-xs' : 'text-muted-foreground text-xs'}
                  >
                    {triggered ? 'Đã kích hoạt' : 'Đang chờ'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAlert(alert.id)}
                  aria-label={`Xóa cảnh báo ${alertRowLabel(alert.symbol)} ${DIRECTION_LABEL[
                    alert.direction
                  ].toLowerCase()} ${alert.targetPrice}`}
                  title="Xóa cảnh báo"
                  className="border-border text-muted-foreground hover:bg-surface hover:text-foreground flex min-h-11 min-w-11 items-center justify-center rounded-md border text-lg"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-muted-foreground border-border border-t pt-2 text-xs">
        Cảnh báo chỉ được kiểm tra khi tab này đang mở và bạn đang xem đúng mã — không chạy nền,
        không gửi email. Đóng tab hoặc chuyển sang mã khác thì cảnh báo của mã hiện tại tạm dừng
        kiểm tra.
      </p>
    </section>
  );
}
