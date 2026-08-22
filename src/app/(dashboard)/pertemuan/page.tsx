'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

interface Pertemuan {
  id: string
  code: string
  tanggal: string
  lokasi: string
  rt_group?: string
}

interface TransaksiDetail {
  id_pertemuan: string
  status_hadir: 'Hadir' | 'Izin' | 'Absen'
  tabungan_wajib: number
  tabungan_sukarela: number
  angsuran_pokok: number
  bayar_jasa: number
  is_saved?: boolean
}

export default function PertemuanPage() {
  const [pertemuanList, setPertemuanList] = useState<Pertemuan[]>([])
  const [allTransaksi, setAllTransaksi] = useState<TransaksiDetail[]>([])
  const [userRt, setUserRt] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State Tambah Pertemuan Baru
  const [tanggal, setTanggal] = useState('')
  const [lokasi, setLokasi] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. Ambil Data Pertemuan & Transaksi dari Supabase berdasarkan RT
  const fetchData = async (rt: string) => {
    const { data: dataPertemuan } = await supabase
      .from('pertemuan')
      .select('*')
      .eq('rt_group', rt)
      .order('created_at', { ascending: false })

    if (dataPertemuan) {
      setPertemuanList(dataPertemuan)
    }

    const { data: dataTrx } = await supabase
      .from('transaksi')
      .select('*')
      .eq('rt_group', rt)

    if (dataTrx) {
      setAllTransaksi(dataTrx as any)
    }

    setIsLoaded(true)
  }

  useEffect(() => {
    async function initUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const rt = user?.user_metadata?.rt_group || 'RT 09'
      setUserRt(rt)
      fetchData(rt)
    }
    initUser()
  }, [])

  // 2. Tambah Pertemuan Baru ke Supabase
  const handleTambahPertemuan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tanggal.trim() || !lokasi.trim()) return

    const nextIndex = pertemuanList.length + 1
    const newId = `pert-0${nextIndex}-${Date.now().toString().slice(-4)}`
    const newCode = `PERT-0${nextIndex}`

    const { data, error } = await supabase
      .from('pertemuan')
      .insert([
        {
          id: newId,
          rt_group: userRt,
          code: newCode,
          tanggal: tanggal.trim(),
          lokasi: lokasi.trim(),
        },
      ])
      .select()

    if (error) {
      console.error('Gagal membuat pertemuan di Supabase:', error)
      alert(`Gagal membuat pertemuan baru di Supabase: ${error.message}`)
      return
    }

    if (data && data.length > 0) {
      setPertemuanList([data[0], ...pertemuanList])
    }

    setTanggal('')
    setLokasi('')
    setIsModalOpen(false)
  }

  // FUNGSI SAKTI: Kalkulasi Real-time dari data detail per pertemuan (LOGIKA ASLI)
  const getStatistikPertemuan = (idPertemuan: string) => {
    const details = allTransaksi.filter((t) => t.id_pertemuan === idPertemuan)

    if (!details || details.length === 0) {
      return {
        kehadiran: '-',
        kasMasuk: '-',
        status: 'Akan Datang' as const,
      }
    }

    // Ambil anggota yang sudah dicatat / diisi
    const dicatatList = details.filter(
      (d) => d.is_saved || d.status_hadir === 'Hadir'
    )
    const totalHadir = details.filter((d) => d.status_hadir === 'Hadir').length

    // Hitung Total Kas Masuk (Wajib + Sukarela + Angsuran + Jasa)
    const totalKas = details.reduce(
      (acc, curr) =>
        acc +
        (Number(curr.tabungan_wajib) || 0) +
        (Number(curr.tabungan_sukarela) || 0) +
        (Number(curr.angsuran_pokok) || 0) +
        (Number(curr.bayar_jasa) || 0),
      0
    )

    if (dicatatList.length === 0 && totalKas === 0) {
      return {
        kehadiran: '-',
        kasMasuk: '-',
        status: 'Akan Datang' as const,
      }
    }

    return {
      kehadiran: `${totalHadir}/${details.length} Anggota`,
      kasMasuk: `Rp ${totalKas.toLocaleString('id-ID')}`,
      status: 'Selesai' as const,
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Jadwal & Rekap Pertemuan
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
              {userRt || 'Memuat...'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Agenda Rutin Koperasi, Arisan, & Kas Per Pertemuan (Klik card untuk lihat detail)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            + Pertemuan Baru
          </button>
        </div>
      </div>

      {/* Grid List Pertemuan (Card Interaktif Dynamic) */}
      {!isLoaded ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
          Memuat jadwal pertemuan...
        </div>
      ) : pertemuanList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pertemuanList.map((item) => {
            const stat = getStatistikPertemuan(item.id)

            return (
              <Link
                key={item.id}
                href={`/pertemuan/${item.id}`}
                className="block group"
              >
                <div className="bg-white p-5 rounded-2xl border border-slate-200 group-hover:border-emerald-500 group-hover:shadow-md cursor-pointer transition-all duration-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                      {item.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        stat.status === 'Selesai'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {stat.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                    {item.tanggal}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    📍 {item.lokasi}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        Kehadiran
                      </p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {stat.kehadiran}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        Kas Masuk
                      </p>
                      <p className="text-sm font-extrabold text-emerald-600 mt-0.5">
                        {stat.kasMasuk}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <p className="text-sm font-bold text-slate-700">Belum Ada Jadwal Pertemuan</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Silakan buat agenda pertemuan rutin baru untuk mulai mencatat kehadiran dan kas arisan/koperasi.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            + Pertemuan Baru
          </button>
        </div>
      )}

      {/* MODAL TAMBAH PERTEMUAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                Tambah Pertemuan Baru
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTambahPertemuan} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Pertemuan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 17 Agustus 2026"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lokasi Pertemuan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: POSKO KKN UMY"
                  value={lokasi}
                  onChange={(e) => setLokasi(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                >
                  Simpan Pertemuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}