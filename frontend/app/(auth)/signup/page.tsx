'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import TextField from '@/components/ui/TextField';
import { useAuth } from '@/lib/auth-context';

export default function SignUpPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUp(email, password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm p-8">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">
        Create your account
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Drafts you create will be saved to your account.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
      </form>
      <p className="text-xs text-slate-500 text-center mt-6">
        Already have an account?{' '}
        <Link href="/signin" className="text-slate-900 underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}