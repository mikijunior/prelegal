import { HTMLAttributes } from 'react';

export default function Card({
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}
      {...rest}
    />
  );
}