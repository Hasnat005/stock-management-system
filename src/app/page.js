'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Boxes, Loader2, PackageSearch } from 'lucide-react';
import { supabase } from '../lib/supabase';

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const mockItems = [
  { id: 'mock-1', name: 'Wireless Keyboard', available_quantity: 6, price: 45.99, date_added: '2024-01-15', category: 'Accessories' },
  { id: 'mock-2', name: 'USB-C Hub', available_quantity: 18, price: 29.99, date_added: '2024-01-12', category: 'Connectivity' },
  { id: 'mock-3', name: 'Laptop Stand', available_quantity: 3, price: 64.5, date_added: '2024-01-10', category: 'Accessories' },
];

function coerceQuantity(row) {
  const value = Number(row.available_quantity ?? row.quantity ?? 0);
  return Number.isNaN(value) || value < 0 ? 0 : value;
}

function coercePrice(row) {
  const value = Number(row.price ?? 0);
  return Number.isNaN(value) || value < 0 ? 0 : value;
}

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const mountedRef = useRef(true);
  const feedbackTimeoutRef = useRef(null);

  const setFeedbackMessage = useCallback((message) => {
    setFeedback(message);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 3200);
  }, []);

  const computeStats = useCallback((rows) => {
    const totalItems = rows.length;
    const lowStockItems = rows.filter((row) => coerceQuantity(row) < 10).length;
    const totalValue = rows.reduce((sum, row) => sum + coerceQuantity(row) * coercePrice(row), 0);

    return {
      totalItems,
      lowStockItems,
      totalValue,
    };
  }, []);

  const mapRows = useCallback((rows) => (
    (rows || []).map((row) => ({
      ...row,
      quantity: coerceQuantity(row),
      value: coerceQuantity(row) * coercePrice(row),
    }))
  ), []);

  const hydrateMock = useCallback(() => {
    const mapped = mapRows(mockItems);
    setItems(mapped);
    const summary = computeStats(mapped);
    setStats(summary);
    setLoading(false);
  }, [computeStats, mapRows]);

  const fetchStats = useCallback(async ({ silent = false } = {}) => {
    if (!supabase) {
      hydrateMock();
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('items')
        .select('id,name,available_quantity,price,date_added,category:categories(name)')
        .order('date_added', { ascending: false });

      if (error) throw error;
      if (!mountedRef.current) return;

      const mapped = mapRows(data);
      setItems(mapped);
      setStats(computeStats(mapped));
    } catch (err) {
      console.error('Error fetching dashboard data', err);
      if (mountedRef.current) {
        setFeedbackMessage({ type: 'error', message: 'Unable to load dashboard data. Please retry.' });
        setItems([]);
        setStats({ totalItems: 0, lowStockItems: 0, totalValue: 0 });
      }
    } finally {
      if (!mountedRef.current) return;
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [computeStats, hydrateMock, mapRows, setFeedbackMessage]);

  useEffect(() => {
    mountedRef.current = true;
    fetchStats();
    return () => {
      mountedRef.current = false;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [fetchStats]);

  const lowStock = useMemo(() => items.filter((row) => row.quantity < 10).slice(0, 5), [items]);
  const recentlyAdded = useMemo(() => items.slice(0, 5), [items]);
  const lowStockPercentage = stats.totalItems === 0 ? 0 : stats.lowStockItems / stats.totalItems;

  const handleRefresh = useCallback(() => {
    fetchStats({ silent: true });
  }, [fetchStats]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Dashboard</h1>
          <div className="mt-2 w-24 border-b-2 border-blue-500" />
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing && <Loader2 className="h-4 w-4 animate-spin" />}
          {refreshing ? 'Refreshing' : 'Refresh data'}
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm shadow transition ${
            feedback.type === 'error'
              ? 'border-red-500/40 bg-red-500/15 text-red-200'
              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {!supabase && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          Using mock data. Configure Supabase credentials to visualize real-time metrics.
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-32 rounded-2xl border border-slate-800/60 bg-slate-900/40 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-6 text-white shadow-lg backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-200/80">Total items</p>
                <p className="mt-3 text-4xl font-semibold text-white">{stats.totalItems}</p>
              </div>
              <div className="rounded-xl bg-blue-500/30 p-3 text-white">
                <Boxes className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-blue-100/70">Across all categories</p>
          </div>

          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6 text-amber-100 shadow-lg backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-200/80">Low stock items</p>
                <p className="mt-3 text-4xl font-semibold text-white">{stats.lowStockItems}</p>
              </div>
              <div className="rounded-xl bg-amber-500/25 p-3 text-white">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-amber-100/70">{percentFormatter.format(lowStockPercentage || 0)} of catalog below threshold</p>
          </div>

          <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-6 text-emerald-100 shadow-lg backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-200/80">Inventory value</p>
                <p className="mt-3 text-4xl font-semibold text-white">{currencyFormatter.format(stats.totalValue)}</p>
              </div>
              <div className="rounded-xl bg-emerald-500/25 p-3 text-white">
                <PackageSearch className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-emerald-100/70">Based on available quantity × unit price</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Items nearing reorder</h2>
              <p className="text-sm text-slate-400">Keep an eye on low stock before it impacts sales.</p>
            </div>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">Threshold: 10</span>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-16 rounded-xl border border-slate-800/60 bg-slate-900/50 animate-pulse" />
              ))
            ) : lowStock.length === 0 ? (
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-6 text-sm text-slate-300">
                All stocked items look healthy right now.
              </div>
            ) : (
              lowStock.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.category?.name || item.category || 'Uncategorized'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Available</p>
                    <p className="text-base font-semibold text-amber-200">{item.quantity}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-white shadow-xl">
            <h2 className="text-xl font-semibold text-white">Recently added</h2>
            <p className="text-sm text-slate-400">Latest records pulled straight from the inventory.</p>

            <div className="mt-5 space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-14 rounded-xl border border-slate-800/60 bg-slate-900/50 animate-pulse" />
                ))
              ) : recentlyAdded.length === 0 ? (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-4 text-sm text-slate-300">
                  Inventory is empty. Add your first item to get started.
                </div>
              ) : (
                recentlyAdded.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-slate-400">Added {new Date(item.date_added || Date.now()).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Value</p>
                      <p className="text-sm font-semibold text-slate-200">{currencyFormatter.format(item.value ?? 0)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-white shadow-xl">
            <h2 className="text-xl font-semibold text-white">Quick actions</h2>
            <p className="text-sm text-slate-400">Jump straight to common workflows.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/inventory"
                className="group flex items-center justify-between rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:border-blue-400 hover:text-white"
              >
                <span>View inventory</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/add-item"
                className="group flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400 hover:text-white"
              >
                <span>Add new item</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/stock-in"
                className="group flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-blue-200"
              >
                <span>Record stock in</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/stock-out"
                className="group flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-blue-200"
              >
                <span>Record stock out</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
