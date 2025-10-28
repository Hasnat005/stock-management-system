'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Reports() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supabase) {
      fetchItems();
    } else {
      setItems([
        { id: 1, name: 'Item 1', quantity: 10, price: 5.99, date_added: '2023-10-01' },
        { id: 2, name: 'Item 2', quantity: 5, price: 12.49, date_added: '2023-10-02' },
      ]);
      setLoading(false);
    }
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id,name,available_quantity,price,category:categories(name),company:companies(name)')
        .order('date_added', { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map(r => ({
        ...r,
        quantity: r.available_quantity,
        category: r.category?.name || null,
        company: r.company?.name || null,
      }));
      setItems(mapped);
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([
        { id: 1, name: 'Item 1', quantity: 10, price: 5.99, date_added: '2023-10-01' },
        { id: 2, name: 'Item 2', quantity: 5, price: 12.49, date_added: '2023-10-02' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: items.map(item => item.name),
    datasets: [
      {
        label: 'Quantity',
        data: items.map(item => item.quantity),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Value ($)',
        data: items.map(item => item.quantity * item.price),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Inventory Overview',
      },
    },
  };

  if (loading) return <div className="text-white">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Reports</h1>
      {!supabase && (
        <div className="bg-yellow-900 text-yellow-200 p-4 rounded-lg">
          <p>Using mock data. Configure Supabase to use real data.</p>
        </div>
      )}
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow">
        <Bar data={chartData} options={options} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 text-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Summary</h2>
          <p>Total Items: {items.length}</p>
          <p>Total Value: ${items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}</p>
          <p>Low Stock Items: {items.filter(item => item.quantity < 10).length}</p>
        </div>
        <div className="bg-gray-800 text-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Top Items by Value</h2>
          {items
            .sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price))
            .slice(0, 5)
            .map(item => (
              <p key={item.id}>{item.name}: ${(item.quantity * item.price).toFixed(2)}</p>
            ))}
        </div>
      </div>
    </div>
  );
}