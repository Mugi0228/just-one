import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
}

export function Input({ label, className = '', id, ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm text-gray-700 font-bold">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`
          rounded-2xl bg-white border-[3px] border-gray-200
          px-4 py-3 text-lg text-gray-800
          placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]
          transition-all duration-150
          font-semibold
          ${className}
        `}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        {...rest}
      />
    </div>
  );
}
