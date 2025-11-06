"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../components/AuthProvider';
import ops from '../../lib/supabase_operations';

export default function AddItem() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      quantity: 0,
      price: '',
      category_id: '',
      company_id: '',
      reorder_level: 0,
    },
  });

  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
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
    }, 3500);
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setListLoading(true);
      const [{ data: catData, error: catError }, { data: compData, error: compError }] = await Promise.all([
        ops.listCategories({ userId }),
        ops.listCompanies({ userId }),
      ]);
      if (catError) throw catError;
      if (compError) throw compError;
      if (!mountedRef.current) return;
      setCategories(catData || []);
      setCompanies(compData || []);
    } catch (err) {
      console.error('Failed to load categories/companies', err);
      if (mountedRef.current) {
        setFeedbackMessage({ type: 'error', message: 'Unable to load supporting data. Please retry.' });
      }
    } finally {
      if (mountedRef.current) setListLoading(false);
    }
  }, [setFeedbackMessage, userId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading) {
      if (userId) {
        load();
      } else {
        setListLoading(false);
        setCategories([]);
        setCompanies([]);
      }
    }
    return () => {
      mountedRef.current = false;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [authLoading, load, userId]);

  const onSubmit = useCallback(async (data) => {
    try {
      if (!userId) throw new Error('Not authenticated');
      const quantity = Number.isFinite(data.quantity) && data.quantity >= 0 ? data.quantity : 0;
      const reorderLevel = Number.isFinite(data.reorder_level) && data.reorder_level >= 0 ? data.reorder_level : 0;

      const payload = {
        name: data.name.trim(),
        quantity,
        price: parseFloat(data.price),
        category_id: data.category_id || null,
        company_id: data.company_id || null,
        reorder_level: reorderLevel,
        userId,
      };

      if (!payload.name) {
        setFeedbackMessage({ type: 'error', message: 'Name is required.' });
        return;
      }

      const { error } = await ops.createItem(payload);
      if (error) throw error;

      if (!mountedRef.current) return;
      setFeedbackMessage({ type: 'success', message: 'Item added successfully.' });
      reset();
      await load();
    } catch (err) {
      console.error('Error adding item:', err);
      if (mountedRef.current) {
        const message = err?.message || (err?.error && JSON.stringify(err.error)) || JSON.stringify(err);
        setFeedbackMessage({ type: 'error', message: 'Error adding item: ' + message });
      }
    }
  }, [load, reset, setFeedbackMessage, userId]);

  const watchName = watch('name');
  const watchQty = Number(watch('quantity') || 0);
  const watchPrice = Number(watch('price') || 0);
  const watchReorder = Number(watch('reorder_level') || 0);
  const watchCategory = watch('category_id');
  const watchCompany = watch('company_id');

  const categoryLabel = watchCategory
    ? categories.find((c) => c.id === watchCategory)?.name || 'Unknown category'
    : 'Unassigned';
  const companyLabel = watchCompany
    ? companies.find((c) => c.id === watchCompany)?.name || 'Unknown company'
    : 'Unassigned';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Add New Item</h1>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-6 md:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="item-name">Name</label>
              <input
                id="item-name"
                type="text"
                {...register('name', { required: 'Name is required' })}
                className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500/50 bg-red-500/10 focus:border-red-400' : 'border-slate-700 bg-slate-900/80 focus:border-blue-500'
                }`}
                placeholder="e.g. Wireless Keyboard"
              />
              {errors.name && <p className="mt-2 text-xs text-red-300">{errors.name.message}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="item-quantity">Initial quantity</label>
              <input
                id="item-quantity"
                type="number"
                min="0"
                {...register('quantity', { valueAsNumber: true })}
                className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="item-price">Unit price</label>
              <input
                id="item-price"
                type="number"
                step="0.01"
                min="0"
                {...register('price', {
                  required: 'Price is required',
                  min: { value: 0, message: 'Price must be greater than or equal to zero.' },
                })}
                className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? 'border-red-500/50 bg-red-500/10 focus:border-red-400' : 'border-slate-700 bg-slate-900/80 focus:border-blue-500'
                }`}
                placeholder="0.00"
              />
              {errors.price && <p className="mt-2 text-xs text-red-300">{errors.price.message}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="item-reorder">Reorder level</label>
              <input
                id="item-reorder"
                type="number"
                min="0"
                {...register('reorder_level', { valueAsNumber: true })}
                className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="item-category">Category (optional)</label>
              <select
                id="item-category"
                disabled={listLoading || categories.length === 0}
                {...register('category_id')}
                className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="item-company">Company (optional)</label>
              <select
                id="item-company"
                disabled={listLoading || companies.length === 0}
                {...register('company_id')}
                className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-sm text-slate-400">
            Complete the form to introduce a new item into inventory. Link it to a category and company to keep reporting sharp.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Adding…' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>

      <div className="max-w-5xl rounded-2xl border border-slate-700/40 bg-slate-900/40 p-6 text-white shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Current Draft Overview</h2>
            <p className="text-sm text-slate-400">Quick glimpse at the details you are about to save.</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={listLoading}
            className="h-9 rounded-lg border border-slate-700 bg-transparent px-3 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-blue-500 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {listLoading ? 'Refreshing…' : 'Refresh lookups'}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Item name</p>
            <p className="mt-2 text-lg font-semibold text-white">{watchName?.trim() || 'Not set yet'}</p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Category</p>
            <p className="mt-2 text-sm text-slate-200">{categoryLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Company</p>
            <p className="mt-2 text-sm text-slate-200">{companyLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Inventory plan</p>
            <div className="mt-2 space-y-1 text-sm text-slate-200">
              <p>Initial stock: <span className="font-semibold text-white">{Number.isNaN(watchQty) ? 0 : watchQty}</span></p>
              <p>Reorder level: <span className="font-semibold text-white">{Number.isNaN(watchReorder) ? 0 : watchReorder}</span></p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-4 md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Pricing</p>
            <p className="mt-2 text-2xl font-semibold text-white">${Number.isNaN(watchPrice) ? '0.00' : watchPrice.toFixed(2)}</p>
            <p className="mt-2 text-xs text-slate-400">Ensure the price reflects the unit cost before committing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}