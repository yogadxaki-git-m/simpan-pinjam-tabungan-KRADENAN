'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function DashboardPage() {
  const [userRt, setUserRt] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')

  const [totalAnggota, setTotalAnggota] = useState(0)
  const [totalPertemuan, setTotalPertemuan] = useState(0)
  const [totalTabungan, setTotalTabungan] = useState(0)
  const [totalPinjamanAktif, setTotalPinjamanAktif] = useState(0)
  const [totalJasaKas, setTotalJasaKas] = useState(0)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const rt = user.user_metadata?.rt_group || 'RT 09'
        const name = user.user_metadata?.full_name || 'Pengurus'
        const role = user.user_metadata?.role || 'simpan_pinjam'

        setUserRt(rt)
        setUserName(name)
        setUserRole(role)

        // 1. Hitung total anggota di RT ini
        const { count: countAnggota } = await supabase
          .from('anggota')
          .select('*', { count: 'exact', head: true })
          .eq('rt_group', rt)

        setTotalAnggota(countAnggota || 0)

        // 2. Hitung total pertemuan di RT ini
        const { count: countPertemuan } = await supabase
          .from('pertemuan')
          .select('*', { count: 'exact', head: true })
          .eq('rt_group', rt)

        setTotalPertemuan(countPertemuan || 0)

        // 3. Ambil data agregasi transaksi di RT ini
        const { data: trxList } = await supabase
          .from('transaksi')
          .select('id_anggota, tabungan_wajib, pinjaman_baru, angsuran_pokok, bayar_jasa')
          .eq('rt_group', rt)

        if (trxList) {
          const tabungan = trxList.reduce(
            (acc, curr) => acc + (Number(curr.tabungan_wajib) || 0),
            0
          )
          const jasa = trxList.reduce(
            (acc, curr) => acc + (Number(curr.bayar_jasa) || 0),
            0
          )

          // Hitung sisa pinjaman per anggota secara akurat
          const pinjamanPerAnggota: { [key: string]: { pinjam: number; angsur: number } } = {}
          trxList.forEach((t) => {
            const key = String(t.id_anggota)
            if (!pinjamanPerAnggota[key]) {
              pinjamanPerAnggota[key] = { pinjam: 0, angsur: 0 }
            }
            pinjamanPerAnggota[key].pinjam += Number(t.pinjaman_baru) || 0
            pinjamanPerAnggota[key].angsur += Number(t.angsuran_pokok) || 0
          })

          const sisaUtangTotal = Object.values(pinjamanPerAnggota).reduce(
            (acc, curr) => acc + Math.max(0, curr.pinjam - curr.angsur),
            0
          )

          setTotalTabungan(tabungan)
          setTotalPinjamanAktif(sisaUtangTotal)
          setTotalJasaKas(jasa)
        }
      }
      setLoading(false)
    }
    loadDashboard()
  }, [])

  return (
    <div className="space-y-6">
      {/* Banner Selamat Datang */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-950/40 px-3 py-1 rounded-full text-xs font-semibold text-emerald-200 border border-emerald-600/50">
            <span>Wilayah Operasional:</span>
            <strong className="text-white uppercase">{userRt || 'RT 09'}</strong>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Selamat Datang, {userName}!
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed font-medium">
            Sistem Informasi Simpan Pinjam & Tabungan Kampung Kradenan. Anda login sebagai{' '}
            <strong className="text-white underline">
              {userRole === 'tabungan' ? 'Pengurus Tabungan' : 'Pengurus Simpan Pinjam'}
            </strong>.
          </p>
        </div>
        <div className="absolute right-4 -bottom-6 text-8xl opacity-10 select-none">🏛️</div>
      </div>

      {/* Grid Statistik Keuangan Kas RT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Saldo Tabungan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Kas Tabungan ({userRt})
          </span>
          <p className="text-xl font-black text-emerald-700">
            {loading ? '...' : `Rp ${totalTabungan.toLocaleString('id-ID')}`}
          </p>
          <span className="text-[11px] text-slate-400 font-medium block">
            Tersimpan aman di kas RT
          </span>
        </div>

        {/* Total Sisa Pinjaman Beredar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Pinjaman Belum Lunas
          </span>
          <p className="text-xl font-black text-rose-600">
            {loading ? '...' : `Rp ${totalPinjamanAktif.toLocaleString('id-ID')}`}
          </p>
          <span className="text-[11px] text-slate-400 font-medium block">
            Sisa pokok di anggota
          </span>
        </div>

        {/* Pendapatan Bunga Kas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Pendapatan Jasa / Bunga
          </span>
          <p className="text-xl font-black text-amber-700">
            {loading ? '...' : `Rp ${totalJasaKas.toLocaleString('id-ID')}`}
          </p>
          <span className="text-[11px] text-slate-400 font-medium block">
            Keuntungan kas berjalan
          </span>
        </div>

        {/* Total Anggota */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Anggota Terdaftar
          </span>
          <p className="text-xl font-black text-slate-800">
            {loading ? '...' : `${totalAnggota} Orang`}
          </p>
          <span className="text-[11px] text-slate-400 font-medium block">
            Dari {totalPertemuan} pertemuan
          </span>
        </div>
      </div>

      {/* Menu Navigasi Cepat */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-800">Aksi Cepat Pengurus</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/anggota"
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between"
          >
            <div>
              <h4 className="text-xs font-bold text-slate-800">Master Anggota</h4>
              <p className="text-[11px] text-slate-500">Kelola warga & anggota RT</p>
            </div>
            <span className="text-xl">👥</span>
          </Link>

          <Link
            href="/pertemuan"
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between"
          >
            <div>
              <h4 className="text-xs font-bold text-slate-800">Pertemuan Rutin</h4>
              <p className="text-[11px] text-slate-500">Input kas pertemuan bulanan</p>
            </div>
            <span className="text-xl">📅</span>
          </Link>

          {userRole === 'tabungan' ? (
            <Link
              href="/tabungan"
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-800">Buku Tabungan</h4>
                <p className="text-[11px] text-slate-500">Rekap kas tabungan masuk</p>
              </div>
              <span className="text-xl">💰</span>
            </Link>
          ) : (
            <Link
              href="/simpan-pinjam"
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-800">Buku Simpan Pinjam</h4>
                <p className="text-[11px] text-slate-500">Rekap pinjaman & angsuran</p>
              </div>
              <span className="text-xl">📑</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}