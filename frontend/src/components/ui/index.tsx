import React from 'react';
import { clsx } from 'clsx';

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg)] disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<BtnVariant, string> = {
    primary:   'bg-[var(--color-primary)] text-white hover:opacity-90 focus:ring-[var(--color-primary)]',
    secondary: 'bg-[var(--color-surface2)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] focus:ring-white/20',
    ghost:     'bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)] focus:ring-white/20',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2', lg: 'text-base px-6 py-3' };
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}
export function Card({ padding = 'md', className, children, ...props }: CardProps) {
  const pads = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-8' };
  return (
    <div className={clsx('bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl', pads[padding], className)} {...props}>
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps { children: React.ReactNode; color?: string; className?: string }
export function Badge({ children, color = 'var(--color-primary)', className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ background: `${color}22`, color }}>
      {children}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
interface AvatarProps { src?: string; name: string; size?: number; className?: string }
export function Avatar({ src, name, size = 36, className }: AvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (src) return <img src={src} alt={name} width={size} height={size} className={clsx('rounded-full object-cover', className)} style={{ width: size, height: size }} />;
  return (
    <div className={clsx('rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0', className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: 'var(--color-primary)' }}>
      {initials}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={clsx('relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full shadow-2xl', widths[size])}
        onClick={e => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors text-xl leading-none">&times;</button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string }
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, className, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm text-[var(--color-muted)]">{label}</label>}
    <input ref={ref}
      className={clsx('bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]', error && 'border-red-500', className)}
      {...props} />
    {error && <span className="text-xs text-red-400">{error}</span>}
  </div>
));
Input.displayName = 'Input';

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string }
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, className, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm text-[var(--color-muted)]">{label}</label>}
    <textarea ref={ref} rows={3}
      className={clsx('bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] resize-none', className)}
      {...props} />
  </div>
));
Textarea.displayName = 'Textarea';

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; options: { value: string; label: string }[] }
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ label, options, className, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm text-[var(--color-muted)]">{label}</label>}
    <select ref={ref}
      className={clsx('bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50', className)}
      {...props}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
));
Select.displayName = 'Select';

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return <div style={{ width: size, height: size }} className="border-2 border-white/20 border-t-[var(--color-primary)] rounded-full animate-spin" />;
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {icon && <div className="text-[var(--color-muted)] mb-2">{icon}</div>}
      <p className="font-semibold text-[var(--color-text)]">{title}</p>
      {description && <p className="text-sm text-[var(--color-muted)] max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
