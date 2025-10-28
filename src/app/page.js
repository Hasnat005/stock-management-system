'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supabase) {
      fetchStats();
    } else {
      // Mock stats
      setStats({ totalItems: 2, lowStockItems: 1, totalValue: '78.47' });
      setLoading(false);
    }
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*');

      if (error) throw error;

      const items = data || [];
      const totalItems = items.length;
      const lowStockItems = items.filter(item => item.quantity < 10).length;
      const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      setStats({ totalItems, lowStockItems, totalValue: totalValue.toFixed(2) });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep defaults
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      {!supabase && (
        <div className="bg-yellow-900 text-yellow-200 p-4 rounded-lg">
          <p>Using mock data. Configure Supabase to use real data.</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 text-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold">Total Items</h2>
          <p className="text-2xl">{stats.totalItems}</p>
        </div>
        <div className="bg-red-800 text-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold">Low Stock Items</h2>
          <p className="text-2xl">{stats.lowStockItems}</p>
          {stats.lowStockItems > 0 && <p className="text-sm mt-2">⚠️ Check inventory</p>}
        </div>
        <div className="bg-gray-800 text-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold">Total Value</h2>
          <p className="text-2xl">${stats.totalValue}</p>
        </div>
      </div>
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="space-x-4">
          <a href="/inventory" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            View Inventory
          </a>
          <a href="/add-item" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Add New Item
          </a>
        </div>
      </div>
    </div>
  );
}
