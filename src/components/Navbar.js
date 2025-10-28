import Link from 'next/link';
import { Home, Package, Plus, BarChart3 } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6" />
          Stock Management System
        </Link>
        <div className="space-x-4 flex items-center">
          <Link href="/" className="hover:underline flex items-center gap-1">
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <Link href="/inventory" className="hover:underline flex items-center gap-1">
            <Package className="w-4 h-4" />
            Inventory
          </Link>
          <Link href="/add-item" className="hover:underline flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Add Item
          </Link>
          <Link href="/categories" className="hover:underline flex items-center gap-1">
            <Package className="w-4 h-4" />
            Categories
          </Link>
          <Link href="/companies" className="hover:underline flex items-center gap-1">
            <Package className="w-4 h-4" />
            Companies
          </Link>
          <Link href="/reports" className="hover:underline flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            Reports
          </Link>
          <Link href="/stock-in" className="hover:underline flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Stock In
          </Link>
          <Link href="/stock-out" className="hover:underline flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Stock Out
          </Link>
        </div>
      </div>
    </nav>
  );
}