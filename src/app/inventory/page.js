'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { ArrowUpWideNarrow, Edit, Loader2, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';
import ops from '../../lib/supabase_operations';

const priceFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', quantity: '', price: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
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

  const mapItems = useCallback((data) => (
    (data || []).map((row) => ({
      ...row,
      quantity: row.available_quantity ?? row.quantity ?? 0,
      category: row.category?.name || null,
      company: row.company?.name || null,
    }))
  ), []);

  const fetchItems = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (!supabase) {
        if (!mountedRef.current) return;
        setItems([]);
        setFeedbackMessage({ type: 'error', message: 'Supabase is not configured.' });
        return;
      }

      if (!userId) {
        if (!mountedRef.current) return;
        setItems([]);
        return;
      }

      const { data, error } = await ops.listItems({ userId });
      if (error) throw error;

      if (!mountedRef.current) return;
      setItems(mapItems(data));
    } catch (error) {
      console.error('Error fetching items:', error);
      if (mountedRef.current) {
        setItems([]);
        setFeedbackMessage({ type: 'error', message: 'Failed to load inventory. Please try again.' });
      }
    } finally {
      if (!mountedRef.current) return;
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [mapItems, setFeedbackMessage, userId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading) {
      fetchItems();
    }
    return () => {
      mountedRef.current = false;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [authLoading, fetchItems]);

  const deleteItem = useCallback(async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    if (!supabase) {
      setFeedbackMessage({ type: 'error', message: 'Supabase is not configured.' });
      return;
    }

    if (!userId) {
      setFeedbackMessage({ type: 'error', message: 'You must be signed in to delete items.' });
      return;
    }

    try {
      const response = await ops.deleteItem({ id, userId });
      if (response.error) throw response.error;

      if (!mountedRef.current) return;
      setItems((prev) => prev.filter((item) => item.id !== id));
      setFeedbackMessage({ type: 'success', message: 'Item deleted successfully.' });
    } catch (error) {
      console.error('Error deleting item:', error);
      if (mountedRef.current) {
        setFeedbackMessage({ type: 'error', message: 'Unable to delete item. Please retry.' });
      }
    }
  }, [setFeedbackMessage, userId]);

  const openEditModal = useCallback((item) => {
    setEditingItem(item);
    setEditForm({ name: item.name, quantity: item.quantity, price: item.price });
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingItem(null);
    setEditForm({ name: '', quantity: '', price: '' });
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingItem) return;

    if (!supabase) {
      setFeedbackMessage({ type: 'error', message: 'Supabase is not configured.' });
      return;
    }

    if (!userId) {
      setFeedbackMessage({ type: 'error', message: 'You must be signed in to update items.' });
      return;
    }

    try {
      const quantity = Number.isFinite(Number(editForm.quantity)) ? parseInt(editForm.quantity, 10) : 0;
      const price = Number.isFinite(Number(editForm.price)) ? parseFloat(editForm.price) : 0;

      const response = await ops.updateItem({
        id: editingItem.id,
        userId,
        changes: {
          name: editForm.name.trim(),
          available_quantity: quantity,
          price,
        },
      });
      if (response.error) throw response.error;

      if (!mountedRef.current) return;
      setItems((prev) => prev.map((item) => (
        item.id === editingItem.id
          ? { ...item, name: editForm.name.trim(), quantity, price }
          : item
      )));
      setFeedbackMessage({ type: 'success', message: 'Item updated successfully.' });
      closeEditModal();
    } catch (error) {
      console.error('Error updating item:', error);
      if (mountedRef.current) {
        setFeedbackMessage({ type: 'error', message: 'Unable to update item. Please retry.' });
      }
    }
  }, [closeEditModal, editForm.name, editForm.price, editForm.quantity, editingItem, setFeedbackMessage, userId]);

  const filteredItems = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const list = normalizedTerm
      ? items.filter((item) => item.name?.toLowerCase().includes(normalizedTerm))
      : [...items];

    return list.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'quantity') return (b.quantity ?? 0) - (a.quantity ?? 0);
      if (sortBy === 'price') return (b.price ?? 0) - (a.price ?? 0);
      return 0;
    });
  }, [items, searchTerm, sortBy]);

  const formatDate = useCallback((value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchItems({ silent: true });
  }, [fetchItems]);

  const totalItems = items.length;
  const isEmpty = !loading && filteredItems.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Inventory</h1>
        <div className="mt-2 w-24 border-b-2 border-blue-500" />
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm text-white shadow transition ${
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
          Using mock data. Configure Supabase credentials to manage real inventory records.
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 shadow-lg">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search inventory…"
                aria-label="Search inventory"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative w-full md:w-52">
              <ArrowUpWideNarrow className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort inventory"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-8 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort by name</option>
                <option value="quantity">Sort by quantity</option>
                <option value="price">Sort by price</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 md:justify-end">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-wide text-slate-400">
              Total items
              <span className="ml-2 text-base font-semibold text-white">{totalItems}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing && <Loader2 className="h-4 w-4 animate-spin" />}
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/45 p-6 text-white shadow-xl">
        {loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            <p className="text-sm">Loading inventory…</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/40">
              <table className="w-full table-fixed text-sm text-slate-200">
                <thead className="bg-slate-900/70 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Category</th>
                    <th className="px-4 py-3 text-left font-semibold">Company</th>
                    <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                    <th className="px-4 py-3 text-right font-semibold">Price</th>
                    <th className="px-4 py-3 text-left font-semibold">Date Added</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const rowTone = idx % 2 === 0 ? 'bg-slate-900/35' : 'bg-slate-900/20';
                    const lowStock = (item.quantity ?? 0) < 10;

                    return (
                      <tr
                        key={item.id}
                        className={`${rowTone} border-b border-slate-800/40 text-sm transition-colors hover:bg-slate-800/60`}
                      >
                        <td className="px-4 py-3 text-slate-100">{item.name || 'Unnamed item'}</td>
                        <td className="px-4 py-3 text-slate-300">{item.category || '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{item.company || '—'}</td>
                        <td className={`px-4 py-3 text-right font-medium ${lowStock ? 'text-amber-300' : 'text-slate-200'}`}>
                          {item.quantity ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-200">{priceFormatter.format(item.price ?? 0)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(item.date_added)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Edit item"
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/60 text-slate-200 transition hover:border-blue-500 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteItem(item.id)}
                              title="Delete item"
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-red-200 transition hover:border-red-400 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-4 md:hidden">
              {filteredItems.map((item) => {
                const lowStock = (item.quantity ?? 0) < 10;
                return (
                  <div key={item.id} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-white">{item.name || 'Unnamed item'}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-400">{item.category || 'No category'}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${lowStock ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
                        Qty {item.quantity ?? 0}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                      <div>
                        <p className="text-slate-500">Company</p>
                        <p className="text-sm text-slate-200">{item.company || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Price</p>
                        <p className="text-sm text-slate-200">{priceFormatter.format(item.price ?? 0)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-500">Date added</p>
                        <p className="text-sm text-slate-200">{formatDate(item.date_added)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="flex-1 rounded-lg border border-slate-700/60 bg-slate-900/60 py-2 text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="flex-1 rounded-lg border border-red-500/40 bg-red-500/10 py-2 text-red-200 transition hover:border-red-400 hover:text-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {isEmpty && (
              <div className="mt-8 rounded-xl border border-slate-700/60 bg-slate-900/50 px-6 py-8 text-center text-sm text-slate-300">
                <p>No items found. Try adjusting your search or refresh the inventory.</p>
              </div>
            )}
          </>
        )}
      </div>

      <Modal isOpen={!!editingItem} onClose={closeEditModal}>
        <h2 className="text-xl font-semibold text-white">Edit item</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quantity</label>
            <input
              type="number"
              min="0"
              value={editForm.quantity}
              onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
              className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editForm.price}
              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
              className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeEditModal}
              className="h-10 rounded-lg border border-slate-600 px-4 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="h-10 rounded-lg bg-blue-600 px-5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}