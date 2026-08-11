import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Modal from '../../components/Modal';

function ModalHarness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Mở hộp thoại</button>
      <Modal
        isOpen={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        ariaLabel="Hộp thoại kiểm thử"
      >
        <div>
          <button type="button" onClick={() => setOpen(false)}>Nút đầu tiên</button>
        </div>
      </Modal>
    </>
  );
}

describe('Modal user behavior', () => {
  it('announces a dialog and focuses its first control, then restores trigger focus', async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Mở hộp thoại' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'Hộp thoại kiểm thử' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nút đầu tiên' })).toHaveFocus());

    fireEvent.click(screen.getByRole('button', { name: 'Nút đầu tiên' }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('closes on Escape and invokes the caller callback once', async () => {
    const onClose = vi.fn();
    render(<ModalHarness onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
    await screen.findByRole('dialog', { name: 'Hộp thoại kiểm thử' });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Hộp thoại kiểm thử' })).not.toBeInTheDocument());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
