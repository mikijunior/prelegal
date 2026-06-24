'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/lib/auth-context';

export default function TopNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSignOut() {
    signOut();
    router.push('/signin');
  }

  return (
    <header className="no-print shrink-0 bg-slate-900 text-white px-6 py-3 flex items-center gap-4">
      <Link href="/" className="font-semibold tracking-tight">
        PreLegal
      </Link>
      <span className="text-slate-500">/</span>
      <Link
        href="/documents"
        className="text-slate-300 text-sm hover:text-white"
      >
        My Documents
      </Link>

      <div className="ml-auto flex items-center gap-3">
        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="text-sm text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              <span>{user.email}</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className="opacity-60"
              >
                <path
                  d="M1 3l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px] py-1 text-sm">
                <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-100">
                  Signed in as {user.email}
                </div>
                <Link
                  href="/documents"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-slate-700 hover:bg-slate-50"
                >
                  My Documents
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}