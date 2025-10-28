'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { Edit, Trash2 } from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', quantity: '', price: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id,name,available_quantity,price,date_added,category:categories(name),company:companies(name)')
        .order('date_added', { ascending: false });

      if (error) throw error;
      // map available_quantity -> quantity for UI compatibility
      const mapped = (data || []).map((r) => ({
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

  const deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    if (!supabase) {
      alert('Supabase not configured.');
      return;
    }

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setItems(items.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item.');
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditForm({ name: item.name, quantity: item.quantity, price: item.price });
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditForm({ name: '', quantity: '', price: '' });
  };

  const saveEdit = async () => {
    if (!supabase) {
      alert('Supabase not configured.');
      return;
    }

    try {
      const { error } = await supabase
        .from('items')
        .update({
          name: editForm.name,
          available_quantity: parseInt(editForm.quantity),
          price: parseFloat(editForm.price),
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      setItems(items.map(item =>
        item.id === editingItem.id
          ? { ...item, name: editForm.name, quantity: parseInt(editForm.quantity), price: parseFloat(editForm.price) }
          : item
      ));
      closeEditModal();
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Error updating item.');
    }
  };

  const filteredItems = items
    .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      if (sortBy === 'price') return b.price - a.price;
      return 0;
    });

  if (loading) return <div className="text-white">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Inventory</h1>
      {!supabase && (
        <div className="bg-yellow-900 text-yellow-200 p-4 rounded-lg">
          <p>Using mock data. Configure Supabase to use real data.</p>
        </div>
      )}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-700 text-white p-2 rounded border border-gray-600"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-gray-700 text-white p-2 rounded border border-gray-600"
        >
          <option value="name">Sort by Name</option>
          <option value="quantity">Sort by Quantity</option>
          <option value="price">Sort by Price</option>
        </select>
      </div>
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow">
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Company</th>
              <th className="text-left p-2">Quantity</th>
              <th className="text-left p-2">Price</th>
              <th className="text-left p-2">Date Added</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="border-b border-gray-600">
                <td className="p-2">{item.name}</td>
                <td className="p-2">{item.category || '-'}</td>
                <td className="p-2">{item.company || '-'}</td>
                <td className={`p-2 ${item.quantity < 10 ? 'text-red-400' : ''}`}>{item.quantity}</td>
                <td className="p-2">${item.price}</td>
                <td className="p-2">{item.date_added}</td>
                <td className="p-2 flex gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <p className="text-center text-gray-400 mt-4">No items in inventory.</p>
        )}
      </div>

      <Modal isOpen={!!editingItem} onClose={closeEditModal}>
        <h2 className="text-xl font-bold mb-4">Edit Item</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="mt-1 block w-full border border-gray-600 rounded-md p-2 bg-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Quantity</label>
            <input
              type="number"
              value={editForm.quantity}
              onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
              className="mt-1 block w-full border border-gray-600 rounded-md p-2 bg-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Price</label>
            <input
              type="number"
              step="0.01"
              value={editForm.price}
              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
              className="mt-1 block w-full border border-gray-600 rounded-md p-2 bg-gray-700 text-white"
            />
          </div>
          {/* category is shown in the table but editing category by name is not supported here */}
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={closeEditModal}
              className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}