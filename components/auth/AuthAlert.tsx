interface AuthAlertProps {
  variant: 'error' | 'success' | 'info';
  message: string;
}

const styles = {
  error: 'bg-red-50 border-red-300 text-red-700',
  success: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  info: 'bg-lucina-surface border-lucina-rose text-lucina-secondary',
};

const icons = {
  error: '⚠️',
  success: '✓',
  info: 'ℹ️',
};

export function AuthAlert({ variant, message }: AuthAlertProps) {
  return (
    <div className={`p-4 border rounded-xl text-sm flex gap-3 ${styles[variant]}`}>
      <span className="text-lg shrink-0" aria-hidden>{icons[variant]}</span>
      <span>{message}</span>
    </div>
  );
}