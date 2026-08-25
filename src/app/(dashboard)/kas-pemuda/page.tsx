'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface TransaksiKas {
  id: number
  tanggal: string
  tipe: 'masuk' | 'keluar'
  kategori: string
  nominal: number
  keterangan: string
}

interface AlertToast {
  type: 'success' | 'error' | 'info'
  message: string
}

export default function KasPemudaPage() {
  const [transaksiList, setTransaksiList] = useState<TransaksiKas[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'semua' | 'masuk' | 'keluar'>('semua')

  const [userId, setUserId] = useState('')
  const [userRt, setUserRt] = useState('FKMK')
  const [alertInfo, setAlertInfo] = useState<AlertToast | null>(null)

  // State Modal (Tambah & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formTipe, setFormTipe] = useState<'masuk' | 'keluar'>('masuk')
  const [formKategori, setFormKategori] = useState('')
  const [formTanggal, setFormTanggal] = useState('')
  const [formNominalDisplay, setFormNominalDisplay] = useState('')
  const [formKeterangan, setFormKeterangan] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlertInfo({ type, message })
    setTimeout(() => setAlertInfo(null), 3500)
  }

  const formatRupiah = (val: string | number) => {
    if (!val && val !== 0) return ''
    const num = val.toString().replace(/[^0-9]/g, '')
    if (!num) return ''
    return parseInt(num, 10).toLocaleString('id-ID')
  }

  const parseRawNumber = (val: string) => {
    return parseFloat(val.toString().replace(/[^0-9]/g, '')) || 0
  }

  // Load Data Khusus User yang Login
  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const uid = user.id
    const rt = user.user_metadata?.rt_group || 'FKMK'
    setUserId(uid)
    setUserRt(rt)

    // KUNCI HANYA BERDASARKAN user_id (Biar tidak tabrakan antar akun)
    const { data, error } = await supabase
      .from('kas_pemuda_transaksi')
      .select('*')
      .eq('user_id', uid)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      showAlert('error', `Gagal memuat data: ${error.message}`)
    } else if (data) {
      setTransaksiList(
        data.map((t) => ({
          id: t.id,
          tanggal: t.tanggal,
          tipe: t.tipe as 'masuk' | 'keluar',
          kategori: t.kategori,
          nominal: Number(t.nominal) || 0,
          keterangan: t.keterangan || '-',
        }))
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Kalkulasi Saldo
  const totalPemasukan = transaksiList
    .filter((t) => t.tipe === 'masuk')
    .reduce((acc, curr) => acc + curr.nominal, 0)

  const totalPengeluaran = transaksiList
    .filter((t) => t.tipe === 'keluar')
    .reduce((acc, curr) => acc + curr.nominal, 0)

  const saldoAkhir = totalPemasukan - totalPengeluaran

  // Filter Data Tampil
  const listTampil = transaksiList.filter((t) => {
    if (activeTab === 'masuk') return t.tipe === 'masuk'
    if (activeTab === 'keluar') return t.tipe === 'keluar'
    return true
  })

  // Buka Modal Tambah
  const openAddModal = (tipe: 'masuk' | 'keluar') => {
    setEditingId(null)
    setFormTipe(tipe)
    setFormKategori(tipe === 'masuk' ? 'Hasil Penjualan Sampah' : 'Konsumsi Kegiatan')
    setFormTanggal(new Date().toISOString().split('T')[0])
    setFormNominalDisplay('')
    setFormKeterangan('')
    setIsModalOpen(true)
  }

  // Buka Modal Edit
  const openEditModal = (t: TransaksiKas) => {
    setEditingId(t.id)
    setFormTipe(t.tipe)
    setFormKategori(t.kategori)
    setFormTanggal(t.tanggal)
    setFormNominalDisplay(t.nominal.toLocaleString('id-ID'))
    setFormKeterangan(t.keterangan === '-' ? '' : t.keterangan)
    setIsModalOpen(true)
  }

  // Handle Simpan / Update Transaksi
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const nominalRaw = parseRawNumber(formNominalDisplay)
    if (!nominalRaw || !formKategori.trim()) {
      showAlert('error', 'Kategori dan nominal wajib diisi!')
      return
    }

    setIsSaving(true)

    if (editingId) {
      // UPDATE DATA
      const { error } = await supabase
        .from('kas_pemuda_transaksi')
        .update({
          tipe: formTipe,
          kategori: formKategori.trim(),
          tanggal: formTanggal,
          nominal: nominalRaw,
          keterangan: formKeterangan.trim() || '-',
        })
        .eq('id', editingId)
        .eq('user_id', userId)

      if (error) {
        showAlert('error', `Gagal mengubah transaksi: ${error.message}`)
      } else {
        setTransaksiList((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  tipe: formTipe,
                  kategori: formKategori.trim(),
                  tanggal: formTanggal,
                  nominal: nominalRaw,
                  keterangan: formKeterangan.trim() || '-',
                }
              : item
          )
        )
        showAlert('success', 'Transaksi berhasil diperbarui!')
        setIsModalOpen(false)
      }
    } else {
      // INSERT DATA BARU
      const payload = {
        user_id: userId,
        rt_group: userRt,
        tipe: formTipe,
        kategori: formKategori.trim(),
        tanggal: formTanggal || new Date().toISOString().split('T')[0],
        nominal: nominalRaw,
        keterangan: formKeterangan.trim() || '-',
      }

      const { data, error } = await supabase
        .from('kas_pemuda_transaksi')
        .insert([payload])
        .select()

      if (error) {
        showAlert('error', `Gagal menambah transaksi: ${error.message}`)
      } else if (data && data.length > 0) {
        const baru: TransaksiKas = {
          id: data[0].id,
          tanggal: data[0].tanggal,
          tipe: data[0].tipe,
          kategori: data[0].kategori,
          nominal: Number(data[0].nominal),
          keterangan: data[0].keterangan,
        }
        setTransaksiList((prev) => [baru, ...prev])
        showAlert('success', 'Catatan kas baru berhasil ditambahkan!')
        setIsModalOpen(false)
      }
    }

    setIsSaving(false)
  }

  // Handle Hapus Transaksi
  const handleDelete = async (id: number) => {
    if (!confirm('Apakah kamu yakin ingin menghapus catatan transaksi ini?')) return
    const { error } = await supabase
      .from('kas_pemuda_transaksi')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      showAlert('error', `Gagal menghapus data: ${error.message}`)
    } else {
      setTransaksiList((prev) => prev.filter((t) => t.id !== id))
      showAlert('success', 'Catatan transaksi telah dihapus!')
    }
  }

  // Handle Export Excel
  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx')
      const exportRows = transaksiList.map((t, idx) => ({
        No: idx + 1,
        Tanggal: t.tanggal,
        Jenis: t.tipe === 'masuk' ? 'Pemasukan (Sampah/Donasi)' : 'Pengeluaran (Belanja)',
        Kategori: t.kategori,
        'Nominal Masuk': t.tipe === 'masuk' ? t.nominal : 0,
        'Nominal Keluar': t.tipe === 'keluar' ? t.nominal : 0,
        Keterangan: t.keterangan,
      }))

      const ringkasan = [
        { Keterangan: 'Total Pemasukan Lainnya', Nominal: totalPemasukan },
        { Keterangan: 'Total Pengeluaran Belanja Kas', Nominal: totalPengeluaran },
        { Keterangan: 'Sisa Saldo Kas Pemuda Saat Ini', Nominal: saldoAkhir },
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ringkasan), 'Ringkasan_Saldo')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), 'Buku_Kas_Lengkap')
      XLSX.writeFile(wb, `Buku_Kas_Pemuda_${userRt}.xlsx`)
      showAlert('success', 'File Excel berhasil diunduh!')
    } catch {
      showAlert('error', 'Gagal memproses file Excel.')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-0">
      {/* Alert Notification Toast */}
      {alertInfo && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold animate-bounce transition-all ${
            alertInfo.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : alertInfo.type === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-indigo-600 text-white border-indigo-700'
          }`}
        >
          <span>{alertInfo.type === 'success' ? '✅' : alertInfo.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{alertInfo.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">
              Buku Kas Pemuda
            </h1>
            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200">
              {userRt}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan Pemasukan & Pengeluaran Kas Pemuda
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2">
          <button
            onClick={handleExport}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
          >
            <span>📥</span> Export Excel
          </button>
          <button
            onClick={() => openAddModal('masuk')}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
          >
            <span>+</span> Uang Masuk 
          </button>
          <button
            onClick={() => openAddModal('keluar')}
            className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
          >
            <span>-</span> Pengeluaran
          </button>
        </div>
      </div>

      {/* Ringkasan Saldo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-emerald-50/80 border border-emerald-200 p-4 sm:p-5 rounded-2xl">
          <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">
            Total Pemasukan 
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {loading ? '...' : `Rp ${totalPemasukan.toLocaleString('id-ID')}`}
          </p>
          <span className="text-[10px] sm:text-[11px] text-emerald-600 block mt-0.5">
            Akumulasi uang kas masuk
          </span>
        </div>

        <div className="bg-rose-50/80 border border-rose-200 p-4 sm:p-5 rounded-2xl">
          <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">
            Total Pengeluaran Kas
          </span>
          <p className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
            {loading ? '...' : `Rp ${totalPengeluaran.toLocaleString('id-ID')}`}
          </p>
          <span className="text-[10px] sm:text-[11px] text-rose-600 block mt-0.5">
            Biaya kegiatan & operasional
          </span>
        </div>

        <div className="bg-indigo-50/80 border border-indigo-200 p-4 sm:p-5 rounded-2xl">
          <span className="text-[10px] font-bold text-indigo-800 uppercase block tracking-wider">
            Sisa Saldo Kas Bersama
          </span>
          <p className="text-xl sm:text-2xl font-black text-indigo-700 mt-1">
            {loading ? '...' : `Rp ${saldoAkhir.toLocaleString('id-ID')}`}
          </p>
          <span className="text-[10px] sm:text-[11px] text-indigo-600 block mt-0.5">
            Saldo kas aktif siap pakai
          </span>
        </div>
      </div>

      {/* Filter Tab Responsive */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 text-xs font-bold overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('semua')}
          className={`pb-2.5 px-1 whitespace-nowrap transition-all ${
            activeTab === 'semua'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Semua Arus Kas ({transaksiList.length})
        </button>
        <button
          onClick={() => setActiveTab('masuk')}
          className={`pb-2.5 px-1 whitespace-nowrap transition-all ${
            activeTab === 'masuk'
              ? 'border-b-2 border-emerald-600 text-emerald-700 font-extrabold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Pemasukan ({transaksiList.filter((t) => t.tipe === 'masuk').length})
        </button>
        <button
          onClick={() => setActiveTab('keluar')}
          className={`pb-2.5 px-1 whitespace-nowrap transition-all ${
            activeTab === 'keluar'
              ? 'border-b-2 border-rose-600 text-rose-700 font-extrabold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Pengeluaran ({transaksiList.filter((t) => t.tipe === 'keluar').length})
        </button>
      </div>

      {/* TAMPILAN MOBILE: Card List Touch-Friendly */}
      <div className="block md:hidden space-y-3">
        {listTampil.length > 0 ? (
          listTampil.map((t, idx) => (
            <div
              key={t.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold text-[10px]">#{idx + 1}</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        t.tipe === 'masuk'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {t.tipe === 'masuk' ? '▲ Masuk' : '▼ Belanja'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">{t.tanggal}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug">{t.kategori}</h4>
                </div>

                <div className="text-right">
                  <p
                    className={`font-mono font-black text-sm ${
                      t.tipe === 'masuk' ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {t.tipe === 'masuk' ? '+' : '-'} Rp {t.nominal.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {t.keterangan && t.keterangan !== '-' && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                  &ldquo;{t.keterangan}&rdquo;
                </p>
              )}

              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(t)}
                  className="flex-1 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                >
                  <span>✏️</span> Edit
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="flex-1 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                >
                  <span>🗑️</span> Hapus
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 italic text-xs">
            Belum ada catatan transaksi.
          </div>
        )}
      </div>

      {/* TAMPILAN DESKTOP: Tabel Lengkap */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">NO</th>
                <th className="py-3 px-4">TANGGAL</th>
                <th className="py-3 px-4 text-center">JENIS</th>
                <th className="py-3 px-4">SUMBER / KEBUTUHAN BELANJA</th>
                <th className="py-3 px-4">KETERANGAN</th>
                <th className="py-3 px-4 text-right">NOMINAL (RP)</th>
                <th className="py-3 px-4 text-center w-28">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listTampil.length > 0 ? (
                listTampil.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      {t.tanggal}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {t.tipe === 'masuk' ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full">
                          + Masuk
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-full">
                          - Belanja
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{t.kategori}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{t.keterangan}</td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-black whitespace-nowrap ${
                        t.tipe === 'masuk' ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {t.tipe === 'masuk' ? '+' : '-'} Rp {t.nominal.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(t)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition"
                          title="Edit Catatan"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition"
                          title="Hapus Catatan"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 italic">
                    Belum ada data catatan kas pemuda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM (TAMBAH & EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-5 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-800">
                  {editingId ? 'Edit Catatan Transaksi' : formTipe === 'masuk' ? 'Catat Uang Masuk Kas' : 'Catat Belanja Kas'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {editingId ? 'Perbarui rincian nominal dan keterangan' : 'Form input buku kas pemuda'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center hover:bg-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              {/* Pilihan Jenis Transaksi jika Edit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTipe('masuk')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      formTipe === 'masuk'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    + Pemasukan 
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipe('keluar')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      formTipe === 'keluar'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    - Pengeluaran 
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {formTipe === 'masuk' ? 'Sumber Uang  *' : 'Nama Kegiatan / Belanja *'}
                </label>
                <input
                  type="text"
                  placeholder={
                    formTipe === 'masuk'
                      ? 'Contoh: Penjualan Kardus, Botol & Besi'
                      : 'Contoh: Konsumsi Rapat Pemuda / Beli Sound'
                  }
                  value={formKategori}
                  onChange={(e) => setFormKategori(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Transaksi *</label>
                <input
                  type="date"
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nominal (Rp) *</label>
                <input
                  type="text"
                  placeholder="Contoh: 150.000"
                  value={formNominalDisplay}
                  onChange={(e) => setFormNominalDisplay(formatRupiah(e.target.value))}
                  className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black focus:outline-none ${
                    formTipe === 'masuk'
                      ? 'text-emerald-700 focus:border-emerald-600'
                      : 'text-rose-600 focus:border-rose-600'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Catatan</label>
                <input
                  type="text"
                  placeholder="Contoh: Disetor koordinator sampah / Nota di bendahara"
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-1/2 py-2.5 text-white text-xs font-bold rounded-xl shadow-sm transition ${
                    formTipe === 'masuk'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSaving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}