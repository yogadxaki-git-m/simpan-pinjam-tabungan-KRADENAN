'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi password tidak cocok!' })
      return
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password minimal 6 karakter!' })
      return
    }

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setMessage({ type: 'error', text: `Gagal memperbarui password: ${error.message}` })
      setLoading(false)
    } else {
      setMessage({
        type: 'success',
        text: 'Password berhasil diperbarui! Mengalihkan ke halaman login...',
      })
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/80 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-3xl">🔒</span>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">
            Buat Password Baru
          </h1>
          <p className="text-xs text-slate-500">
            Silakan masukkan password baru untuk akun Anda.
          </p>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold text-center border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password Baru
            </label>
            <input
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
          >
            {loading ? 'Menyimpan Password...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  )
}