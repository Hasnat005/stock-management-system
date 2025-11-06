"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../components/AuthProvider';
import ops from '../../lib/supabase_operations';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [creating, setCreating] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const mountedRef = useRef(true);
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { addToast } = useToast();

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setListLoading(true);
      const { data, error } = await ops.listCategories({ userId });
      if (error) throw error;
      if (!mountedRef.current) return;
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to load categories', err);
      if (mountedRef.current) {
        addToast({
          title: 'Load failed',
          description: 'Unable to load categories right now. Please retry.',
          variant: 'error',
        });
      }
    } finally {
      if (mountedRef.current) setListLoading(false);
    }
  }, [addToast, userId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading) {
      load();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [authLoading, load]);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      addToast({
        title: 'Name required',
        description: 'Category name cannot be empty.',
        variant: 'error',
      });
      return;
    }

    setCreating(true);
    try {
      if (!userId) throw new Error('Not authenticated');
      const result = await ops.createCategory({ name: trimmed, userId });
      if (result.error && !result.queued) throw result.error;
      if (!mountedRef.current) return;
      setName('');
      if (result.queued) {
        return;
      }
      addToast({
        title: 'Category added',
        description: `"${trimmed}" is ready to use.`,
      });
      await load();
    } catch (err) {
      console.error('Create failed', err);
      if (mountedRef.current) {
        addToast({
          title: 'Create failed',
          description: `Failed to create category: ${err.message || JSON.stringify(err)}`,
          variant: 'error',
        });
      }
    } finally {
      if (mountedRef.current) setCreating(false);
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditingName(cat.name || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
    setSavingId(null);
  }

  async function saveEdit() {
    const trimmed = editingName.trim();
    if (!trimmed) {
      addToast({
        title: 'Name required',
        description: 'Category name cannot be empty.',
        variant: 'error',
      });
      return;
    }

    setSavingId(editingId);
    try {
      if (!userId) throw new Error('Not authenticated');
      const result = await ops.updateCategory({ id: editingId, name: trimmed, userId });
      if (result.error && !result.queued) throw result.error;
      if (!mountedRef.current) return;
      cancelEdit();
      if (result.queued) {
        return;
      }
      addToast({
        title: 'Category updated',
        description: `"${trimmed}" was updated successfully.`,
      });
      await load();
    } catch (err) {
      console.error('Update failed', err);
      if (mountedRef.current) {
        addToast({
          title: 'Update failed',
          description: `Failed to update category: ${err.message || JSON.stringify(err)}`,
          variant: 'error',
        });
      }
    } finally {
      if (mountedRef.current) setSavingId(null);
    }
  }

  const total = categories.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Categories</h1>
        <div className="mt-2 w-20 border-b-2 border-blue-500" />
      </div>

      <div className="max-w-5xl rounded-2xl border border-slate-700/50 bg-slate-800/80 p-8 text-white shadow-xl backdrop-blur">
        <form onSubmit={handleAdd} className="space-y-6">
          <div className="grid gap-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-6 md:grid-cols-7">
            <div className="md:col-span-5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="category-name">Category name</label>
              <input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Electronics"
                className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? 'Adding…' : 'Add Category'}
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-400">
            Organize your inventory items with clear categories so reports stay meaningful and filters remain quick to apply.
          </p>
        </form>
      </div>

      <div className="max-w-5xl rounded-2xl border border-slate-700/40 bg-slate-900/40 p-6 text-white shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Category Library</h2>
            <p className="text-sm text-slate-400">{total ? `${total} categor${total === 1 ? 'y' : 'ies'} ready to be linked to items.` : 'No categories added yet.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-2 text-sm">
              <span className="block text-xs uppercase tracking-wide text-slate-400">Total categories</span>
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
              Loading categories…
            </div>
          )}

          {!listLoading && categories.length === 0 && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
              Add your first category to classify items across the catalog.
            </div>
          )}

          {!listLoading && categories.map((category) => {
            const displayName = category.name?.trim() || 'Unnamed Category';
            const badge = displayName.slice(0, 1).toUpperCase();
            const isEditing = editingId === category.id;
            const isSaving = savingId === category.id;

            return (
              <div
                key={category.id}
                className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 transition hover:border-blue-500 hover:bg-slate-900"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-lg font-semibold text-blue-200">
                    {badge}
                  </div>

                  <div className="flex-1 space-y-3">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor={`category-edit-${category.id}`}>
                            Edit name
                          </label>
                          <input
                            id={`category-edit-${category.id}`}
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={isSaving}
                            className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-semibold uppercase tracking-wide text-white transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={isSaving}
                            className="h-10 rounded-lg border border-slate-600 px-4 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-base font-semibold text-white">{displayName}</p>
                          <p className="text-xs text-slate-400">Tap edit to rename and keep the catalog clean.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          className="h-9 rounded-lg border border-slate-700/60 px-3 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
