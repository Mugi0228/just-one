import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white',
    'border-b-4 border-[var(--color-primary-dark)]',
    'hover:scale-[1.02]',
    'btn-3d',
  ].join(' '),
  secondary: [
    'bg-white hover:bg-gray-50 text-gray-700',
    'border-2 border-gray-200 border-b-4 border-b-gray-300',
    'hover:scale-[1.02]',
    'btn-3d',
  ].join(' '),
};

const disabledStyles =
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:border-b-0 disabled:active:transform-none';

export function Button({
  variant = 'primary',
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`
        rounded-2xl px-6 py-3 text-lg font-extrabold
        transition-all duration-150
        ${disabledStyles}
        ${variantStyles[variant]}
        ${className}
      `}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
