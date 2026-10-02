import { useEffect, useRef } from 'react';

const ConfirmDialog = ({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      className="backdrop:bg-black/40 bg-transparent rounded-xl p-0 max-w-sm w-full"
    >
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_8px_30px_rgba(164,60,18,0.12)] border border-surface-container/60">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-error-container' : 'bg-primary-container/20'}`}>
            <span className={`material-symbols-outlined text-xl ${danger ? 'text-on-error-container' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {danger ? 'warning' : 'help'}
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface">{title}</h3>
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              danger
                ? 'bg-error text-on-error hover:bg-error/90'
                : 'btn-primary text-on-primary-container'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;
