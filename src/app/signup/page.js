"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp } from "../../lib/auth";
import { useAuth } from "../../components/AuthProvider";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectPath = useMemo(() => {
    const param = searchParams?.get("redirect");
    return param && param.startsWith("/") ? param : "/";
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectPath);
    }
  }, [authLoading, user, router, redirectPath]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const { error: signUpError, data } = await signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message ?? "Unable to sign up. Please try again.");
        setSubmitting(false);
        return;
      }

      if (data?.session) {
        router.replace(redirectPath);
        return;
      }

      setSuccess("Account created. Please check your email to confirm your address before logging in.");
      setSubmitting(false);
    } catch (submitError) {
      setError(submitError?.message ?? "Unexpected error. Please try again.");
      setSubmitting(false);
    }
  }, [email, password, confirmation, router, redirectPath]);

  const errorId = "signup-error";
  const successId = "signup-success";

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-sm rounded-3xl border border-white/60 bg-white/95 p-8 shadow-2xl shadow-blue-900/5 backdrop-blur">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-500">Sign Up</p>
          <h1 className="text-3xl font-semibold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500">
            Start monitoring inventory, suppliers, and reports with a secure workspace just for you.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            id={errorId}
            className="mt-6 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 shadow-sm"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            aria-live="polite"
            id={successId}
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 shadow-sm"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200/70 focus:ring-offset-1 focus:ring-offset-white placeholder:text-slate-400"
              placeholder="you@example.com"
              disabled={submitting}
              aria-invalid={Boolean(error)}
              aria-describedby={[error ? errorId : null, success ? successId : null].filter(Boolean).join(" ") || undefined}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200/70 focus:ring-offset-1 focus:ring-offset-white placeholder:text-slate-400"
                placeholder="Create a secure password"
                disabled={submitting}
                aria-invalid={Boolean(error)}
                aria-describedby={[error ? errorId : null, success ? successId : null].filter(Boolean).join(" ") || undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center justify-center rounded-lg px-2 text-slate-500 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmation ? "text" : "password"}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200/70 focus:ring-offset-1 focus:ring-offset-white placeholder:text-slate-400"
                placeholder="Repeat your password"
                disabled={submitting}
                aria-invalid={Boolean(error)}
                aria-describedby={[error ? errorId : null, success ? successId : null].filter(Boolean).join(" ") || undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirmation((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center justify-center rounded-lg px-2 text-slate-500 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                aria-label={showConfirmation ? "Hide confirmation password" : "Show confirmation password"}
              >
                {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-px hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={submitting}
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-600 transition hover:text-blue-500 hover:underline"
          >
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
}
