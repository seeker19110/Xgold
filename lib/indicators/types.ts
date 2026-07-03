export type MaType = 'SMA' | 'EMA';

export interface MaLine {
  id: string;
  type: MaType;
  period: number;
  color: string;
  visible: boolean;
}

export interface RsiLine {
  id: string;
  period: number;
  color: string;
  visible: boolean;
}

/** Điểm dữ liệu chỉ báo — `value: null` ở vùng "khởi động" (chưa đủ dữ liệu cho chu kỳ). */
export interface IndicatorPoint {
  ts: string;
  value: number | null;
}
