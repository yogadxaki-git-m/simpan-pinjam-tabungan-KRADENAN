'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>('')
  const [userRt, setUserRt] = useState<string>('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserRole(user.user_metadata?.role || 'simpan_pinjam')
      setUserRt(user.user_metadata?.rt_group || 'RT 09')
    }
    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navLinks = [
    { href: '/', label: 'Dashboard', show: true },
    { href: '/anggota', label: 'Anggota', show: true },
    { href: '/pertemuan', label: 'Pertemuan', show: true },
    { href: '/tabungan', label: 'Tabungan', show: userRole === 'tabungan' },
    { href: '/simpan-pinjam', label: 'Simpan Pinjam', show: userRole === 'simpan_pinjam' },
  ]

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col w-full overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-emerald-800 text-white shadow-md w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Info */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight block leading-none">
                Koperasi Kradenan
              </span>
              <span className="text-[10px] text-emerald-200 font-semibold leading-none">
                {userRt}
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks
              .filter((item) => item.show)
              .map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-950/60 text-white shadow-inner'
                        : 'text-emerald-100 hover:bg-emerald-700/60 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
          </nav>

          {/* User Action (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1"
            >
              <span>🚪</span> Keluar
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-emerald-700 rounded-xl focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <span className="text-xl font-bold">✕</span>
            ) : (
              <span className="text-xl font-bold">☰</span>
            )}
          </button>
        </div>

        {/* Mobile Dropdown Nav Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-emerald-900 border-t border-emerald-700/50 px-4 py-3 space-y-1.5">
            {navLinks
              .filter((item) => item.show)
              .map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-950 text-white'
                        : 'text-emerald-100 hover:bg-emerald-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            <div className="pt-2 border-t border-emerald-800">
              <button
                onClick={handleLogout}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>🚪</span> Keluar Akun
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 box-border">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 text-center text-[11px] text-slate-400 font-medium">
        © 2026 Simpan Pinjam & Tabungan Kampung Kradenan • KKN UMY
      </footer>
    </div>
  )
}