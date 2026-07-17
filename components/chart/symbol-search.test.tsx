import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SymbolSearch } from '@/components/chart/symbol-search';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

/**
 * W-508 — hộp tìm mã nhanh. Phần "trình duyệt thật" (phím tắt Ctrl+K bắt được bất kể focus đang ở
 * đâu trên trang thật, focus visual sau khi mở/đóng) đối chiếu thêm bằng E2E (e2e/symbol-search.spec.ts)
 * — jsdom mô phỏng đủ cho hành vi logic (mở/đóng/lọc/điều hướng/focus programmatic).
 */
describe('SymbolSearch', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('mặc định đóng: chỉ hiện nút 🔍, không có dialog', () => {
    render(<SymbolSearch />);
    expect(screen.getByRole('button', { name: 'Tìm mã (Ctrl+K)' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('bấm nút 🔍 mở dialog, focus vào ô input, hiện đủ 4 mã (query rỗng)', () => {
    render(<SymbolSearch />);
    fireEvent.click(screen.getByRole('button', { name: 'Tìm mã (Ctrl+K)' }));

    const dialog = screen.getByRole('dialog', { name: 'Tìm mã' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const input = screen.getByRole('textbox', { name: 'Tìm mã' });
    expect(input).toHaveFocus();
    expect(within(dialog).getAllByRole('button').length).toBe(4);
  });

  it('Ctrl+K từ document mở dialog dù không có gì được focus trước đó', () => {
    render(<SymbolSearch />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(screen.getByRole('dialog', { name: 'Tìm mã' })).toBeInTheDocument();
  });

  it('Cmd+K (metaKey) cũng mở được (macOS)', () => {
    render(<SymbolSearch />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog', { name: 'Tìm mã' })).toBeInTheDocument();
  });

  it('gõ lọc đúng theo symbol/label/name, không phân biệt hoa/thường', () => {
    render(<SymbolSearch />);
    fireEvent.click(screen.getByRole('button', { name: 'Tìm mã (Ctrl+K)' }));
    const input = screen.getByRole('textbox', { name: 'Tìm mã' });

    fireEvent.change(input, { target: { value: 'xag' } });

    const dialog = screen.getByRole('dialog', { name: 'Tìm mã' });
    expect(within(dialog).getByText('XAG/USD')).toBeInTheDocument();
    expect(within(dialog).queryByText('XAU/USD')).not.toBeInTheDocument();
  });

  it('không khớp mã nào hiện thông báo "Không tìm thấy"', () => {
    render(<SymbolSearch />);
    fireEvent.click(screen.getByRole('button', { name: 'Tìm mã (Ctrl+K)' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm mã' }), {
      target: { value: 'khong-ton-tai' },
    });
    expect(screen.getByText('Không tìm thấy mã nào.')).toBeInTheDocument();
  });

  it('click một kết quả → điều hướng /chart/{slug} và đóng dialog', () => {
    render(<SymbolSearch />);
    fireEvent.click(screen.getByRole('button', { name: 'Tìm mã (Ctrl+K)' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm mã' }), {
      target: { value: 'xagusd' },
    });

    fireEvent.click(screen.getByText('XAG/USD'));

    expect(push).toHaveBeenCalledWith('/chart/xagusd');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Enter trong ô input khi chỉ còn đúng 1 kết quả → chọn kết quả đó', () => {
    render(<SymbolSearch />);
    fireEvent.click(screen.getByRole('button', { name: 'Tìm mã (Ctrl+K)' }));
    const input = screen.getByRole('textbox', { name: 'Tìm mã' });
    fireEvent.change(input, { target: { value: 'dxy' } });

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(push).toHaveBeenCalledWith('/chart/dxy');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Esc đóng dialog', () => {
    render(<SymbolSearch />);
    fireEvent.click(screen.getByRole('button', { name: 'Tìm mã (Ctrl+K)' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('đóng dialog (Esc) trả focus về nút 🔍 đã mở nó', () => {
    render(<SymbolSearch />);
    const trigger = screen.getByRole('button', { name: 'Tìm mã (Ctrl+K)' });
    fireEvent.click(trigger);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(trigger).toHaveFocus();
  });

  it('click ra ngoài dialog (nền phủ) đóng dialog', () => {
    const { container } = render(<SymbolSearch />);
    fireEvent.click(screen.getByRole('button', { name: 'Tìm mã (Ctrl+K)' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Phần tử nền phủ là cha trực tiếp của dialog — click nó (không phải dialog) phải đóng.
    const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.click(backdrop);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('click bên trong dialog không đóng dialog', () => {
    render(<SymbolSearch />);
    fireEvent.click(screen.getByRole('button', { name: 'Tìm mã (Ctrl+K)' }));
    const dialog = screen.getByRole('dialog');

    fireEvent.click(dialog);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
