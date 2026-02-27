interface Props {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        className="modal-box"
        style={{
          background: '#fff',
          borderRadius: 6,
          padding: '24px 28px',
          maxWidth: 360,
          width: '90%',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{ margin: '0 0 20px', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{ borderColor: '#c0392b', color: '#c0392b' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
