const sizes = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

const LoadingSpinner = ({ size = 'md', message = '', fullScreen = false }) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className={`${sizes[size]} rounded-full border-[3px] border-surface-container-high border-t-primary animate-spin`} />
        <span className="material-symbols-outlined absolute inset-0 m-auto text-primary/40" style={{ fontSize: size === 'sm' ? '12px' : size === 'lg' ? '24px' : '16px' }}>
          progress_activity
        </span>
      </div>
      {message && (
        <p className="text-sm text-on-surface-variant font-medium animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
