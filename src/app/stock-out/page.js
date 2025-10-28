"use client";

import { useEffect, useRef, useState } from 'react';
import ops from '../../lib/supabase_operations';

export default function StockOutPage() {
  const [items, setItems] = useState([]);
  const [rows, setRows] = useState([]); // { item_id, qty, reason }
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);

  async function load() {
    try {
      const { data: itemsData } = await ops.listItems();
      const { data: compData } = await ops.listCompanies();
      if (!mountedRef.current) return;
      setItems(itemsData || []);
      setCompanies(compData || []);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false };
  }, []);

  // temporary inputs for the "Add to grid" form
  const [draftItem, setDraftItem] = useState('');
  const [draftCompany, setDraftCompany] = useState('');
  const [draftQty, setDraftQty] = useState(1);
  const [draftReason, setDraftReason] = useState('Sale');

  function addRow() {
    if (!draftItem) return alert('Select an item');
    if (!draftQty || parseInt(draftQty) <= 0) return alert('Enter a positive quantity');
    setRows([...rows, { item_id: draftItem, company_id: draftCompany || null, qty: parseInt(draftQty, 10), reason: draftReason }]);
    // reset draft qty to 1
    setDraftQty(1);
  }

  function updateRow(idx, patch) {
    const copy = [...rows];
    copy[idx] = { ...copy[idx], ...patch };
    setRows(copy);
  }

  function removeRow(idx) {
    const copy = [...rows];
    copy.splice(idx, 1);
    setRows(copy);
  }

  async function commit() {
    if (rows.length === 0) return alert('No items to commit');
    setLoading(true);
    try {
      for (const r of rows) {
        if (!r.item_id || r.qty <= 0) throw new Error('Invalid row');
        // ensure qty is a number
        await ops.stockOut(r.item_id, r.company_id || null, parseInt(r.qty, 10), r.reason || 'Sale');
      }
      alert('Stock-out committed');
      setRows([]);
      await load();
    } catch (err) {
      console.error('Commit failed', err);
      alert('Commit failed: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  }

  function availableFor(item_id) {
    const it = items.find(i => i.id === item_id);
    return it ? it.available_quantity : 0;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Stock Out</h1>
      <div className="bg-gray-800 text-white p-6 rounded shadow max-w-3xl">
        <div className="mb-4 grid grid-cols-6 gap-2 items-end">
          <div className="col-span-2">
            <label className="block text-sm text-gray-300">Item</label>
            <select className="mt-1 block w-full p-2 bg-gray-700 rounded border border-gray-600" value={draftItem} onChange={(e) => setDraftItem(e.target.value)}>
              <option value="">-- Select item --</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300">Available</label>
            <div className="mt-1 p-2 bg-gray-900 rounded">{availableFor(draftItem)}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-300">Qty</label>
            <input type="number" min="1" className="mt-1 block w-full p-2 bg-gray-700 rounded border border-gray-600" value={draftQty} onChange={(e) => setDraftQty(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm text-gray-300">Company (opt)</label>
            <select className="mt-1 block w-full p-2 bg-gray-700 rounded border border-gray-600" value={draftCompany} onChange={(e) => setDraftCompany(e.target.value)}>
              <option value="">-- None --</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300">Reason</label>
            <select className="mt-1 block w-full p-2 bg-gray-700 rounded border border-gray-600" value={draftReason} onChange={(e) => setDraftReason(e.target.value)}>
              <option>Sale</option>
              <option>Damage</option>
              <option>Lost</option>
            </select>
          </div>
          <div className="flex items-center">
            <button className="bg-green-600 px-3 py-1 rounded" onClick={addRow}>Add</button>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((r, idx) => {
            const item = items.find(i => i.id === r.item_id) || {};
            const company = companies.find(c => c.id === r.company_id) || {};
            return (
              <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                <div className="col-span-2 p-2 bg-gray-900 rounded">{item.name || '—'}</div>
                <div className="p-2 bg-gray-900 rounded">{company.name || '-'}</div>
                <div className="p-2 bg-gray-900 rounded">Available: {availableFor(r.item_id)}</div>
                <div className="p-2 bg-gray-900 rounded">Qty: {r.qty}</div>
                <div className="p-2 bg-gray-900 rounded">Reason: {r.reason}</div>
                <div>
                  <button className="bg-red-600 px-2 py-1 rounded" onClick={() => removeRow(idx)}>Remove</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <button disabled={loading} className="bg-blue-600 px-4 py-2 rounded" onClick={commit}>{loading ? 'Committing...' : 'Sell/Damage/Lost'}</button>
        </div>
      </div>
    </div>
  );
}
