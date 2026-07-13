/**
 * Disclaimer pháp lý dùng CHUNG cho mọi bề mặt hiển thị tín hiệu kỹ thuật (ADR-0007, Đợt 10 mục 5):
 * `analysis-panel.tsx`, `confluence-panel.tsx`, `screener-table.tsx`. Giữ NGUYÊN chữ + style gốc —
 * không chép chuỗi disclaimer ở nhiều nơi (CLAUDE.md §3.4 DRY).
 */
export function AnalysisDisclaimer() {
  return (
    <p className="text-muted-foreground border-border border-t pt-2 text-xs">
      Tín hiệu kỹ thuật tự động từ quy tắc chỉ báo, chỉ mang tính tham khảo —{' '}
      <strong className="text-foreground">không phải lời khuyên đầu tư</strong>. Không dùng làm căn
      cứ duy nhất cho quyết định mua/bán.
    </p>
  );
}
