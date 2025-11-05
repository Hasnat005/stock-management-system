"use client"

import { useState } from 'react'
import Link from 'next/link';
import { Home, Package, Plus, BarChart3, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const links = (
    <>
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
    </>
  )

  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              <span className="hidden sm:inline">Stock Management System</span>
              <span className="sm:hidden">SMS</span>
            </Link>
          </div>

          {/* desktop links */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {links}
          </div>

          {/* mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setOpen((s) => !s)}
              aria-label="Toggle menu"
              className="p-2 rounded-md hover:bg-gray-800"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* mobile menu panel */}
        {open && (
          <div className="md:hidden mt-2 pb-4 border-t border-gray-800 space-y-2">
            <div className="flex flex-col px-1">
              {links}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}