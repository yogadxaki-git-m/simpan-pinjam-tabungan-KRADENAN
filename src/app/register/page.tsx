'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function RegisterPage() {
  const router = useRouter()
  const [namaLengkap, setNamaLengkap] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'simpan_pinjam' | 'tabungan' | 'kas_pemuda'>('simpan_pinjam')
  const [rt, setRt] = useState<'RT 09' | 'RT 10' | 'RT 11' | 'RT 12'>('RT 09')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createBrowserClient(supabaseUrl, supabaseKey)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!supabaseUrl || !supabaseKey) {
      setErrorMessage('Konfigurasi Supabase .env.local belum terpasang!')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: namaLengkap.trim(),
            role: role,
            rt_group: rt, // Menyimpan RT 09 / RT 10 / RT 11 / RT 12
          },
        },
      })

      if (error) {
        setErrorMessage(error.message || 'Registrasi gagal.')
        setLoading(false)
        return
      }

      if (data?.user && data?.user?.identities?.length === 0) {
        setErrorMessage('Email ini sudah terdaftar. Silakan login langsung.')
        setLoading(false)
        return
      }

      setSuccessMessage('Pendaftaran akun berhasil! Mengalihkan ke halaman login...')
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl mx-auto">🏛️</div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-snug tracking-tight">
            Simpan Pinjam, Tabungan & Kas<br />Kampung Kradenan
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Registrasi Akun Pengurus RT / Pemuda
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl font-semibold text-center">
            ⚠️ {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold text-center">
            ✓ {successMessage}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Lengkap Pengurus
            </label>
            <input
              type="text"
              placeholder="Contoh: Mas Budi / Ibu Siti"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
              required
            />
          </div>

          <div className="flex gap-3">
            <div className="w-1/2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Wilayah RT
              </label>
              <select
                value={rt}
                onChange={(e) => setRt(e.target.value as any)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="RT 09">RT 09</option>
                <option value="RT 10">RT 10</option>
                <option value="RT 11">RT 11</option>
                <option value="RT 12">RT 12</option>
                <option value="FKMK">FKMK</option>
              </select>
            </div>

            <div className="w-1/2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Divisi Tugas
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="simpan_pinjam">Simpan Pinjam</option>
                <option value="tabungan">Tabungan Ibu-Ibu</option>
                <option value="kas_pemuda">Kas & Tabungan Pemuda</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Pengurus
            </label>
            <input
              type="email"
              placeholder="pengurus@kradenan.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? 'Mendaftarkan Akun...' : 'Daftar Akun Pengurus'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-bold text-emerald-700 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}