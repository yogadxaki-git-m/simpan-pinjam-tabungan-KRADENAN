'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Anggota {
  id: number
  nama: string
  nik?: string
  telepon?: string
  alamat?: string
  rt_group?: string
}

interface TransaksiRecord {
  id: number
  id_anggota: number
  id_pertemuan: string
  status_hadir: string
  tabungan_wajib: number
  angsuran_pokok: number
  bayar_jasa: number
  pinjaman_baru: number
  pertemuan?: {
    tanggal: string
  }
}

export default function AnggotaPage() {
  const [daftarAnggota, setDaftarAnggota] = useState<Anggota[]>([])
  const [allTransaksi, setAllTransaksi] = useState<TransaksiRecord[]>([])
  const [userRt, setUserRt] = useState<string>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // State Modal Form (Tambah / Edit)
  const [isModalFormOpen, setIsModalFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'tambah' | 'edit'>('tambah')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [namaInput, setNamaInput] = useState('')
  const [teleponInput, setTeleponInput] = useState('')
  const [alamatInput, setAlamatInput] = useState('')

  // State Modal Konfirmasi Simpel
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [confirmType, setConfirmType] = useState<'simpan' | 'hapus'>('simpan')
  const [targetHapus, setTargetHapus] = useState<Anggota | null>(null)

  // State Modal Detail Rincian Riwayat Transaksi Anggota
  const [isModalDetailOpen, setIsModalDetailOpen] = useState(false)
  const [selectedAnggotaForDetail, setSelectedAnggotaForDetail] = useState<Anggota | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. Fetch Anggota & Semua Transaksi dari Supabase berdasarkan RT
  const fetchData = async (rt: string) => {
    setLoading(true)
    
    // Fetch Anggota
    const { data: dataAnggota } = await supabase
      .from('anggota')
      .select('*')
      .eq('rt_group', rt)
      .order('id', { ascending: true })

    if (dataAnggota) {
      setDaftarAnggota(dataAnggota)
    }

    // Fetch Transaksi beserta tanggal pertemuan
    const { data: dataTrx } = await supabase
      .from('transaksi')
      .select('*, pertemuan:id_pertemuan (tanggal)')
      .eq('rt_group', rt)

    if (dataTrx) {
      setAllTransaksi(dataTrx as any)
    }

    setLoading(false)
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

  // Open Modal Tambah
  const handleOpenTambah = () => {
    setFormMode('tambah')
    setSelectedId(null)
    setNamaInput('')
    setTeleponInput('')
    setAlamatInput('')
    setIsModalFormOpen(true)
  }

  // Open Modal Edit
  const handleOpenEdit = (anggota: Anggota) => {
    setFormMode('edit')
    setSelectedId(anggota.id)
    setNamaInput(anggota.nama)
    setTeleponInput(anggota.telepon === '-' ? '' : anggota.telepon || '')
    setAlamatInput(anggota.alamat === '-' ? '' : anggota.alamat || '')
    setIsModalFormOpen(true)
  }

  // Open Konfirmasi Hapus
  const handleOpenHapus = (anggota: Anggota) => {
    setTargetHapus(anggota)
    setConfirmType('hapus')
    setIsConfirmOpen(true)
  }

  // Open Modal Detail Transaksi Anggota
  const handleOpenDetail = (anggota: Anggota) => {
    setSelectedAnggotaForDetail(anggota)
    setIsModalDetailOpen(true)
  }

  // Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!namaInput.trim()) {
      alert('Nama anggota wajib diisi!')
      return
    }
    setConfirmType('simpan')
    setIsConfirmOpen(true)
  }

  // Eksekusi Simpan / Update ke Supabase
  const executeSimpan = async () => {
    if (formMode === 'tambah') {
      const { data, error } = await supabase
        .from('anggota')
        .insert([
          {
            rt_group: userRt,
            nama: namaInput.trim(),
            telepon: teleponInput.trim() || '-',
            alamat: alamatInput.trim() || '-',
          },
        ])
        .select()

      if (error) {
        alert(`Gagal menyimpan anggota: ${error.message}`)
        return
      }

      if (data && data.length > 0) {
        setDaftarAnggota((prev) => [...prev, data[0]])
      }
    } else if (formMode === 'edit' && selectedId !== null) {
      const { error } = await supabase
        .from('anggota')
        .update({
          nama: namaInput.trim(),
          telepon: teleponInput.trim() || '-',
          alamat: alamatInput.trim() || '-',
        })
        .eq('id', selectedId)

      if (error) {
        alert(`Gagal mengupdate data: ${error.message}`)
        return
      }

      setDaftarAnggota((prev) =>
        prev.map((item) =>
          item.id === selectedId
            ? {
                ...item,
                nama: namaInput.trim(),
                telepon: teleponInput.trim() || '-',
                alamat: alamatInput.trim() || '-',
              }
            : item
        )
      )
    }

    setIsConfirmOpen(false)
    setIsModalFormOpen(false)
  }

  // Eksekusi Hapus dari Supabase
  const executeHapus = async () => {
    if (!targetHapus) return

    const { error } = await supabase
      .from('anggota')
      .delete()
      .eq('id', targetHapus.id)

    if (error) {
      alert(`Gagal menghapus anggota: ${error.message}`)
      return
    }

    setDaftarAnggota((prev) => prev.filter((item) => item.id !== targetHapus.id))
    setTargetHapus(null)
    setIsConfirmOpen(false)
  }

  // Kalkulasi Total Finansial Anggota Tertentu
  const getStatistikAnggota = (idAnggota: number) => {
    const listTrx = allTransaksi.filter((t) => Number(t.id_anggota) === idAnggota)

    const totalTabungan = listTrx.reduce((acc, curr) => acc + (Number(curr.tabungan_wajib) || 0), 0)
    const totalPinjaman = listTrx.reduce((acc, curr) => acc + (Number(curr.pinjaman_baru) || 0), 0)
    const totalAngsuran = listTrx.reduce((acc, curr) => acc + (Number(curr.angsuran_pokok) || 0), 0)
    const totalJasa = listTrx.reduce((acc, curr) => acc + (Number(curr.bayar_jasa) || 0), 0)
    const sisaHutang = Math.max(0, totalPinjaman - totalAngsuran)

    return {
      listTrx,
      totalTabungan,
      totalPinjaman,
      totalAngsuran,
      totalJasa,
      sisaHutang,
      isLunas: totalPinjaman > 0 && sisaHutang === 0,
    }
  }

  // Filter List Anggota
  const filteredAnggota = daftarAnggota.filter(
    (a) =>
      a.nama.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toString().includes(search)
  )

  const detailStat = selectedAnggotaForDetail
    ? getStatistikAnggota(selectedAnggotaForDetail.id)
    : null

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
              Master Data Anggota
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
              {userRt || 'Memuat...'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data anggota & klik nama anggota untuk melihat riwayat mutasi tabungan dan simpan pinjam
          </p>
        </div>

        <button
          onClick={handleOpenTambah}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 self-start md:self-auto"
        >
          <span>+</span> Tambah Anggota Baru
        </button>
      </div>

      {/* Search Bar & Counter */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <input
          type="text"
          placeholder="🔍 Cari nama atau nomor anggota..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
        />
        <div className="text-xs font-semibold text-slate-500 text-right w-full sm:w-auto">
          Total Terdaftar:{' '}
          <strong className="text-emerald-700 font-bold">
            {loading ? 'Memuat...' : `${daftarAnggota.length} Anggota`}
          </strong>
        </div>
      </div>

      {/* 1. TAMPILAN MOBILE (HANYA MUNCUL DI HP / LAYAR KECIL) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
            Memuat data anggota...
          </div>
        ) : filteredAnggota.length > 0 ? (
          filteredAnggota.map((item, index) => {
            const stat = getStatistikAnggota(item.id)

            return (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">#{index + 1}</span>
                    <h4
                      onClick={() => handleOpenDetail(item)}
                      className="text-sm font-extrabold text-slate-800 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
                    >
                      {item.nama}
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                        Buku Kas 📑
                      </span>
                    </h4>
                  </div>
                  <div className="text-right text-[11px]">
                    <span className="text-slate-400 block text-[10px]">Saldo Tabungan</span>
                    <span className="font-bold text-emerald-700">
                      Rp {stat.totalTabungan.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Telepon / WA:</span>
                    <span className="font-semibold text-slate-700">{item.telepon || '-'}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Alamat:</span>
                    <span className="font-semibold text-slate-700">{item.alamat || '-'}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Sisa Hutang:</span>
                    <span className="font-bold text-rose-600">
                      {stat.sisaHutang > 0 ? `Rp ${stat.sisaHutang.toLocaleString('id-ID')}` : '-'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleOpenDetail(item)}
                    className="w-1/2 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors"
                  >
                    👁️ Rincian Kas
                  </button>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="w-1/4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleOpenHapus(item)}
                    className="w-1/4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs italic">
            Belum ada data anggota yang terdaftar di {userRt}.
          </div>
        )}
      </div>

      {/* 2. TAMPILAN DESKTOP (TABEL LEBAR UNTUK LAPTOP / PC) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">NO</th>
                <th className="py-3 px-4 min-w-[160px]">NAMA ANGGOTA</th>
                <th className="py-3 px-4">NO. TELEPON / WA</th>
                <th className="py-3 px-4">ALAMAT</th>
                <th className="py-3 px-4 text-right">TOTAL TABUNGAN</th>
                <th className="py-3 px-4 text-right text-rose-600">SISA HUTANG</th>
                <th className="py-3 px-4 text-center w-36">AKSI</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Memuat data anggota dari Supabase...
                  </td>
                </tr>
              ) : filteredAnggota.length > 0 ? (
                filteredAnggota.map((item, index) => {
                  const stat = getStatistikAnggota(item.id)

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <button
                          onClick={() => handleOpenDetail(item)}
                          className="hover:text-emerald-700 hover:underline text-left flex items-center gap-1.5"
                          title="Klik untuk lihat buku kas dan riwayat transaksi"
                        >
                          {item.nama}
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-normal">
                            Detail 👁️
                          </span>
                        </button>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {item.telepon || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {item.alamat || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        Rp {stat.totalTabungan.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                        {stat.sisaHutang > 0 ? `Rp ${stat.sisaHutang.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-200 transition-colors"
                            title="Lihat Rekap Mutasi Keuangan"
                          >
                            👁️ Rincian
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition-colors"
                            title="Edit Profil"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleOpenHapus(item)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-lg transition-colors border border-rose-200"
                            title="Hapus Anggota"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    Belum ada data anggota yang terdaftar di {userRt}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: RINCIAN MUTASI & BUKU KAS ANGGOTA (FITUR BARU) */}
      {isModalDetailOpen && selectedAnggotaForDetail && detailStat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 uppercase">
                  Buku Kas Anggota
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-800 mt-1">
                  {selectedAnggotaForDetail.nama}
                </h3>
                <p className="text-xs text-slate-400">
                  ID: #{selectedAnggotaForDetail.id} • {selectedAnggotaForDetail.alamat || userRt} • Kontak: {selectedAnggotaForDetail.telepon || '-'}
                </p>
              </div>
              <button
                onClick={() => setIsModalDetailOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {/* Ringkasan Finansial Card Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase">
                    Total Tabungan
                  </span>
                  <p className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">
                    Rp {detailStat.totalTabungan.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-800 block uppercase">
                    Sisa Hutang
                  </span>
                  <p className="text-sm sm:text-base font-black text-rose-700 mt-0.5">
                    Rp {detailStat.sisaHutang.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-blue-800 block uppercase">
                    Status Pinjaman
                  </span>
                  <p className="text-xs font-black mt-1">
                    {detailStat.totalPinjaman === 0 ? (
                      <span className="text-slate-500 font-bold">Tidak Ada Pinjaman</span>
                    ) : detailStat.isLunas ? (
                      <span className="text-emerald-700 font-extrabold">✓ LUNAS</span>
                    ) : (
                      <span className="text-rose-700 font-extrabold">BELUM LUNAS</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Rincian Tambahan */}
              <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">Total Dipinjam</span>
                  <span className="font-extrabold text-slate-800">
                    Rp {detailStat.totalPinjaman.toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">Sudah Dicicil</span>
                  <span className="font-extrabold text-emerald-700">
                    Rp {detailStat.totalAngsuran.toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">Total Jasa 1%</span>
                  <span className="font-extrabold text-amber-700">
                    Rp {detailStat.totalJasa.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Tabel Riwayat Transaksi Per Pertemuan */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">
                  Riwayat Transaksi Per Pertemuan:
                </h4>
                {detailStat.listTrx.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] text-slate-600">
                        <thead className="bg-slate-100 text-slate-700 font-bold text-[9px] uppercase border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Tanggal Pertemuan</th>
                            <th className="py-2 px-2 text-center">Hadir</th>
                            <th className="py-2 px-3 text-right text-emerald-700">Tabungan</th>
                            <th className="py-2 px-3 text-right text-blue-700">Angsuran</th>
                            <th className="py-2 px-3 text-right text-amber-700">Jasa 1%</th>
                            <th className="py-2 px-3 text-right text-rose-600">Pinjam Baru</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailStat.listTrx.map((trx, idx) => (
                            <tr key={trx.id || idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {trx.pertemuan?.tanggal || `Pertemuan ${trx.id_pertemuan}`}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 font-bold">
                                  {trx.status_hadir || 'Hadir'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                {trx.tabungan_wajib ? `Rp ${trx.tabungan_wajib.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                                {trx.angsuran_pokok ? `Rp ${trx.angsuran_pokok.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                                {trx.bayar_jasa ? `Rp ${trx.bayar_jasa.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                                {trx.pinjaman_baru ? `Rp ${trx.pinjaman_baru.toLocaleString('id-ID')}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400 italic">
                    Belum ada riwayat transaksi pertemuan untuk anggota ini.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={() => setIsModalDetailOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FORM (TAMBAH / EDIT ANGGOTA) */}
      {isModalFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                {formMode === 'tambah' ? `Tambah Anggota Baru (${userRt})` : `Edit Anggota (ID: ${selectedId})`}
              </h3>
              <button
                onClick={() => setIsModalFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Anggota *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ibu Siti Rahayu"
                  value={namaInput}
                  onChange={(e) => setNamaInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={teleponInput}
                  onChange={(e) => setTeleponInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat / RT / Dusun
                </label>
                <input
                  type="text"
                  placeholder={`Contoh: ${userRt} Kradenan`}
                  value={alamatInput}
                  onChange={(e) => setAlamatInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalFormOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  {formMode === 'tambah' ? 'Simpan Anggota' : 'Update Anggota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: POP-UP KONFIRMASI */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 sm:p-6 text-center space-y-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl ${
                confirmType === 'hapus'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {confirmType === 'hapus' ? '🗑️' : '📝'}
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                {confirmType === 'hapus'
                  ? 'Konfirmasi Hapus Anggota'
                  : formMode === 'tambah'
                  ? 'Konfirmasi Tambah Anggota'
                  : 'Konfirmasi Perubahan Data'}
              </h4>
              <p className="text-xs text-slate-500 mt-2">
                {confirmType === 'hapus'
                  ? `Apakah Anda yakin ingin menghapus data "${targetHapus?.nama}"? Tindakan ini tidak dapat dibatalkan.`
                  : `Apakah Anda yakin data "${namaInput}" sudah benar dan ingin disimpan?`}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmType === 'hapus' ? executeHapus : executeSimpan}
                className={`w-1/2 py-2.5 text-white text-xs font-bold rounded-xl transition-colors shadow-sm ${
                  confirmType === 'hapus'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmType === 'hapus' ? 'Ya, Hapus Data' : 'Ya, Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}