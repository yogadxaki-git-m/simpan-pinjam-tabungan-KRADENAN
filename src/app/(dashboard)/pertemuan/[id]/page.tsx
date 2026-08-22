'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

interface TransaksiRow {
  id?: number
  id_anggota: number
  nama_anggota: string
  status_hadir: string
  tabungan_wajib: number
  angsuran_pokok: number
  bayar_jasa: number
  pinjaman_baru: number
}

export default function DetailPertemuanPage() {
  const params = useParams()
  const pertemuanId = params.id as string

  const [tanggal, setTanggal] = useState('')
  const [userRt, setUserRt] = useState('')
  const [userRole, setUserRole] = useState('')
  const [transaksiList, setTransaksiList] = useState<TransaksiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedNotif, setSavedNotif] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const rt = user?.user_metadata?.rt_group || 'RT 09'
      const role = user?.user_metadata?.role || 'simpan_pinjam'
      setUserRt(rt)
      setUserRole(role)

      // 1. Ambil detail pertemuan
      const { data: pData } = await supabase
        .from('pertemuan')
        .select('*')
        .eq('id', pertemuanId)
        .single()

      if (pData) {
        setTanggal(pData.tanggal)
      }

      // 2. Ambil master anggota di RT ini
      const { data: aData } = await supabase
        .from('anggota')
        .select('*')
        .eq('rt_group', rt)
        .order('id', { ascending: true })

      // 3. Ambil transaksi yang sudah ada
      const { data: tData } = await supabase
        .from('transaksi')
        .select('*')
        .eq('id_pertemuan', pertemuanId)

      if (aData) {
        const merged: TransaksiRow[] = aData.map((anggota) => {
          const found = tData?.find((t) => Number(t.id_anggota) === Number(anggota.id))
          return {
            id: found?.id,
            id_anggota: anggota.id,
            nama_anggota: anggota.nama,
            status_hadir: found?.status_hadir || 'Hadir',
            tabungan_wajib: Number(found?.tabungan_wajib) || 0,
            angsuran_pokok: Number(found?.angsuran_pokok) || 0,
            bayar_jasa: Number(found?.bayar_jasa) || 0,
            pinjaman_baru: Number(found?.pinjaman_baru) || 0,
          }
        })
        setTransaksiList(merged)
      }

      setLoading(false)
    }
    loadData()
  }, [pertemuanId])

  const handleInputChange = (index: number, field: keyof TransaksiRow, value: any) => {
    setTransaksiList((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [field]: value,
      }
      return updated
    })
  }

  // Simpan Perubahan Catatan ke Supabase (Insert atau Update)
  const handleSaveData = async () => {
    setSaving(true)

    for (let i = 0; i < transaksiList.length; i++) {
      const item = transaksiList[i]

      if (item.id) {
        // Update baris yang sudah ada
        await supabase
          .from('transaksi')
          .update({
            status_hadir: item.status_hadir,
            tabungan_wajib: item.tabungan_wajib,
            angsuran_pokok: item.angsuran_pokok,
            bayar_jasa: item.bayar_jasa,
            pinjaman_baru: item.pinjaman_baru,
          })
          .eq('id', item.id)
      } else {
        // Insert baris baru jika belum pernah ada
        const { data: newRow } = await supabase
          .from('transaksi')
          .insert([
            {
              rt_group: userRt,
              id_pertemuan: pertemuanId,
              id_anggota: item.id_anggota,
              nama_anggota: item.nama_anggota,
              status_hadir: item.status_hadir,
              tabungan_wajib: item.tabungan_wajib,
              angsuran_pokok: item.angsuran_pokok,
              bayar_jasa: item.bayar_jasa,
              pinjaman_baru: item.pinjaman_baru,
            },
          ])
          .select()

        if (newRow && newRow.length > 0) {
          transaksiList[i].id = newRow[0].id
        }
      }
    }

    setSaving(false)
    setSavedNotif(true)
    setTimeout(() => setSavedNotif(false), 3000)
  }

  // Total Kalkulasi
  const totalTabungan = transaksiList.reduce((acc, curr) => acc + (curr.tabungan_wajib || 0), 0)
  const totalAngsuran = transaksiList.reduce((acc, curr) => acc + (curr.angsuran_pokok || 0), 0)
  const totalJasa = transaksiList.reduce((acc, curr) => acc + (curr.bayar_jasa || 0), 0)
  const totalPinjamBaru = transaksiList.reduce((acc, curr) => acc + (curr.pinjaman_baru || 0), 0)

  // Ekspor Rekap Pertemuan ke Excel (.xlsx) dengan Format Rupiah Rapi
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const dataToExport = transaksiList.map((item, idx) => ({
        No: idx + 1,
        'Nama Anggota': item.nama_anggota,
        Kehadiran: item.status_hadir,
        'Tabungan (Rp)': item.tabungan_wajib ? `Rp ${item.tabungan_wajib.toLocaleString('id-ID')}` : 'Rp 0',
        'Angsuran Pokok (Rp)': item.angsuran_pokok ? `Rp ${item.angsuran_pokok.toLocaleString('id-ID')}` : 'Rp 0',
        'Bayar Jasa (Rp)': item.bayar_jasa ? `Rp ${item.bayar_jasa.toLocaleString('id-ID')}` : 'Rp 0',
        'Pinjaman Baru (Rp)': item.pinjaman_baru ? `Rp ${item.pinjaman_baru.toLocaleString('id-ID')}` : 'Rp 0',
      }))

      dataToExport.push({
        No: '' as any,
        'Nama Anggota': 'TOTAL AKUMULASI',
        Kehadiran: '',
        'Tabungan (Rp)': `Rp ${totalTabungan.toLocaleString('id-ID')}`,
        'Angsuran Pokok (Rp)': `Rp ${totalAngsuran.toLocaleString('id-ID')}`,
        'Bayar Jasa (Rp)': `Rp ${totalJasa.toLocaleString('id-ID')}`,
        'Pinjaman Baru (Rp)': `Rp ${totalPinjamBaru.toLocaleString('id-ID')}`,
      })

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Pertemuan')

      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 20 },
      ]

      const cleanDate = (tanggal || 'Pertemuan').replace(/\s+/g, '_')
      const cleanFileName = `Berita_Acara_Kas_${userRt}_${cleanDate}.xlsx`
      XLSX.writeFile(workbook, cleanFileName)
    } catch (err) {
      console.error('Export Excel Error:', err)
      alert('Gagal mengekspor file Excel. Pastikan library xlsx terpasang.')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/pertemuan"
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              ← Kembali ke Daftar
            </Link>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight mt-1">
            Buku Catatan: {tanggal || 'Memuat...'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Wilayah: <strong>{userRt}</strong> • Role Anda:{' '}
            <strong className="text-emerald-700 uppercase">
              {userRole === 'tabungan' ? 'Pengurus Tabungan' : 'Pengurus Simpan Pinjam'}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Tombol Export Excel */}
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>📥</span> <span className="hidden xs:inline">Export</span> Excel
          </button>

          <button
            onClick={handleSaveData}
            disabled={saving}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>💾</span> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {savedNotif && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center shadow-sm">
          ✓ Seluruh catatan kas berhasil tersimpan di Cloud Database Supabase!
        </div>
      )}

      {/* Ringkasan Kas Pertemuan Ini */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Total Tabungan</span>
          <p className="text-sm sm:text-base font-extrabold text-emerald-700 mt-1">
            Rp {totalTabungan.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Total Angsuran</span>
          <p className="text-sm sm:text-base font-extrabold text-blue-700 mt-1">
            Rp {totalAngsuran.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Total Jasa / Bunga</span>
          <p className="text-sm sm:text-base font-extrabold text-amber-700 mt-1">
            Rp {totalJasa.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Total Pinjam Keluar</span>
          <p className="text-sm sm:text-base font-extrabold text-rose-700 mt-1">
            Rp {totalPinjamBaru.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* 1. TAMPILAN MOBILE (HANYA MUNCUL DI HP / SCREEN KECIL) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
            Memuat catatan transaksi...
          </div>
        ) : transaksiList.length > 0 ? (
          transaksiList.map((item, idx) => (
            <div
              key={item.id_anggota}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                  <h4 className="text-sm font-extrabold text-slate-800">{item.nama_anggota}</h4>
                </div>
                <select
                  value={item.status_hadir}
                  onChange={(e) => handleInputChange(idx, 'status_hadir', e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="Hadir">Hadir</option>
                  <option value="Izin">Izin</option>
                  <option value="Alpa">Alpa</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Input Tabungan */}
                <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">
                  <label className="text-[10px] font-bold text-emerald-800 block mb-1">
                    Tabungan (Rp)
                  </label>
                  <input
                    type="number"
                    disabled={userRole === 'simpan_pinjam'}
                    value={item.tabungan_wajib === 0 ? '' : item.tabungan_wajib}
                    placeholder="0"
                    onChange={(e) =>
                      handleInputChange(idx, 'tabungan_wajib', Number(e.target.value) || 0)
                    }
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                {/* Input Angsuran */}
                <div className="bg-blue-50/40 p-2.5 rounded-xl border border-blue-100">
                  <label className="text-[10px] font-bold text-blue-800 block mb-1">
                    Angsuran (Rp)
                  </label>
                  <input
                    type="number"
                    disabled={userRole === 'tabungan'}
                    value={item.angsuran_pokok === 0 ? '' : item.angsuran_pokok}
                    placeholder="0"
                    onChange={(e) =>
                      handleInputChange(idx, 'angsuran_pokok', Number(e.target.value) || 0)
                    }
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                {/* Input Jasa */}
                <div className="bg-amber-50/40 p-2.5 rounded-xl border border-amber-100">
                  <label className="text-[10px] font-bold text-amber-800 block mb-1">
                    Jasa 1% (Rp)
                  </label>
                  <input
                    type="number"
                    disabled={userRole === 'tabungan'}
                    value={item.bayar_jasa === 0 ? '' : item.bayar_jasa}
                    placeholder="0"
                    onChange={(e) =>
                      handleInputChange(idx, 'bayar_jasa', Number(e.target.value) || 0)
                    }
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-amber-800 focus:outline-none focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                {/* Input Pinjam Baru */}
                <div className="bg-rose-50/40 p-2.5 rounded-xl border border-rose-100">
                  <label className="text-[10px] font-bold text-rose-800 block mb-1">
                    Pinjam Baru (Rp)
                  </label>
                  <input
                    type="number"
                    disabled={userRole === 'tabungan'}
                    value={item.pinjaman_baru === 0 ? '' : item.pinjaman_baru}
                    placeholder="0"
                    onChange={(e) =>
                      handleInputChange(idx, 'pinjaman_baru', Number(e.target.value) || 0)
                    }
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-rose-800 focus:outline-none focus:border-rose-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs italic">
            Tidak ada anggota terdaftar.
          </div>
        )}
      </div>

      {/* 2. TAMPILAN DESKTOP (TABEL LEBAR UNTUK LAPTOP / PC) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">NO</th>
                <th className="py-3 px-3 min-w-[140px]">NAMA ANGGOTA</th>
                <th className="py-3 px-2 w-24">KEHADIRAN</th>
                <th className="py-3 px-3 min-w-[130px] bg-emerald-50/50 text-emerald-800">TABUNGAN (RP)</th>
                <th className="py-3 px-3 min-w-[130px] bg-blue-50/50 text-blue-800">ANGSURAN (RP)</th>
                <th className="py-3 px-3 min-w-[120px] bg-amber-50/50 text-amber-800">JASA (RP)</th>
                <th className="py-3 px-3 min-w-[130px] bg-rose-50/50 text-rose-800">PINJAM BARU (RP)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Memuat catatan transaksi...
                  </td>
                </tr>
              ) : transaksiList.length > 0 ? (
                transaksiList.map((item, idx) => (
                  <tr key={item.id_anggota} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{item.nama_anggota}</td>
                    <td className="py-2 px-2">
                      <select
                        value={item.status_hadir}
                        onChange={(e) => handleInputChange(idx, 'status_hadir', e.target.value)}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="Hadir">Hadir</option>
                        <option value="Izin">Izin</option>
                        <option value="Alpa">Alpa</option>
                      </select>
                    </td>

                    {/* Input Tabungan */}
                    <td className="py-2 px-3 bg-emerald-50/30">
                      <input
                        type="number"
                        disabled={userRole === 'simpan_pinjam'}
                        value={item.tabungan_wajib === 0 ? '' : item.tabungan_wajib}
                        placeholder="0"
                        onChange={(e) =>
                          handleInputChange(idx, 'tabungan_wajib', Number(e.target.value) || 0)
                        }
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </td>

                    {/* Input Angsuran Pokok */}
                    <td className="py-2 px-3 bg-blue-50/30">
                      <input
                        type="number"
                        disabled={userRole === 'tabungan'}
                        value={item.angsuran_pokok === 0 ? '' : item.angsuran_pokok}
                        placeholder="0"
                        onChange={(e) =>
                          handleInputChange(idx, 'angsuran_pokok', Number(e.target.value) || 0)
                        }
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </td>

                    {/* Input Bayar Jasa */}
                    <td className="py-2 px-3 bg-amber-50/30">
                      <input
                        type="number"
                        disabled={userRole === 'tabungan'}
                        value={item.bayar_jasa === 0 ? '' : item.bayar_jasa}
                        placeholder="0"
                        onChange={(e) =>
                          handleInputChange(idx, 'bayar_jasa', Number(e.target.value) || 0)
                        }
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-amber-800 focus:outline-none focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </td>

                    {/* Input Pinjaman Baru */}
                    <td className="py-2 px-3 bg-rose-50/30">
                      <input
                        type="number"
                        disabled={userRole === 'tabungan'}
                        value={item.pinjaman_baru === 0 ? '' : item.pinjaman_baru}
                        placeholder="0"
                        onChange={(e) =>
                          handleInputChange(idx, 'pinjaman_baru', Number(e.target.value) || 0)
                        }
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-rose-800 focus:outline-none focus:border-rose-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada anggota terdaftar di {userRt}. Silakan tambah anggota terlebih dahulu di menu Anggota.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}