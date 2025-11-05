import { supabase } from './supabase';

async function ensureClient() {
  if (!supabase) throw new Error('Supabase client is not configured. Check your .env.local');
}

export async function listCategories() {
  await ensureClient();
  return supabase.from('categories').select('id,name').order('name', { ascending: true });
}

export async function createCategory(name) {
  await ensureClient();
  return supabase.from('categories').insert([{ name }]);
}

export async function updateCategory(id, name) {
  await ensureClient();
  return supabase.from('categories').update({ name }).eq('id', id);
}

export async function listCompanies() {
  await ensureClient();
  return supabase.from('companies').select('id,name').order('name', { ascending: true });
}

export async function createCompany(name) {
  await ensureClient();
  return supabase.from('companies').insert([{ name }]);
}

export async function listItems(filters = {}) {
  await ensureClient();
  // include related category and company names
  const q = supabase
    .from('items')
    .select('id,name,available_quantity,price,date_added,reorder_level,category:categories(name),company:companies(name)')
    .order('date_added', { ascending: false });

  if (filters.category_id) q.eq('category_id', filters.category_id);
  if (filters.company_id) q.eq('company_id', filters.company_id);
  if (filters.search) q.ilike('name', `%${filters.search}%`);

  return q;
}

export async function createItem({ name, quantity, price, category_id, company_id, reorder_level = 0 }) {
  await ensureClient();
  return supabase.from('items').insert([{ name, available_quantity: quantity, price, category_id, company_id, reorder_level }]);
}

export async function stockIn(item_id, company_id, qty) {
  await ensureClient();
  return supabase.rpc('stock_in', { p_item: item_id, p_company: company_id, p_qty: qty });
}

export async function stockOut(item_id, company_id, qty, reason) {
  await ensureClient();
  return supabase.rpc('stock_out', { p_item: item_id, p_company: company_id, p_qty: qty, p_reason: reason });
}

export async function listRecentStockMovements({ type = 'OUT', limit = 10 } = {}) {
  await ensureClient();
  return supabase
    .from('stock_movements')
    .select('id,movement_type,quantity,reason,created_at,item:items(name),company:companies(name)')
    .eq('movement_type', type)
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function getSalesBetweenDates(fromIso, toIso) {
  await ensureClient();
  // fetch stock_movements of type OUT with related item names
  const { data, error } = await supabase
    .from('stock_movements')
    .select('id,item_id,quantity,created_at,item:items(name)')
    .eq('movement_type', 'OUT')
    .gte('created_at', fromIso)
    .lte('created_at', toIso)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // aggregate by item
  const agg = {};
  (data || []).forEach((row) => {
    const id = row.item_id;
    const name = row.item?.name || 'Unknown';
    if (!agg[id]) agg[id] = { item_id: id, name, quantity: 0 };
    agg[id].quantity += row.quantity;
  });

  return Object.values(agg);
}

const ops = {
  listCategories,
  createCategory,
  updateCategory,
  listCompanies,
  createCompany,
  listItems,
  createItem,
  stockIn,
  stockOut,
  listRecentStockMovements,
  getSalesBetweenDates,
};

export default ops;
