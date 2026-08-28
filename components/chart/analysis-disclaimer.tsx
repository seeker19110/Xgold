/**
 * Disclaimer pháp lý dùng CHUNG cho mọi bề mặt hiển thị tín hiệu kỹ thuật (ADR-0007/0010, cập nhật
 * ADR-0011 khi thêm Xác suất/Entry/SL/TP): `analysis-panel.tsx`, `confluence-panel.tsx`,
 * `screener-table.tsx`. Giữ NGUYÊN chữ + style ở MỘT nơi — không chép chuỗi disclaimer ở nhiều nơi
 * (CLAUDE.md §3.4 DRY).
 */
export function AnalysisDisclaimer() {
  return (
    <p className="text-muted-foreground border-border border-t pt-2 text-xs">
      Tín hiệu kỹ thuật tự động từ quy tắc chỉ báo, chỉ mang tính tham khảo —{' '}
      <strong className="text-foreground">không phải lời khuyên đầu tư</strong>. Xác suất hiển thị
      là tần suất TP1 chạm trước SL{' '}
      <strong className="text-foreground">đo trên chính đoạn lịch sử đang xem</strong> (giả định vào
      lệnh ở mở cửa nến kế, có tính chi phí; nến chạm cả hai mức tính là thua) —{' '}
      <strong className="text-foreground">
        quá khứ không bảo đảm tương lai, mẫu nhỏ thì sai số lớn
      </strong>
      , nên luôn đọc kèm khoảng tin cậy và cỡ mẫu. Entry/SL/TP suy ra từ mây Ichimoku + ATR, là mức
      tham chiếu kỹ thuật, không đảm bảo hiệu suất; luôn tự quản trị vốn và cắt lỗ độc lập, không
      dùng làm căn cứ duy nhất cho quyết định mua/bán.
    </p>
  );
}
