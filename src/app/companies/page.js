"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import ops from '../../lib/supabase_operations';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const mountedRef = useRef(true);
  const feedbackTimeoutRef = useRef(null);
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const setFeedbackMessage = useCallback((message) => {
    setFeedback(message);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 3200);
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setListLoading(true);
      const { data, error } = await ops.listCompanies({ userId });
      if (error) throw error;
      if (!mountedRef.current) return;
      setCompanies(data || []);
    } catch (err) {
      console.error('Failed to load companies', err);
      if (mountedRef.current) {
        setFeedbackMessage({ type: 'error', message: 'Unable to load companies right now. Please retry.' });
      }
    } finally {
      if (mountedRef.current) setListLoading(false);
    }
  }, [setFeedbackMessage, userId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading) {
      load();
    }
    return () => {
      mountedRef.current = false;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [authLoading, load]);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFeedbackMessage({ type: 'error', message: 'Company name cannot be empty.' });
      return;
    }

    setLoading(true);
    try {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await ops.createCompany({ name: trimmed, userId });
      if (error) throw error;
      if (!mountedRef.current) return;
      setName('');
      setFeedbackMessage({ type: 'success', message: 'Company added successfully.' });
      await load();
    } catch (err) {
      console.error('Create failed', err);
      if (mountedRef.current) {
        setFeedbackMessage({ type: 'error', message: 'Failed to create company: ' + (err.message || JSON.stringify(err)) });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  const total = companies.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Companies</h1>
        <div className="mt-2 w-20 border-b-2 border-blue-500" />
      </div>

      <div className="max-w-5xl rounded-2xl border border-slate-700/50 bg-slate-800/80 p-8 text-white shadow-xl backdrop-blur">
        {feedback && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm transition-opacity duration-300 ${
              feedback.type === 'error'
                ? 'border-red-500/40 bg-red-500/10 text-red-300'
                : 'border-blue-500/40 bg-blue-500/10 text-blue-200'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-6">
          <div className="grid gap-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-6 md:grid-cols-7">
            <div className="md:col-span-5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="company-name">Company name</label>
              <input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Horizon Wholesale"
                className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Adding…' : 'Add Company'}
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-400">
            Keep your supplier directory current so team members can link stock activity to the right partner.
          </p>
        </form>
      </div>

      <div className="max-w-5xl rounded-2xl border border-slate-700/40 bg-slate-900/40 p-6 text-white shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Directory Overview</h2>
            <p className="text-sm text-slate-400">{total ? `${total} compan${total === 1 ? 'y' : 'ies'} available for assignments.` : 'No companies on file yet.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-2 text-sm">
              <span className="block text-xs uppercase tracking-wide text-slate-400">Total companies</span>
              <span className="text-lg font-semibold text-white">{total}</span>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={listLoading}
              className="h-9 rounded-lg border border-slate-700 bg-transparent px-3 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-blue-500 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {listLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {listLoading && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
              Loading companies…
            </div>
          )}

          {!listLoading && companies.length === 0 && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
              Add your first company to start tracking supplier relationships.
            </div>
          )}

          {!listLoading && companies.map((company) => {
            const displayName = company.name?.trim() || 'Unnamed Company';
            const badge = displayName.slice(0, 1).toUpperCase();

            return (
              <div
                key={company.id}
                className="flex items-center gap-4 rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-4 transition hover:border-blue-500 hover:bg-slate-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-lg font-semibold text-blue-200">
                  {badge}
                </div>
                <div>
                  <p className="text-base font-semibold text-white">{displayName}</p>
                  <p className="text-xs text-slate-400">Linked across stock movements and reporting.</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
