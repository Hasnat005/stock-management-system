"use client";

import { useEffect, useState } from 'react';
import ops from '../../lib/supabase_operations';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data, error } = await ops.listCategories();
      if (error) throw error;
      setCategories(data || []);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const { error } = await ops.createCategory(name.trim());
      if (error) throw error;
      setName('');
      await load();
    } catch (e) {
      console.error('Create failed', e);
      alert('Failed to create category: ' + (e.message || JSON.stringify(e)));
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditingName(cat.name);
  }

  async function saveEdit() {
    try {
      const { error } = await ops.updateCategory(editingId, editingName.trim());
      if (error) throw error;
      setEditingId(null);
      setEditingName('');
      await load();
    } catch (e) {
      console.error('Update failed', e);
      alert('Failed to update: ' + (e.message || JSON.stringify(e)));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Categories</h1>
      <div className="bg-gray-800 text-white p-6 rounded shadow max-w-2xl">
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" className="flex-1 p-2 rounded bg-gray-700" />
          <button className="bg-blue-600 px-4 rounded">Add</button>
        </form>

        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="p-2 bg-gray-900 rounded">
              {editingId === c.id ? (
                <div className="flex gap-2">
                  <input className="flex-1 p-1 rounded bg-gray-800" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                  <button className="bg-green-600 px-3 rounded" onClick={saveEdit}>Save</button>
                  <button className="bg-gray-600 px-3 rounded" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <div onDoubleClick={() => startEdit(c)} className="cursor-pointer">{c.name}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
