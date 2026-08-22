'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { name: 'Dashboard', href: '/' },
  { name: 'Anggota', href: '/anggota' },
  { name: 'Pertemuan', href: '/pertemuan' },
  { name: 'Tabungan', href: '/tabungan' },
  { name: 'Simpan Pinjam', href: '/simpan-pinjam' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Tombol Header Mobile */}
      <div className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <h1 className="font-bold text-lg">Koperasi Digital</h1>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-md bg-indigo-800 text-xs font-semibold hover:bg-indigo-700 transition"
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
            <h1 className="text-xl font-bold tracking-wide">Koperasi Digital</h1>
            <p className="text-xs text-indigo-300 mt-1">Sistem Informasi KKN</p>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive 
                      ? 'bg-indigo-700 text-white shadow-sm' 
                      : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-indigo-800 pt-4 px-2 text-xs text-indigo-300">
          Status: <span className="text-emerald-400 font-semibold">Online</span>
        </div>
      </aside>
    </>
  )
}