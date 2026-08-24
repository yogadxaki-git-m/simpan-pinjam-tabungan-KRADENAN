'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Redirect URL menuju halaman buat password baru
    const redirectUrl = `${window.location.origin}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      setMessage({ type: 'error', text: `Gagal: ${error.message}` })
    } else {
      setMessage({
        type: 'success',
        text: 'Tautan pemulihan password telah dikirim ke email Anda. Silakan periksa kotak masuk/spam.',
      })
      setEmail('')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/80 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-3xl">🔑</span>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">
            Lupa Password?
          </h1>
          <p className="text-xs text-slate-500">
            Masukkan email akun Anda untuk menerima tautan pemulihan kata sandi.
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

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Akun
            </label>
            <input
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
          >
            {loading ? 'Mengirim Tautan...' : 'Kirim Tautan Pemulihan'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <Link
            href="/login"
            className="text-xs font-bold text-slate-500 hover:text-emerald-700 transition"
          >
            ← Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    </div>
  )
}