"use client";

import { useEffect, useState } from 'react';
import ops from '../../lib/supabase_operations';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data, error } = await ops.listCompanies();
      if (error) throw error;
      setCompanies(data || []);
    } catch (e) {
      console.error('Failed to load companies', e);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const { error } = await ops.createCompany(name.trim());
      if (error) throw error;
      setName('');
      await load();
    } catch (e) {
      console.error('Create failed', e);
      alert('Failed to create company: ' + (e.message || JSON.stringify(e)));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Companies</h1>
      <div className="bg-gray-800 text-white p-6 rounded shadow max-w-2xl">
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New company" className="flex-1 p-2 rounded bg-gray-700" />
          <button className="bg-blue-600 px-4 rounded">Add</button>
        </form>

        <ul className="space-y-2">
          {companies.map((c) => (
            <li key={c.id} className="p-2 bg-gray-900 rounded">{c.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
