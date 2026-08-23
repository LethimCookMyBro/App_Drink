"use client";

export interface AdminSelectOption {
  value: string;
  label: string;
}

interface AdminSelectProps {
  id: string;
  label?: string;
  ariaLabel?: string;
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/** Styled native select — keyboard/AT behaviour comes from the platform. */
export function AdminSelect({
  id,
  label,
  ariaLabel,
  value,
  options,
  onChange,
  disabled,
  className = "",
}: AdminSelectProps) {
  return (
    <div>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-white/50">
          {label}
        </label>
      ) : null}
      <select
        id={id}
        aria-label={label ? undefined : ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white transition-colors focus:border-primary/60 focus:outline-none disabled:opacity-50 ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#161219]">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
