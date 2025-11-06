'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  Boxes,
  CalendarRange,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCcw,
  Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { listItems } from '../../lib/supabase_operations';
import { useAuth } from '../../components/AuthProvider';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const CURRENCY = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

const MOCK_ITEMS = [
  { id: 'm-1', name: 'Wireless Keyboard', available_quantity: 6, price: 45.99, date_added: '2024-03-21', category: { name: 'Accessories' }, company: { name: 'Orbit Supplies' } },
  { id: 'm-2', name: 'USB-C Hub', available_quantity: 25, price: 29.99, date_added: '2024-03-20', category: { name: 'Connectivity' }, company: { name: 'Vector Imports' } },
  { id: 'm-3', name: 'Laptop Stand', available_quantity: 4, price: 64.5, date_added: '2024-03-19', category: { name: 'Accessories' }, company: { name: 'Orbit Supplies' } },
  { id: 'm-4', name: 'Noise-Cancelling Headset', available_quantity: 14, price: 89.75, date_added: '2024-03-22', category: { name: 'Audio' }, company: { name: 'Soundstate' } },
  { id: 'm-5', name: 'External SSD 1TB', available_quantity: 7, price: 119.0, date_added: '2024-03-17', category: { name: 'Storage' }, company: { name: 'Vector Imports' } },
  { id: 'm-6', name: 'Ergonomic Chair', available_quantity: 2, price: 210.0, date_added: '2024-03-18', category: { name: 'Furniture' }, company: { name: 'Comfort Line' } },
];

const STATUS = {
  IN_STOCK: 'In Stock',
  LOW: 'Low Stock',
  OUT: 'Out of Stock',
};

function coerceQuantity(row) {
  const value = Number(row.available_quantity ?? row.quantity ?? 0);
  if (Number.isNaN(value) || value < 0) return 0;
  return value;
}

function coercePrice(row) {
  const value = Number(row.price ?? 0);
  if (Number.isNaN(value) || value < 0) return 0;
  return value;
}

function deriveStatus(quantity) {
  if (quantity <= 0) return STATUS.OUT;
  if (quantity < 10) return STATUS.LOW;
  return STATUS.IN_STOCK;
}

