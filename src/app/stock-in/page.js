"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import ops from '../../lib/supabase_operations';

export default function StockInPage() {
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
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
    }, 3500);
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setHistoryLoading(true);
      const [itemsRes, companiesRes, historyRes] = await Promise.all([
        ops.listItems({ userId }),
        ops.listCompanies({ userId }),
        ops.listRecentStockMovements({ type: 'IN', limit: 10, userId }),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (companiesRes.error) throw companiesRes.error;
      if (historyRes.error) throw historyRes.error;

      if (!mountedRef.current) return;

      const itemsData = itemsRes.data || [];
      const companiesData = companiesRes.data || [];

      setItems(itemsData);
      setCompanies(companiesData);
      setHistory(historyRes.data || []);

      setSelectedItem((prev) => {
        if (prev && itemsData.some((i) => i.id === prev)) return prev;
        return itemsData[0]?.id ?? '';
      });

      setSelectedCompany((prev) => {
        if (prev === '') return '';
        if (prev && companiesData.some((c) => c.id === prev)) return prev;
        return companiesData[0]?.id ?? '';
      });
    } catch (err) {
      console.error('Failed to load stock-in data', err);
      if (mountedRef.current) {
        setFeedbackMessage({ type: 'error', message: 'Unable to load stock-in data. Please retry.' });
      }
    } finally {
      if (mountedRef.current) setHistoryLoading(false);
    }
  }, [setFeedbackMessage, userId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading) {
      if (userId) {
        load();
      } else {
        setHistoryLoading(false);
        setItems([]);
        setCompanies([]);
        setHistory([]);
      }
    }
    return () => {
      mountedRef.current = false;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [authLoading, load, userId]);

  const movementDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const selected = items.find((i) => i.id === selectedItem) || null;
  const qtyInvalid = !qty || Number.isNaN(Number(qty)) || Number(qty) <= 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedItem) {
      setFeedbackMessage({ type: 'error', message: 'Choose an item before recording stock.' });
      return;
    }
    if (qtyInvalid) {
      setFeedbackMessage({ type: 'error', message: 'Quantity must be greater than zero.' });
      return;
    }

    setLoading(true);
    try {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await ops.stockIn({
        itemId: selectedItem,
        companyId: selectedCompany || null,
        quantity: parseInt(qty, 10),
        userId,
      });
      if (error) throw error;
      if (!mountedRef.current) return;
      setFeedbackMessage({ type: 'success', message: 'Stock-in recorded successfully.' });
      setQty(1);
      await load();
    } catch (err) {
      console.error('Stock-in failed', err);
      if (mountedRef.current) {
        setFeedbackMessage({ type: 'error', message: 'Stock-in failed: ' + (err.message || JSON.stringify(err)) });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  const availabilityState = selected
    ? selected.available_quantity <= (selected.reorder_level ?? 0)
    : false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Stock In</h1>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-6 md:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="stock-in-item">Item</label>
              <select
                id="stock-in-item"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                disabled={items.length === 0}
                className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {items.length === 0 && <option value="">No items found</option>}
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="stock-in-company">Company (optional)</label>
              <select
                id="stock-in-company"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                disabled={companies.length === 0}
                className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="stock-in-qty">Quantity</label>
              <input
                id="stock-in-qty"
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-slate-700/60 bg-slate-900/30 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Available</p>
              <p className="mt-2 text-2xl font-semibold text-white">{selected?.available_quantity ?? '—'}</p>
            </div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Reorder Level</p>
              <p className="mt-2 text-lg text-slate-200">{selected?.reorder_level ?? '—'}</p>
            </div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Company</p>
              <p className="mt-2 text-sm text-slate-200">{selectedCompany ? (companies.find((c) => c.id === selectedCompany)?.name || 'Unknown') : 'Unassigned'}</p>
            </div>
            <div
              className={`rounded-lg border px-4 py-3 ${
                availabilityState
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                  : 'border-emerald-600/40 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              <p className="text-xs uppercase tracking-wide">Inventory Health</p>
              <p className="mt-2 text-sm">
                {selected
                  ? availabilityState
                    ? 'Needs attention — below reorder level'
                    : 'Stock level is healthy'
                  : 'Select an item to see its status'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={loading || qtyInvalid || !selectedItem}
              className="h-11 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Recording…' : 'Record Stock In'}
            </button>
          </div>
        </form>
      </div>

      <div className="max-w-5xl rounded-2xl border border-slate-700/40 bg-slate-900/40 p-6 text-white shadow-lg backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Recent Stock-In Activity</h2>
            <p className="text-sm text-slate-400">Review the latest quantities that were added to inventory.</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={historyLoading}
            className="h-9 rounded-lg border border-slate-700 bg-transparent px-3 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-blue-500 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {historyLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {historyLoading && <p className="text-sm text-slate-400">Loading activity…</p>}
          {!historyLoading && history.length === 0 && (
            <p className="text-sm text-slate-400">No recent stock-in movements recorded yet.</p>
          )}
          {history.map((entry) => (
            <div
              key={entry.id}
              className="grid gap-3 rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm md:grid-cols-5"
            >
              <div className="md:col-span-2">
                <p className="font-semibold text-white">{entry.item?.name || 'Unknown item'}</p>
                <p className="text-xs text-slate-400">{entry.company?.name || 'No company'}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Qty</span>
                <span className="font-medium">{entry.quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Reason</span>
                <span className="rounded bg-slate-800 px-2 py-1 text-xs capitalize text-slate-200">{entry.reason || 'Restock'}</span>
              </div>
              <div className="flex items-center justify-between md:block">
                <span className="text-xs text-slate-400 md:block">{movementDate.format(new Date(entry.created_at))}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
