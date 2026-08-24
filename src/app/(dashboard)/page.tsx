'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function DashboardPage() {
  const [userRt, setUserRt] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')

  // State Statistik Umum RT
  const [totalAnggota, setTotalAnggota] = useState(0)
  const [totalPertemuan, setTotalPertemuan] = useState(0)

  // State Khusus Tabungan RT
  const [totalTabunganRT, setTotalTabunganRT] = useState(0)

  // State Khusus Simpan Pinjam RT
  const [totalPinjamanAktif, setTotalPinjamanAktif] = useState(0)
  const [totalJasaKas, setTotalJasaKas] = useState(0)

  // State Khusus Kas Pemuda
  const [totalMasukSampah, setTotalMasukSampah] = useState(0)
  const [totalKeluarPemuda, setTotalKeluarPemuda] = useState(0)
  const [totalTransaksiPemuda, setTotalTransaksiPemuda] = useState(0)

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
        const uid = user.id
        const rt = user.user_metadata?.rt_group || 'RT 09'
        const name = user.user_metadata?.full_name || 'Pengurus'
        const role = user.user_metadata?.role || 'simpan_pinjam'

        setUserRt(rt)
        setUserName(name)
        setUserRole(role)

        if (role === 'kas_pemuda') {
          // 1. DATA KAS PEMUDA
          const { data: dataKas } = await supabase
            .from('kas_pemuda_transaksi')
            .select('tipe, nominal')
            .eq('user_id', uid)

          if (dataKas) {
            const sumMasuk = dataKas
              .filter((t) => t.tipe === 'masuk')
              .reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0)

            const sumKeluar = dataKas
              .filter((t) => t.tipe === 'keluar')
              .reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0)

            setTotalMasukSampah(sumMasuk)
            setTotalKeluarPemuda(sumKeluar)
            setTotalTransaksiPemuda(dataKas.length)
          }
        } else {
          // 2. DATA ANGGOTA & PERTEMUAN RT (TERISOLASI USER_ID)
          const { count: countAnggota } = await supabase
            .from('anggota')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid)

          setTotalAnggota(countAnggota || 0)

          const { count: countPertemuan } = await supabase
            .from('pertemuan')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid)

          setTotalPertemuan(countPertemuan || 0)

          // 3. DATA TRANSAKSI RT
          const { data: trxList } = await supabase
            .from('transaksi')
            .select('id_anggota, tabungan_wajib, pinjaman_baru, angsuran_pokok, bayar_jasa')
            .eq('user_id', uid)

          if (trxList) {
            // Tabungan Murni
            const tabungan = trxList.reduce(
              (acc, curr) => acc + (Number(curr.tabungan_wajib) || 0),
              0
            )
            setTotalTabunganRT(tabungan)

            // Simpan Pinjam Murni
            if (role === 'simpan_pinjam') {
              const jasa = trxList.reduce(
                (acc, curr) => acc + (Number(curr.bayar_jasa) || 0),
                0
              )

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

              setTotalPinjamanAktif(sisaUtangTotal)
              setTotalJasaKas(jasa)
            }
          }
        }
      }
      setLoading(false)
    }
    loadDashboard()
  }, [])

  const isPemuda = userRole === 'kas_pemuda'
  const isTabungan = userRole === 'tabungan'
  const sisaSaldoPemuda = totalMasukSampah - totalKeluarPemuda

  return (
    <div className="space-y-6">
      {/* Banner Selamat Datang */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden ${
          isPemuda
            ? 'bg-gradient-to-r from-blue-900 to-indigo-800'
            : 'bg-gradient-to-r from-emerald-800 to-emerald-700'
        }`}
      >
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full text-xs font-semibold text-slate-100 border border-white/20">
            <span>Wilayah / Organisasi:</span>
            <strong className="text-white uppercase">{userRt || 'RT 09'}</strong>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Selamat Datang, {userName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
            {isPemuda ? (
              <>
                Sistem Pembukuan Kas Pemuda FKMK Kradenan. Anda login sebagai{' '}
                <strong className="text-amber-300 underline font-extrabold">
                  Pengurus Kas Pemuda
                </strong>.
              </>
            ) : isTabungan ? (
              <>
                Sistem Informasi Tabungan Ibu-Ibu Kampung Kradenan. Anda login sebagai{' '}
                <strong className="text-amber-300 underline font-extrabold">
                  Pengurus Tabungan
                </strong>.
              </>
            ) : (
              <>
                Sistem Informasi Simpan Pinjam Kampung Kradenan. Anda login sebagai{' '}
                <strong className="text-amber-300 underline font-extrabold">
                  Pengurus Simpan Pinjam
                </strong>.
              </>
            )}
          </p>
        </div>
        <div className="absolute right-4 -bottom-6 text-8xl opacity-15 select-none">
          {isPemuda ? '⚽' : '🏛️'}
        </div>
      </div>

      {/* TAMPILAN DASHBOARD: SESUAI ROLE */}
      {isPemuda ? (
        /* 1. DASHBOARD PEMUDA */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Pemasukan Sampah
              </span>
              <p className="text-2xl font-black text-emerald-700">
                {loading ? '...' : `Rp ${totalMasukSampah.toLocaleString('id-ID')}`}
              </p>
              <span className="text-[11px] text-slate-400 font-medium block">
                Dari penjualan sampah & donasi
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Pengeluaran Kas
              </span>
              <p className="text-2xl font-black text-rose-600">
                {loading ? '...' : `Rp ${totalKeluarPemuda.toLocaleString('id-ID')}`}
              </p>
              <span className="text-[11px] text-slate-400 font-medium block">
                Biaya belanja & kegiatan
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Sisa Saldo Kas Bersama
              </span>
              <p className="text-2xl font-black text-indigo-700">
                {loading ? '...' : `Rp ${sisaSaldoPemuda.toLocaleString('id-ID')}`}
              </p>
              <span className="text-[11px] text-slate-400 font-medium block">
                Total {totalTransaksiPemuda} transaksi tercatat
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800">Menu Pengurus Pemuda</h3>
            <Link
              href="/kas-pemuda"
              className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 hover:bg-indigo-100/60 hover:border-indigo-500 transition-all flex items-center justify-between block"
            >
              <div>
                <h4 className="text-sm font-black text-indigo-950">Buka Buku Kas Pemuda</h4>
                <p className="text-xs text-indigo-700 mt-0.5">
                  Kelola pencatatan penjualan sampah, belanja konsumsi, dan export Excel
                </p>
              </div>
              <span className="text-3xl">📖</span>
            </Link>
          </div>
        </div>
      ) : isTabungan ? (
        /* 2. DASHBOARD KHUSUS TABUNGAN (3 KARTU BERSIH TANPA RATA-RATA) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Kas Tabungan ({userRt})
              </span>
              <p className="text-2xl font-black text-emerald-700">
                {loading ? '...' : `Rp ${totalTabunganRT.toLocaleString('id-ID')}`}
              </p>
              <span className="text-[11px] text-slate-400 font-medium block">
                Tersimpan aman di kas tabungan
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Anggota Terdaftar
              </span>
              <p className="text-2xl font-black text-slate-800">
                {loading ? '...' : `${totalAnggota} Orang`}
              </p>
              <span className="text-[11px] text-slate-400 font-medium block">
                Master anggota {userRt}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pertemuan Rutin Terlaksana
              </span>
              <p className="text-2xl font-black text-slate-800">
                {loading ? '...' : `${totalPertemuan} Agenda`}
              </p>
              <span className="text-[11px] text-slate-400 font-medium block">
                Putaran setoran bulanan
              </span>
            </div>
          </div>

          {/* Menu Navigasi Pengurus Tabungan */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800">Aksi Cepat Pengurus Tabungan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/anggota"
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Master Anggota</h4>
                  <p className="text-[11px] text-slate-500">Kelola warga & penabung {userRt}</p>
                </div>
                <span className="text-xl">👥</span>
              </Link>

              <Link
                href="/pertemuan"
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Pertemuan Rutin</h4>
                  <p className="text-[11px] text-slate-500">Input setoran tabungan bulanan</p>
                </div>
                <span className="text-xl">📅</span>
              </Link>

              <Link
                href="/tabungan"
                className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/30 hover:border-emerald-500 hover:bg-emerald-50/60 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Buku Tabungan</h4>
                  <p className="text-[11px] text-emerald-600">Rekap saldo & mutasi tabungan</p>
                </div>
                <span className="text-xl">💰</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* 3. DASHBOARD KHUSUS SIMPAN PINJAM (MURNI PINJAMAN) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pinjaman Belum Lunas
              </span>
              <p className="text-xl font-black text-rose-600">
                {loading ? '...' : `Rp ${totalPinjamanAktif.toLocaleString('id-ID')}`}
              </p>
              <span className="text-[11px] text-slate-400 font-medium block">
                Sisa pokok berjalan di peminjam
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pendapatan Jasa 1%
              </span>
              <p className="text-xl font-black text-amber-700">
                {loading ? '...' : `Rp ${totalJasaKas.toLocaleString('id-ID')}`}
              </p>
              <span className="text-[11px] text-slate-400 font-medium block">
                Keuntungan kas simpan pinjam
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Anggota Terdaftar
              </span>
              <p className="text-xl font-black text-slate-800">
                {loading ? '...' : `${totalAnggota} Orang`}
              </p>
              <span className="text-[11px] text-slate-400 font-medium block">
                Anggota koperasi {userRt}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pertemuan Terlaksana
              </span>
              <p className="text-xl font-black text-slate-800">
                {loading ? '...' : `${totalPertemuan} Agenda`}
              </p>
              <span className="text-[11px] text-slate-400 font-medium block">
                Agenda simpan pinjam
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800">Aksi Cepat Simpan Pinjam</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/anggota"
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Master Anggota</h4>
                  <p className="text-[11px] text-slate-500">Kelola data peminjam {userRt}</p>
                </div>
                <span className="text-xl">👥</span>
              </Link>

              <Link
                href="/pertemuan"
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Pertemuan Rutin</h4>
                  <p className="text-[11px] text-slate-500">Input angsuran pokok & jasa 1%</p>
                </div>
                <span className="text-xl">📅</span>
              </Link>

              <Link
                href="/simpan-pinjam"
                className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/30 hover:border-emerald-500 hover:bg-emerald-50/60 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Buku Simpan Pinjam</h4>
                  <p className="text-[11px] text-emerald-600">Rekap pinjaman, cicilan & jasa</p>
                </div>
                <span className="text-xl">📑</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}