function withinRange(date, range, start, end) {
  if (!date) return false;
  const today = new Date();
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (range === 'today') {
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    return target.getTime() === startOfDay.getTime();
  }

  if (range === 'this_week') {
    const first = new Date(today);
    const day = first.getDay();
    const diff = first.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(first.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return target >= weekStart && target <= weekEnd;
  }

  if (range === 'this_month') {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(23, 59, 59, 999);
    return target >= monthStart && target <= monthEnd;
  }

  if (range === 'custom' && start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return target >= startDate && target <= endDate;
  }

  return true;
}

export default function Reports() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [dateRange, setDateRange] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [generatedAt, setGeneratedAt] = useState(new Date());

  const mountedRef = useRef(true);
  const feedbackTimeoutRef = useRef(null);
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const setFeedbackMessage = useCallback((message) => {
    setFeedback(message);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 3200);
  }, []);

  const mapRows = useCallback((rows) => (
    (rows || []).map((row) => {
      const quantity = coerceQuantity(row);
      const price = coercePrice(row);
      const totalValue = quantity * price;
      return {
        id: row.id,
        name: row.name || 'Unnamed item',
        quantity,
        price,
        totalValue,
        category: row.category?.name || row.category || 'Uncategorized',
        company: row.company?.name || row.company || 'No supplier',
        dateAdded: row.date_added ? new Date(row.date_added) : null,
        status: deriveStatus(quantity),
      };
    })
  ), []);

  const hydrateMock = useCallback(() => {
    const mapped = mapRows(MOCK_ITEMS);
    setItems(mapped);
    setGeneratedAt(new Date());
    setLoading(false);
  }, [mapRows]);

  const fetchItems = useCallback(async ({ silent = false } = {}) => {
    if (!supabase) {
      hydrateMock();
      return;
    }

    if (!userId) {
      if (!mountedRef.current) return;
      setItems([]);
      setGeneratedAt(new Date());
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await listItems({ userId });
      if (error) throw error;
      if (!mountedRef.current) return;

      setItems(mapRows(data));
      setGeneratedAt(new Date());
    } catch (err) {
      console.error('Error fetching items:', err?.message || err);
      if (mountedRef.current) {
        setFeedbackMessage({ type: 'error', message: 'Failed to load report data. Using fallback values.' });
        hydrateMock();
      }
    } finally {
      if (!mountedRef.current) return;
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [hydrateMock, mapRows, setFeedbackMessage, userId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading) {
      fetchItems();
    }
    return () => {
      mountedRef.current = false;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [authLoading, fetchItems]);

  const categories = useMemo(() => {
    const set = new Set(items.map((item) => item.category));
    return Array.from(set);
  }, [items]);

  const companies = useMemo(() => {
    const set = new Set(items.map((item) => item.company));
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return items
      .filter((item) => {
        if (dateRange === 'custom' && (!customStart || !customEnd)) return true;
        return withinRange(item.dateAdded, dateRange, customStart, customEnd);
      })
      .filter((item) => {
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
        if (companyFilter !== 'all' && item.company !== companyFilter) return false;
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (normalized && !(
          item.name.toLowerCase().includes(normalized) ||
          item.category.toLowerCase().includes(normalized) ||
          item.company.toLowerCase().includes(normalized)
        )) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const { key, direction } = sortConfig;
        const compare = (() => {
          if (key === 'quantity' || key === 'price' || key === 'totalValue') {
            return (a[key] ?? 0) - (b[key] ?? 0);
          }
          if (key === 'dateAdded') {
            const aTime = a.dateAdded ? a.dateAdded.getTime() : 0;
            const bTime = b.dateAdded ? b.dateAdded.getTime() : 0;
            return aTime - bTime;
          }
          return String(a[key] || '').localeCompare(String(b[key] || ''));
        })();

        return direction === 'asc' ? compare : -compare;
      });
  }, [categoryFilter, companyFilter, customEnd, customStart, dateRange, items, searchTerm, sortConfig, statusFilter]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const summary = useMemo(() => {
    const totalItems = filteredItems.length;
    const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockItems = filteredItems.filter((item) => item.status === STATUS.LOW).length;
    const totalValue = filteredItems.reduce((sum, item) => sum + item.totalValue, 0);
    const recentlyUpdated = filteredItems.filter((item) => {
      if (!item.dateAdded) return false;
      const now = new Date();
      const diff = now - item.dateAdded;
      const days = diff / (1000 * 60 * 60 * 24);
      return days <= 7;
    }).length;

    return { totalItems, totalQuantity, lowStockItems, totalValue, recentlyUpdated };
  }, [filteredItems]);

  const categoryTotals = useMemo(() => {
    const map = new Map();
    filteredItems.forEach((item) => {
      map.set(item.category, (map.get(item.category) || 0) + item.quantity);
    });
    return map;
  }, [filteredItems]);

  const barData = useMemo(() => ({
    labels: Array.from(categoryTotals.keys()),
    datasets: [
      {
        label: 'Quantity',
        data: Array.from(categoryTotals.values()),
        backgroundColor: '#3b82f6',
        borderRadius: 8,
      },
    ],
  }), [categoryTotals]);

  const doughnutData = useMemo(() => {
    const labels = Array.from(categoryTotals.keys());
    const data = Array.from(categoryTotals.values());
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: ['#38bdf8', '#a855f7', '#f97316', '#22c55e', '#facc15'],
          borderColor: 'transparent',
        },
      ],
    };
  }, [categoryTotals]);

  const valueOverTime = useMemo(() => {
    const map = new Map();
    filteredItems.forEach((item) => {
      if (!item.dateAdded) return;
      const key = item.dateAdded.toISOString().split('T')[0];
      map.set(key, (map.get(key) || 0) + item.totalValue);
    });
    const dates = Array.from(map.keys()).sort();
    return {
      labels: dates,
      datasets: [
        {
          label: 'Inventory Value',
          data: dates.map((d) => map.get(d)),
          fill: true,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          borderColor: '#3b82f6',
          tension: 0.3,
        },
      ],
    };
  }, [filteredItems]);

  const topProducts = useMemo(() => (
    [...filteredItems]
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
  ), [filteredItems]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const handleExportCsv = useCallback(() => {
    const headers = ['Item Name', 'Category', 'Company', 'Quantity', 'Unit Price', 'Total Value', 'Last Updated', 'Status'];
    const rows = filteredItems.map((item) => ([
      item.name,
      item.category,
      item.company,
      item.quantity,
      item.price,
      item.totalValue,
      item.dateAdded ? DATE_FORMAT.format(item.dateAdded) : '—',
      item.status,
    ]));

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `stock-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedbackMessage({ type: 'success', message: 'CSV export generated.' });
  }, [filteredItems, setFeedbackMessage]);

  const handleExportPdf = useCallback(() => {
    setFeedbackMessage({ type: 'error', message: 'PDF export is not enabled in this demo.' });
  }, [setFeedbackMessage]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleRefresh = useCallback(() => {
    fetchItems({ silent: true });
  }, [fetchItems]);

  const statusBadge = (status) => {
    const base = 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide';
    switch (status) {
      case STATUS.OUT:
        return `${base} border border-red-500/40 bg-red-500/10 text-red-200`;
      case STATUS.LOW:
        return `${base} border border-amber-500/40 bg-amber-500/10 text-amber-200`;
      default:
        return `${base} border border-emerald-500/40 bg-emerald-500/10 text-emerald-200`;
    }
  };

  const summaryCards = [
    {
      title: 'Total items',
      value: summary.totalItems,
      icon: Boxes,
      accent: 'border-blue-500/40 bg-blue-500/10 text-blue-100',
      note: `${categories.length} categories covered`,
    },
    {
      title: 'Total quantity',
      value: summary.totalQuantity,
      icon: BarChart3,
      accent: 'border-slate-500/40 bg-slate-500/10 text-slate-100',
      note: 'All stocked units combined',
    },
    {
      title: 'Low stock items',
      value: summary.lowStockItems,
      icon: AlertTriangle,
      accent: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
      note: `${percentFormatter.format(summary.totalItems ? summary.lowStockItems / summary.totalItems : 0)} of catalog`,
    },
    {
      title: 'Stock value',
      value: CURRENCY.format(summary.totalValue),
      icon: ArrowUpDown,
      accent: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
      note: 'Quantity × Unit Price',
    },
    {
      title: 'Recently updated',
      value: summary.recentlyUpdated,
      icon: RefreshCcw,
      accent: 'border-purple-500/40 bg-purple-500/10 text-purple-100',
      note: 'Updated in the last 7 days',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">Stock Report</h1>
          <p className="text-sm text-slate-400">Inventory intelligence generated {DATE_FORMAT.format(generatedAt)}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
            <CalendarRange className="h-4 w-4 text-slate-400" />
            {DATE_FORMAT.format(generatedAt)}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing && <RefreshCcw className="h-4 w-4 animate-spin" />}
            {refreshing ? 'Refreshing' : 'Generate report'}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm shadow transition ${
            feedback.type === 'error'
              ? 'border-red-500/40 bg-red-500/15 text-red-200'
              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {!supabase && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          Using mock data. Configure Supabase credentials to pull live inventory signals.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-white shadow-xl lg:col-span-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search inventory…"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2">
                <span className="text-slate-400">Date</span>
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-white focus:outline-none"
                >
                  <option value="today">Today</option>
                  <option value="this_week">This week</option>
                  <option value="this_month">This month</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>
              {dateRange === 'custom' && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => {
                      setCustomStart(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                  <span>—</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => {
                      setCustomEnd(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
              <span className="text-xs uppercase tracking-wide text-slate-400">Category</span>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
              <span className="text-xs uppercase tracking-wide text-slate-400">Supplier</span>
              <select
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All suppliers</option>
                {companies.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
              <span className="text-xs uppercase tracking-wide text-slate-400">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All statuses</option>
                {Object.values(STATUS).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-white shadow-xl lg:col-span-4">
          <h2 className="text-lg font-semibold text-white">Export & Share</h2>
          <p className="mt-1 text-sm text-slate-400">Download the current view for stakeholders.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:border-blue-400 hover:text-white"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-blue-200"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-blue-200 sm:col-span-2"
            >
              <Printer className="h-4 w-4" />
              Print report
            </button>
          </div>
          <div className="mt-6 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 text-xs text-slate-400">
            <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-300" /> Exports include the filters applied above.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(({ title, value, icon: Icon, accent, note }) => (
          <div key={title} className={`rounded-2xl border p-6 shadow-xl ${accent}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide opacity-80">{title}</p>
                <p className="mt-3 text-3xl font-semibold">{value}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <Icon className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs opacity-80">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-white shadow-xl">
          <h2 className="text-lg font-semibold text-white">Stock quantity by category</h2>
          <p className="text-sm text-slate-400">Pinpoint categories carrying most of the stock load.</p>
          <div className="mt-6 h-72">
            <Bar
              data={barData}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                  y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-white shadow-xl">
          <h2 className="text-lg font-semibold text-white">Category share</h2>
          <p className="text-sm text-slate-400">Understand how stock splits across product families.</p>
          <div className="mt-6 flex h-72 items-center justify-center">
            <Doughnut
              data={doughnutData}
              options={{
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      color: '#cbd5f5',
                      usePointStyle: true,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-white shadow-xl lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Inventory value over time</h2>
          <p className="text-sm text-slate-400">Track fluctuations in total stock value.</p>
          <div className="mt-6 h-64">
            <Line
              data={valueOverTime}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                  y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8' } },
                },
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-white shadow-xl">
          <h2 className="text-lg font-semibold text-white">Top products by value</h2>
          <p className="text-sm text-slate-400">Highest contributors to inventory worth.</p>
          <div className="mt-5 space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-sm text-slate-400">No data available for current filters.</p>
            ) : (
              topProducts.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Value</p>
                    <p className="text-sm font-semibold text-slate-100">{CURRENCY.format(item.totalValue)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Detailed inventory breakdown</h2>
            <p className="text-sm text-slate-400">Sortable, filterable report ready for export.</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Total results: {filteredItems.length}</span>
            <span>•</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800/60">
          <table className="w-full min-w-[800px] table-fixed text-sm text-slate-200">
            <thead className="bg-slate-900/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {[
                  { key: 'name', label: 'Item Name' },
                  { key: 'category', label: 'Category' },
                  { key: 'company', label: 'Company' },
                  { key: 'quantity', label: 'Quantity', align: 'right' },
                  { key: 'price', label: 'Unit Price', align: 'right' },
                  { key: 'totalValue', label: 'Total Value', align: 'right' },
                  { key: 'dateAdded', label: 'Last Updated' },
                  { key: 'status', label: 'Status' },
                ].map(({ key, label, align }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`px-4 py-3 text-${align || 'left'} font-semibold hover:cursor-pointer hover:text-white`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {label}
                      {sortConfig.key === key && (
                        <ArrowUpDown className={`h-3.5 w-3.5 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    No items match the current filters. Adjust filters or refresh the report.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`${idx % 2 === 0 ? 'bg-slate-900/35' : 'bg-slate-900/20'} border-b border-slate-800/40 text-sm transition-colors hover:bg-slate-800/60`}
                  >
                    <td className="px-4 py-3 text-slate-100">{item.name}</td>
                    <td className="px-4 py-3 text-slate-300">{item.category}</td>
                    <td className="px-4 py-3 text-slate-300">{item.company}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-200">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{CURRENCY.format(item.price)}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{CURRENCY.format(item.totalValue)}</td>
                    <td className="px-4 py-3 text-slate-300">{item.dateAdded ? DATE_FORMAT.format(item.dateAdded) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={statusBadge(item.status)}>{item.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 px-3 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-400 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 px-3 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-400 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
          <p className="text-xs text-slate-500">Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} records</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-white shadow-xl">
        <h2 className="text-lg font-semibold text-white">Advanced insights</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Restock recommendation</p>
            <p className="mt-2 text-sm text-slate-300">{summary.lowStockItems > 0 ? 'Review low stock items and plan replenishment this week.' : 'Inventory levels look healthy.'}</p>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Highest category</p>
            <p className="mt-2 text-sm text-slate-300">{categoryTotals.size ? `${Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0][0]} carries the most stock.` : 'No categories available.'}</p>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Report status</p>
            <p className="mt-2 text-sm text-slate-300">Generated on {DATE_FORMAT.format(generatedAt)} by Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}