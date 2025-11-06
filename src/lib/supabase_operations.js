import { supabase } from './supabase';
import { executeWithOfflineSupport } from './offlineQueue';

async function ensureClient() {
  if (!supabase) throw new Error('Supabase client is not configured. Check your .env.local');
}

function assertUserId(userId) {
  if (!userId) {
    throw new Error('User context is required for this operation.');
  }
  return userId;
}

function isMissingUserColumn(error) {
  if (!error) return false;
  const message = String(error.message || '');
  return error.code === '42703' || message.includes('user_id');
}

export async function listCategories({ userId }) {
  await ensureClient();
  assertUserId(userId);
  const base = () => supabase
    .from('categories')
    .select('id,name')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  const fallback = () => supabase
    .from('categories')
    .select('id,name')
    .order('name', { ascending: true });

  const response = await base();
  if (response.error && isMissingUserColumn(response.error)) {
    return fallback();
  }
  return response;
}

export async function createCategory({ name, userId }) {
  await ensureClient();
  assertUserId(userId);
  const action = async () => {
    const response = await supabase.from('categories').insert([{ name, user_id: userId }]);
    if (response.error && isMissingUserColumn(response.error)) {
      return supabase.from('categories').insert([{ name }]);
    }
    return response;
  };
  return executeWithOfflineSupport(action, { description: 'Create category' });
}

export async function updateCategory({ id, name, userId }) {
  await ensureClient();
  assertUserId(userId);
  const action = async () => {
    const response = await supabase.from('categories').update({ name }).eq('id', id).eq('user_id', userId);
    if (response.error && isMissingUserColumn(response.error)) {
      return supabase.from('categories').update({ name }).eq('id', id);
    }
    return response;
  };
  return executeWithOfflineSupport(action, { description: 'Update category' });
}

export async function listCompanies({ userId }) {
  await ensureClient();
  assertUserId(userId);
  const base = () => supabase
    .from('companies')
    .select('id,name')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  const fallback = () => supabase
    .from('companies')
    .select('id,name')
    .order('name', { ascending: true });

  const response = await base();
  if (response.error && isMissingUserColumn(response.error)) {
    return fallback();
  }
  return response;
}

export async function createCompany({ name, userId }) {
  await ensureClient();
  assertUserId(userId);
  const action = async () => {
    const response = await supabase.from('companies').insert([{ name, user_id: userId }]);
    if (response.error && isMissingUserColumn(response.error)) {
      return supabase.from('companies').insert([{ name }]);
    }
    return response;
  };
  return executeWithOfflineSupport(action, { description: 'Create company' });
}

export async function listItems({ userId, filters = {} } = {}) {
  await ensureClient();
  assertUserId(userId);

  const buildQuery = (includeUser) => {
    let query = supabase
      .from('items')
      .select('id,name,available_quantity,price,date_added,reorder_level,category:categories(name),company:companies(name)')
      .order('date_added', { ascending: false });

    if (includeUser) query = query.eq('user_id', userId);
    if (filters.category_id) query = query.eq('category_id', filters.category_id);
    if (filters.company_id) query = query.eq('company_id', filters.company_id);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);
    return query;
  };

  const response = await buildQuery(true);
  if (response.error && isMissingUserColumn(response.error)) {
    return buildQuery(false);
  }
  return response;
}

export async function createItem({ name, quantity, price, category_id, company_id, reorder_level = 0, userId }) {
  await ensureClient();
  assertUserId(userId);
  const basePayload = {
    name,
    available_quantity: quantity,
    price,
    category_id,
    company_id,
    reorder_level,
    user_id: userId,
  };

  const action = async () => {
    const response = await supabase.from('items').insert([
      {
        ...basePayload,
      },
    ]);
    if (response.error && isMissingUserColumn(response.error)) {
      const { user_id, ...fallbackPayload } = basePayload;
      return supabase.from('items').insert([fallbackPayload]);
    }
    return response;
  };
  return executeWithOfflineSupport(action, { description: 'Create item' });
}

export async function updateItem({ id, changes, userId }) {
  await ensureClient();
  assertUserId(userId);

  const payload = { ...changes };
  const action = async () => {
    const response = await supabase
      .from('items')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId);

    if (response.error && isMissingUserColumn(response.error)) {
      return supabase.from('items').update(payload).eq('id', id);
    }

    return response;
  };

  return executeWithOfflineSupport(action, { description: 'Update item' });
}

export async function deleteItem({ id, userId }) {
  await ensureClient();
  assertUserId(userId);

  const action = async () => {
    const response = await supabase
      .from('items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (response.error && isMissingUserColumn(response.error)) {
      return supabase.from('items').delete().eq('id', id);
    }

    return response;
  };

  return executeWithOfflineSupport(action, { description: 'Delete item' });
}

export async function stockIn({ itemId, companyId, quantity, userId }) {
  await ensureClient();
  assertUserId(userId);
  const action = async () => {
    const result = await supabase.rpc('stock_in', {
      p_item: itemId,
      p_company: companyId,
      p_qty: quantity,
      p_user: userId,
    });
    if (result.error && /p_user/i.test(result.error.message || '')) {
      return supabase.rpc('stock_in', {
        p_item: itemId,
        p_company: companyId,
        p_qty: quantity,
      });
    }
    return result;
  };
  return executeWithOfflineSupport(action, { description: 'Stock in item' });
}

export async function stockOut({ itemId, companyId, quantity, reason, userId }) {
  await ensureClient();
  assertUserId(userId);
  const action = async () => {
    const result = await supabase.rpc('stock_out', {
      p_item: itemId,
      p_company: companyId,
      p_qty: quantity,
      p_reason: reason,
      p_user: userId,
    });
    if (result.error && /p_user/i.test(result.error.message || '')) {
      return supabase.rpc('stock_out', {
        p_item: itemId,
        p_company: companyId,
        p_qty: quantity,
        p_reason: reason,
      });
    }
    return result;
  };
  return executeWithOfflineSupport(action, { description: 'Stock out item' });
}

export async function listRecentStockMovements({ type = 'OUT', limit = 10, userId } = {}) {
  await ensureClient();
  assertUserId(userId);
  const buildQuery = (includeUser) => {
    let query = supabase
      .from('stock_movements')
      .select('id,movement_type,quantity,reason,created_at,item:items(name),company:companies(name)')
      .eq('movement_type', type)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (includeUser) query = query.eq('user_id', userId);
    return query;
  };

  const response = await buildQuery(true);
  if (response.error && isMissingUserColumn(response.error)) {
    return buildQuery(false);
  }
  return response;
}

export async function getSalesBetweenDates({ fromIso, toIso, userId }) {
  await ensureClient();
  assertUserId(userId);

  const runQuery = (includeUser) => {
    let query = supabase
    .from('stock_movements')
    .select('id,item_id,quantity,created_at,item:items(name)')
    .eq('movement_type', 'OUT')
    .gte('created_at', fromIso)
    .lte('created_at', toIso)
    .order('created_at', { ascending: true });

    if (includeUser) query = query.eq('user_id', userId);
    return query;
  };

  let response = await runQuery(true);
  if (response.error && isMissingUserColumn(response.error)) {
    response = await runQuery(false);
  }
  if (response.error) throw response.error;

  const { data } = response;

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
  updateItem,
  deleteItem,
  stockIn,
  stockOut,
  listRecentStockMovements,
  getSalesBetweenDates,
};

export default ops;
