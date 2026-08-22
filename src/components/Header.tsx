'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, User, Bell, Menu } from 'lucide-react'

interface HeaderProps {
  namaLengkap?: string
  role?: string
  onMenuClick?: () => void
}

export default function Header({ namaLengkap, role, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between transition-all">
      {/* Mobile Menu Button & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-bold text-slate-800 text-sm md:text-base leading-tight">
            Koperasi Digital
          </h2>
          <p className="text-[10px] md:text-xs text-slate-400 font-medium">
            Sistem Administrasi KKN
          </p>
        </div>
      </div>

      {/* Right User Info & Actions */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Notification Icon */}
        <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition hidden sm:block">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
        </button>

        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

        {/* User Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-[2px] shadow-sm">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-bold text-emerald-700 text-xs">
              {namaLengkap ? namaLengkap.charAt(0).toUpperCase() : 'P'}
            </div>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">
              {namaLengkap || 'Pengurus KKN'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium capitalize">
              {role ? role.replace('_', ' ') : 'Pengurus'}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl transition shadow-xs"
          title="Keluar"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Keluar</span>
        </button>
      </div>
    </header>
  )
}