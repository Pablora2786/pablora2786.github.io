import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  summary: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  open,
  title,
  summary,
  confirmLabel = '确认并签名',
  busy,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h3>{title}</h3>
        <div className="modal-body">{summary}</div>
        <p className="hint">请在钱包中仔细核对后再签名。本站不会代你发送交易。</p>
        <div className="row gap">
          <button className="btn ghost" onClick={onCancel} disabled={busy}>
            取消
          </button>
          <button className="btn primary" onClick={onConfirm} disabled={busy}>
            {busy ? '处理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
