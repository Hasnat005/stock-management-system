"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import ops from '../../lib/supabase_operations';

export default function StockOutPage() {
  const [items, setItems] = useState([]);
  const [rows, setRows] = useState([]); // { item_id, qty, reason }
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [rowsHighlighted, setRowsHighlighted] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const mountedRef = useRef(true);
  const feedbackTimeoutRef = useRef(null);

  const setFeedbackMessage = useCallback((message) => {
    setFeedback(message);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 3500);
  }, []);

  const load = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const [itemsRes, companiesRes, historyRes] = await Promise.all([
        ops.listItems(),
        ops.listCompanies(),
        ops.listRecentStockMovements({ type: 'OUT', limit: 10 }),
      ]);
      if (itemsRes.error) throw itemsRes.error;
      if (companiesRes.error) throw companiesRes.error;
      if (historyRes.error) throw historyRes.error;
      if (!mountedRef.current) return;
      setItems(itemsRes.data || []);
      setCompanies(companiesRes.data || []);
      setHistory(historyRes.data || []);
    } catch (e) {
      console.error('Failed to load stock-out data', e);
      if (mountedRef.current) {
        setFeedbackMessage({ type: 'error', message: 'Unable to load stock-out data. Please retry.' });
      }
    } finally {
      if (mountedRef.current) setHistoryLoading(false);
    }
  }, [setFeedbackMessage]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [load]);

  // temporary inputs for the "Add to grid" form
  const [draftItem, setDraftItem] = useState('');
  const [draftCompany, setDraftCompany] = useState('');
  const [draftQty, setDraftQty] = useState(1);
  const [draftReason, setDraftReason] = useState('Sale');

  const availableSelected = availableFor(draftItem);
  const cannotAdd =
    !draftItem ||
    availableSelected <= 0 ||
    !draftQty ||
    Number.isNaN(Number(draftQty)) ||
    draftQty <= 0 ||
    draftQty > availableSelected;

  function addRow() {
    if (cannotAdd) return;

    const updated = [...rows, {
      item_id: draftItem,
      company_id: draftCompany || null,
      qty: Math.min(parseInt(draftQty, 10), availableSelected),
      reason: draftReason,
    }];
    setRows(updated);
    setDraftQty(1);
    setFeedbackMessage({ type: 'success', message: 'Row added. Review below before committing.' });
  }

  function removeRow(idx) {
    const copy = [...rows];
    copy.splice(idx, 1);
    setRows(copy);
  }

  async function commit() {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      for (const r of rows) {
        if (!r.item_id || r.qty <= 0) throw new Error('Invalid row');
        // ensure qty is a number
        await ops.stockOut(r.item_id, r.company_id || null, parseInt(r.qty, 10), r.reason || 'Sale');
      }
      setFeedbackMessage({ type: 'success', message: 'Stock-out committed successfully.' });
      setRows([]);
      await load();
    } catch (err) {
      console.error('Commit failed', err);
      setFeedbackMessage({ type: 'error', message: 'Commit failed: ' + (err.message || JSON.stringify(err)) });
    } finally {
      setLoading(false);
    }
  }

  function availableFor(item_id) {
    const it = items.find(i => i.id === item_id);
    return it ? it.available_quantity : 0;
  }

  const anyInvalidRow = rows.some((r) => {
    const available = availableFor(r.item_id);
    return !r.item_id || !r.qty || r.qty <= 0 || available <= 0 || r.qty > available;
  });

  const movementDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  useEffect(() => {
    if (!rows.length) return;
    setRowsHighlighted(true);
    const timeout = setTimeout(() => setRowsHighlighted(false), 350);
    return () => clearTimeout(timeout);
  }, [rows]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Stock Out</h1>
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

        <div className="mb-6 grid gap-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="stock-item">Item</label>
            <select
              id="stock-item"
              value={draftItem}
              onChange={(e) => {
                setDraftItem(e.target.value);
                setDraftQty(1);
              }}
              className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an item</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Available</label>
            <div className={`mt-2 flex h-11 items-center justify-between rounded-lg border px-3 text-sm transition-colors ${
              availableSelected <= 0 ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-slate-700 bg-slate-900/80 text-slate-200'
            }`}>
              <span>{availableSelected ?? 0}</span>
              <span className="text-xs text-slate-400">in stock</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="stock-qty">Quantity</label>
            <input
              id="stock-qty"
              type="number"
              min="1"
              placeholder="Units to remove"
              value={draftQty}
              onChange={(e) => setDraftQty(Number(e.target.value))}
              className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="stock-company">Company (optional)</label>
            <select
              id="stock-company"
              value={draftCompany}
              onChange={(e) => setDraftCompany(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="stock-reason" title="Explain why the stock is leaving inventory">
              Reason
            </label>
            <select
              id="stock-reason"
              value={draftReason}
              onChange={(e) => setDraftReason(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Sale</option>
              <option>Damage</option>
              <option>Lost</option>
              <option>Adjustment</option>
            </select>
          </div>

          <div className="flex h-full items-end justify-end">
            <button
              type="button"
              onClick={addRow}
              disabled={cannotAdd}
              className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add to list
            </button>
          </div>
        </div>

        <div
          className={`space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/30 p-4 transition ${rowsHighlighted ? 'ring-1 ring-blue-500/40' : ''}`}
        >
          {rows.length === 0 && (
            <p className="text-sm text-slate-400">No rows queued. Add one above to get started.</p>
          )}

          {rows.map((r, idx) => {
            const item = items.find((i) => i.id === r.item_id) || {};
            const company = companies.find((c) => c.id === r.company_id) || {};
            const available = availableFor(r.item_id);
            const invalid = !r.qty || r.qty <= 0 || available <= 0 || r.qty > available;

            return (
              <div
                key={`${r.item_id}-${idx}`}
                className={`grid gap-3 rounded-lg border px-4 py-3 text-sm transition-colors md:grid-cols-5 ${
                  invalid
                    ? 'border-red-500/40 bg-red-500/5 text-red-200'
                    : 'border-slate-700 bg-slate-900/60 text-slate-200'
                }`}
              >
                <div className="md:col-span-2">
                  <p className="font-semibold text-white">{item.name || '—'}</p>
                  <p className="text-xs text-slate-400">{company.name || 'No company'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Available</span>
                  <span className="font-medium">{available}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Qty</span>
                  <span className="font-medium">{r.qty}</span>
                </div>
                <div className="flex items-center justify-between md:justify-start md:gap-3">
                  <span className="rounded bg-slate-800 px-2 py-1 text-xs capitalize text-slate-200">{r.reason}</span>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={commit}
            disabled={loading || rows.length === 0 || anyInvalidRow}
            className="h-11 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Committing…' : 'Sell / Damage / Lost'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl rounded-2xl border border-slate-700/40 bg-slate-900/40 p-6 text-white shadow-lg backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Recent Stock-Out Activity</h2>
            <p className="text-sm text-slate-400">Latest movements are pulled directly from the database.</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="h-9 rounded-lg border border-slate-700 bg-transparent px-3 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-blue-500 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {historyLoading && <p className="text-sm text-slate-400">Loading activity…</p>}
          {!historyLoading && history.length === 0 && (
            <p className="text-sm text-slate-400">No stock-out movements recorded yet.</p>
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
                <span className="rounded bg-slate-800 px-2 py-1 text-xs capitalize text-slate-200">{entry.reason || '—'}</span>
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
