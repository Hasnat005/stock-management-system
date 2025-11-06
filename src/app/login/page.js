"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "../../lib/auth";
import { useAuth } from "../../components/AuthProvider";
import { Eye, EyeOff, ShieldCheck, TrendingUp, TimerReset } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
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

    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    try {
      setSubmitting(true);
      const { error: signInError } = await signIn({ email, password });
      if (signInError) {
        setError(signInError.message ?? "Unable to sign in. Please try again.");
        setSubmitting(false);
        return;
      }
      router.replace(redirectPath);
    } catch (submitError) {
      setError(submitError?.message ?? "Unexpected error. Please try again.");
      setSubmitting(false);
    }
  }, [email, password, router, redirectPath]);

  const errorId = "login-error";

  return (
    <div className="relative min-h-screen bg-linear-to-br from-[#040b1f] via-[#0a1736] to-[#142c68] text-slate-100">
      <div className="absolute inset-x-0 top-0 h-52 bg-linear-to-b from-white/10 to-transparent blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col lg:grid lg:grid-cols-[1.05fr_minmax(0,1fr)]">
        <div className="hidden overflow-hidden border-r border-white/10 bg-white/5 px-10 py-16 text-slate-100 backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-200/80">Inventory intelligence</p>
            <h2 className="mt-6 text-4xl font-semibold leading-tight text-white xl:text-[2.8rem]">
              Stay on top of every SKU without breaking your flow.
            </h2>
            <p className="mt-6 max-w-md text-base text-blue-100/80">
              Sign in to unlock real-time dashboards, guided workflows, and proactive alerts that keep stock, suppliers, and teams perfectly in sync.
            </p>
          </div>
          <ul className="mt-10 space-y-4 text-sm text-blue-100/90">
            <li className="flex items-start gap-3">
              <span className="rounded-full bg-blue-500/20 p-2">
                <ShieldCheck className="h-4 w-4 text-blue-200" aria-hidden="true" />
              </span>
              <span>Enterprise-grade security with Supabase Auth and session safeguards.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="rounded-full bg-blue-500/20 p-2">
                <TrendingUp className="h-4 w-4 text-blue-200" aria-hidden="true" />
              </span>
              <span>Actionable analytics the moment you sign in—no manual refreshes.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="rounded-full bg-blue-500/20 p-2">
                <TimerReset className="h-4 w-4 text-blue-200" aria-hidden="true" />
              </span>
              <span>Offline queueing keeps work safe if your connection drops mid-task.</span>
            </li>
          </ul>
          <p className="mt-10 text-xs uppercase tracking-[0.3em] text-blue-200/60">Trusted by growing inventory teams worldwide</p>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-16 pt-20 sm:px-8 md:px-12 lg:px-10 lg:pb-20 lg:pt-24">
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 px-6 py-8 text-slate-900 shadow-2xl shadow-blue-900/10 backdrop-blur sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        <div className="space-y-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-500 sm:text-xs">Sign In</p>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Welcome back</h1>
          <p className="text-sm text-slate-500 sm:text-base">
            Manage your stock levels, suppliers, and insights with a single sign-in.
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

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 sm:space-y-7">
          <div className="space-y-2 sm:space-y-3">
            <label htmlFor="email" className="text-sm font-medium text-slate-700 sm:text-base">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200/70 focus:ring-offset-1 focus:ring-offset-white placeholder:text-slate-400 sm:px-5 sm:py-3.5 sm:text-base"
              placeholder="you@example.com"
              disabled={submitting}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          <div className="space-y-2 sm:space-y-3">
            <label htmlFor="password" className="text-sm font-medium text-slate-700 sm:text-base">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200/70 focus:ring-offset-1 focus:ring-offset-white placeholder:text-slate-400 sm:px-5 sm:py-3.5 sm:text-base"
                placeholder="Enter your password"
                disabled={submitting}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center justify-center rounded-lg px-2 text-slate-500 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:right-4"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-right">
              <Link
                href="/reset-password"
                className="text-sm font-semibold text-blue-600 transition hover:text-blue-500 hover:underline sm:text-base"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-[1.1rem] bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-px hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-blue-300 sm:px-5 sm:py-3.5 sm:text-base"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

            <p className="mt-8 text-center text-sm text-slate-500 sm:text-base">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-blue-600 transition hover:text-blue-500 hover:underline"
              >
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
