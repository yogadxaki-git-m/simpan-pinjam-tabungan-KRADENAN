'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Anggota', href: '/anggota', icon: '👥' },
  { name: 'Pertemuan', href: '/pertemuan', icon: '📅' },
  { name: 'Tabungan Ibu-Ibu', href: '/tabungan', icon: '💰' },
  { name: 'Simpan Pinjam', href: '/simpan-pinjam', icon: '🤝' },
  { name: 'Kas & Tabungan Pemuda', href: '/kas-pemuda', icon: '⚽' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Tombol Header Mobile */}
      <div className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏛️</span>
          <h1 className="font-bold text-base tracking-tight">Koperasi Digital</h1>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 rounded-lg bg-indigo-800 text-xs font-semibold hover:bg-indigo-700 transition"
        >
          {isOpen ? '✕ Tutup' : '☰ Menu'}
        </button>
      </div>

      {/* Overlay Gelap pas Menu Mobile Terbuka */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Utama */}
      <aside className={`
        fixed md:static top-0 left-0 z-50
        h-full w-64 bg-indigo-900 text-white flex flex-col justify-between p-4
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          <div className="mb-8 px-2 hidden md:block">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏛️</span>
              <h1 className="text-xl font-black tracking-wide">Koperasi Digital</h1>
            </div>
            <p className="text-xs text-indigo-300 mt-1">Sistem Informasi Kradenan</p>
          </div>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive 
                      ? 'bg-indigo-700 text-white shadow-sm' 
                      : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-indigo-800 pt-4 px-2 text-xs text-indigo-300 flex items-center justify-between">
          <span>Status Server</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>
      </aside>
    </>
  )
}