"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import ops from '../../lib/supabase_operations';

// uses ops.createItem to persist into normalized items table

export default function AddItem() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      // Use explicit quantity if provided, otherwise fallback to reorder_level
      const payload = {
        name: data.name,
        quantity: (data.quantity !== undefined && data.quantity !== null && data.quantity !== '') ? parseInt(data.quantity) : (data.reorder_level ? parseInt(data.reorder_level) : 0),
        price: parseFloat(data.price),
        category_id: data.category_id || null,
        company_id: data.company_id || null,
        reorder_level: data.reorder_level ? parseInt(data.reorder_level) : 0,
      };

      const { error } = await ops.createItem(payload);
      if (error) throw error;

      alert('Item added successfully!');
      reset();
    } catch (error) {
      console.error('Error adding item:', error);
      const message = error?.message || (error?.error && JSON.stringify(error.error)) || JSON.stringify(error);
      alert('Error adding item. Details: ' + message);
    }
  };



  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data: catData } = await ops.listCategories();
        const { data: compData } = await ops.listCompanies();
        if (!mounted) return;
        setCategories(catData || []);
        setCompanies(compData || []);
      } catch (e) {
        console.error('Failed to load categories/companies', e);
      }
    }
    load();
    return () => { mounted = false };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Add New Item</h1>
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Name</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="mt-1 block w-full border border-gray-600 rounded-md p-2 bg-gray-700 text-white"
              type="text"
            />
            {errors.name && <p className="text-red-400 text-sm">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Quantity (initial stock)</label>
            <input
              {...register('quantity')}
              className="mt-1 block w-full border border-gray-600 rounded-md p-2 bg-gray-700 text-white"
              type="number"
              min="0"
              defaultValue={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Price</label>
            <input
              {...register('price', { required: 'Price is required', min: { value: 0, message: 'Price must be >= 0' } })}
              className="mt-1 block w-full border border-gray-600 rounded-md p-2 bg-gray-700 text-white"
              type="number"
              step="0.01"
            />
            {errors.price && <p className="text-red-400 text-sm">{errors.price.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Category (optional)</label>
            <select
              {...register('category_id')}
              className="mt-1 block w-full border border-gray-600 rounded-md p-2 bg-gray-700 text-white"
            >
              <option value="">-- Select category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Company (optional)</label>
            <select
              {...register('company_id')}
              className="mt-1 block w-full border border-gray-600 rounded-md p-2 bg-gray-700 text-white"
            >
              <option value="">-- Select company --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Reorder Level</label>
            <input
              {...register('reorder_level')}
              className="mt-1 block w-full border border-gray-600 rounded-md p-2 bg-gray-700 text-white"
              type="number"
              defaultValue={0}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      </div>
    </div>
  );
}