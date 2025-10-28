"use client";

import { useEffect, useRef, useState } from 'react';
import ops from '../../lib/supabase_operations';

export default function StockInPage() {
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);

  // load helper (hoisted so other handlers can call it)
  async function load() {
    try {
      const { data: itemsData } = await ops.listItems();
      const { data: compData } = await ops.listCompanies();
      if (!mountedRef.current) return;
      setItems(itemsData || []);
      setCompanies(compData || []);
      if ((itemsData || []).length > 0 && !selectedItem) setSelectedItem(itemsData[0].id);
      if ((compData || []).length > 0 && !selectedCompany) setSelectedCompany(compData[0].id);
    } catch (e) {
      console.error('Failed to load items/companies', e);
    }
  }

  // load once on mount
  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedItem || qty <= 0) return alert('Select item and enter a positive quantity');
    setLoading(true);
    try {
      const { error } = await ops.stockIn(selectedItem, selectedCompany || null, parseInt(qty));
      if (error) throw error;
      alert('Stock-in recorded');
      setQty(1);
      await load();
    } catch (err) {
      console.error('Stock-in failed', err);
      alert('Stock-in failed: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  }

  const selItem = items.find(i => i.id === selectedItem) || {};

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Stock In</h1>
      <div className="bg-gray-800 text-white p-6 rounded shadow max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300">Item</label>
            <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} className="mt-1 block w-full p-2 bg-gray-700 rounded border border-gray-600">
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300">Available</label>
              <div className="mt-1 p-2 bg-gray-900 rounded">{selItem.available_quantity ?? '-'}</div>
            </div>
            <div>
              <label className="block text-sm text-gray-300">Reorder Level</label>
              <div className="mt-1 p-2 bg-gray-900 rounded">{selItem.reorder_level ?? '-'}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300">Company (optional)</label>
            <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="mt-1 block w-full p-2 bg-gray-700 rounded border border-gray-600">
              <option value="">-- None --</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300">Quantity</label>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1 block w-full p-2 bg-gray-700 rounded border border-gray-600" />
          </div>

          <div>
            <button disabled={loading} className="bg-blue-600 px-4 py-2 rounded">{loading ? 'Saving...' : 'Save Stock In'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
