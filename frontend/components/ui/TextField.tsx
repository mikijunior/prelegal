'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

const TextField = forwardRef<HTMLInputElement, Props>(
  ({ label, hint, error, id, className = '', ...rest }, ref) => {
    const inputId = id ?? `tf-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div>
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-slate-600 mb-1"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`w-full text-sm border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-slate-300 ${
            error
              ? 'border-red-400 focus:ring-red-300'
              : 'border-slate-200 focus:ring-slate-400'
          } ${className}`}
          {...rest}
        />
        {error ? (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        ) : hint ? (
          <p className="text-xs text-slate-400 mt-1">{hint}</p>
        ) : null}
      </div>
    );
  },
);
TextField.displayName = 'TextField';

export default TextField;