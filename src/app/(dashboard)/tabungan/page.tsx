'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

interface Anggota {
  id: number
  nama: string
}

interface PertemuanItem {
  id: string
  tanggal: string
}

interface TransaksiPertemuan {
  id?: number
  idAnggota: number
  namaAnggota: string
  statusHadir: 'Hadir' | 'Izin' | 'Absen'
  tabunganWajib: number
  isSaved?: boolean
}

export default function TabunganPage() {
  const [masterAnggota, setMasterAnggota] = useState<Anggota[]>([])
  const [daftarPertemuan, setDaftarPertemuan] = useState<PertemuanItem[]>([])
  const [selectedPertemuanId, setSelectedPertemuanId] = useState<string>('')
  const [userRt, setUserRt] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('loading')
  const [loadingData, setLoadingData] = useState<boolean>(true)

  // Data transaksi khusus pertemuan terpilih
  const [transaksiPertemuanIni, setTransaksiPertemuanIni] = useState<TransaksiPertemuan[]>([])

  // Modal State Catat / Edit Setoran
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchAnggota, setSearchAnggota] = useState<string>('')
  const [selectedAnggota, setSelectedAnggota] = useState<Anggota | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)
  const [inputTabunganDisplay, setInputTabunganDisplay] = useState<string>('')

  // Modal State Konfirmasi Perubahan (Mencegah Human Error)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [pendingTabunganValue, setPendingTabunganValue] = useState<number>(0)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Helper Format Angka Ribuan (misal 500000 -> 500.000)
  const formatRupiahDisplay = (val: string | number) => {
    if (!val && val !== 0) return ''
    const numberString = val.toString().replace(/[^0-9]/g, '')
    if (!numberString) return ''
    return parseInt(numberString, 10).toLocaleString('id-ID')
  }

  // Helper Unformat Angka (misal "500.000" -> 500000)
  const parseRawNumber = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '')
    return parseFloat(raw) || 0
  }

  // 1. Inisialisasi User RT, Role, Master Anggota & Daftar Pertemuan dari Supabase
  useEffect(() => {
    async function initData() {
      setLoadingData(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const rt = user?.user_metadata?.rt_group || 'RT 09'
      const role = user?.user_metadata?.role || 'simpan_pinjam'
      setUserRt(rt)
      setUserRole(role)

      if (role === 'simpan_pinjam') {
        setLoadingData(false)
        return
      }

      // Fetch Master Anggota
      const { data: dataAnggota } = await supabase
        .from('anggota')
        .select('id, nama')
        .eq('rt_group', rt)
        .order('id', { ascending: true })

      if (dataAnggota) {
        setMasterAnggota(dataAnggota)
      }

      // Fetch Pertemuan
      const { data: dataPertemuan } = await supabase
        .from('pertemuan')
        .select('id, tanggal')
        .eq('rt_group', rt)
        .order('created_at', { ascending: false })

      if (dataPertemuan && dataPertemuan.length > 0) {
        setDaftarPertemuan(dataPertemuan)
        setSelectedPertemuanId(dataPertemuan[0].id)
      }
      setLoadingData(false)
    }

    initData()
  }, [])

  // 2. Load Transaksi Pertemuan Terpilih dari Supabase
  useEffect(() => {
    async function loadTransaksiPertemuan() {
      if (!selectedPertemuanId || selectedPertemuanId === 'ALL') {
        setTransaksiPertemuanIni([])
        return
      }

      const { data, error } = await supabase
        .from('transaksi')
        .select('*')
        .eq('id_pertemuan', selectedPertemuanId)

      if (!error && data) {
        const mapped: TransaksiPertemuan[] = data.map((t) => ({
          id: t.id,
          idAnggota: Number(t.id_anggota),
          namaAnggota: t.nama_anggota,
          statusHadir: (t.status_hadir as 'Hadir' | 'Izin' | 'Absen') || 'Hadir',
          tabunganWajib: Number(t.tabungan_wajib) || 0,
          isSaved: true,
        }))
        setTransaksiPertemuanIni(mapped)
      } else {
        setTransaksiPertemuanIni([])
      }
    }

    if (userRole === 'tabungan') {
      loadTransaksiPertemuan()
    }
  }, [selectedPertemuanId, userRole])

  // Proteksi Akses Terbatas untuk Role Simpan Pinjam
  if (userRole === 'simpan_pinjam') {
    return (
      <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 text-center max-w-md mx-auto space-y-4 shadow-sm my-8 sm:my-12">
        <div className="text-4xl">🚫</div>
        <h2 className="text-base sm:text-lg font-black text-slate-800">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Akun Anda terdaftar sebagai <strong>Pengurus Simpan Pinjam</strong> dan tidak memiliki hak akses untuk mengelola Buku Tabungan.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    )
  }

  // Filter Anggota yang Tampil
  const anggotaTampil = masterAnggota.filter((anggota) => {
    if (selectedPertemuanId === 'ALL') return true

    const trx = transaksiPertemuanIni.find((t) => t.idAnggota === anggota.id)
    if (!trx) return false

    const punyaSetoran = (trx.tabunganWajib || 0) > 0
    return trx.isSaved || trx.statusHadir === 'Hadir' || punyaSetoran
  })

  // Hitung Setoran Per Anggota di Pertemuan Ini
  const getSetoranPertemuanIni = (idAnggota: number) => {
    const trx = transaksiPertemuanIni.find((t) => t.idAnggota === idAnggota)
    if (!trx) return 0
    return trx.tabunganWajib || 0
  }

  // Hitung Total Kas Tabungan Pertemuan Terpilih
  const totalSetoranPertemuanIni = anggotaTampil.reduce(
    (acc, curr) => acc + getSetoranPertemuanIni(curr.id),
    0
  )

  // Filter Dropdown Modal
  const filteredMasterAnggota = masterAnggota.filter(
    (a) =>
      a.nama.toLowerCase().includes(searchAnggota.toLowerCase()) ||
      a.id.toString().includes(searchAnggota)
  )

  // 1. Trigger Modal Edit Langsung dari Baris Tabel
  const handleOpenEditBaris = (anggota: Anggota) => {
    setSelectedAnggota(anggota)
    setSearchAnggota(`${anggota.id}. ${anggota.nama}`)

    const existingTrx = transaksiPertemuanIni.find((t) => t.idAnggota === anggota.id)
    if (existingTrx && existingTrx.tabunganWajib) {
      setInputTabunganDisplay(formatRupiahDisplay(existingTrx.tabunganWajib))
    } else {
      setInputTabunganDisplay('')
    }

    setIsModalOpen(true)
  }

  // 2. Submit Form Pertama (Memicu Pop-Up Konfirmasi)
  const handleSubmitFormModal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAnggota) {
      alert('Pilih anggota terlebih dahulu!')
      return
    }

    if (!selectedPertemuanId || selectedPertemuanId === 'ALL') {
      alert('Pilih pertemuan spesifik terlebih dahulu untuk mencatat setoran!')
      return
    }

    const val = parseRawNumber(inputTabunganDisplay)
    setPendingTabunganValue(val)
    setIsConfirmOpen(true)
  }

  // 3. Eksekusi Simpan Perubahan Setelah Dikonfirmasi User ke Supabase
  const handleExecuteSave = async () => {
    if (!selectedAnggota || !selectedPertemuanId) return

    const existingTrx = transaksiPertemuanIni.find((t) => t.idAnggota === selectedAnggota.id)

    if (existingTrx && existingTrx.id) {
      await supabase
        .from('transaksi')
        .update({
          tabungan_wajib: pendingTabunganValue,
          status_hadir: 'Hadir',
        })
        .eq('id', existingTrx.id)

      setTransaksiPertemuanIni((prev) =>
        prev.map((item) =>
          item.idAnggota === selectedAnggota.id
            ? { ...item, tabunganWajib: pendingTabunganValue, isSaved: true }
            : item
        )
      )
    } else {
      const { data: newTrx } = await supabase
        .from('transaksi')
        .insert([
          {
            rt_group: userRt,
            id_pertemuan: selectedPertemuanId,
            id_anggota: selectedAnggota.id,
            nama_anggota: selectedAnggota.nama,
            status_hadir: 'Hadir',
            tabungan_wajib: pendingTabunganValue,
          },
        ])
        .select()

      if (newTrx && newTrx.length > 0) {
        setTransaksiPertemuanIni((prev) => [
          ...prev,
          {
            id: newTrx[0].id,
            idAnggota: selectedAnggota.id,
            namaAnggota: selectedAnggota.nama,
            statusHadir: 'Hadir',
            tabunganWajib: pendingTabunganValue,
            isSaved: true,
          },
        ])
      }
    }

    setIsConfirmOpen(false)
    setIsModalOpen(false)
    setSelectedAnggota(null)
    setSearchAnggota('')
    setInputTabunganDisplay('')
  }

  // 4. Ekspor ke Excel (.xlsx) dengan Format Rupiah Rapi
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const namaPertemuan =
        daftarPertemuan.find((p) => p.id === selectedPertemuanId)?.tanggal || 'Semua_Data'

      const dataToExport = anggotaTampil.map((item, index) => {
        const setoran = getSetoranPertemuanIni(item.id)
        const trx = transaksiPertemuanIni.find((t) => t.idAnggota === item.id)

        return {
          No: index + 1,
          'Nama Anggota': item.nama,
          Kehadiran: (trx?.statusHadir || 'Hadir') as string,
          'Nominal Setoran': setoran ? `Rp ${setoran.toLocaleString('id-ID')}` : 'Rp 0',
        }
      })

      // Baris Total Akumulasi
      const totalSemua = anggotaTampil.reduce((acc, curr) => acc + getSetoranPertemuanIni(curr.id), 0)

      dataToExport.push({
        No: '' as any,
        'Nama Anggota': 'TOTAL SETORAN KAS',
        Kehadiran: '',
        'Nominal Setoran': `Rp ${totalSemua.toLocaleString('id-ID')}`,
      })

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Buku_Tabungan')

      worksheet['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 15 }, { wch: 24 }]

      const cleanFileName = `Laporan_Tabungan_${userRt}_${namaPertemuan.replace(/\s+/g, '_')}.xlsx`
      XLSX.writeFile(workbook, cleanFileName)
    } catch (err) {
      console.error('Export Excel Error:', err)
      alert('Gagal mengekspor file Excel. Pastikan package xlsx sudah terinstall (npm i xlsx).')
    }
  }

  const pertemuanTerpilihObj = daftarPertemuan.find((p) => p.id === selectedPertemuanId)

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
              Buku Tabungan Koperasi
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
              {userRt || 'Memuat...'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Catatan Setoran Per Pertemuan & Akumulasi Saldo Anggota
          </p>
        </div>

        <div className="flex items-stretch sm:items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 flex-1 sm:flex-none text-right">
            <p className="text-[9px] sm:text-[10px] font-bold text-emerald-800 uppercase">
              Total Setoran
            </p>
            <p className="text-base sm:text-lg font-black text-emerald-700">
              Rp {totalSetoranPertemuanIni.toLocaleString('id-ID')}
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
              onClick={() => {
                setSelectedAnggota(null)
                setSearchAnggota('')
                setInputTabunganDisplay('')
                setIsModalOpen(true)
              }}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>+</span> Catat Setoran
            </button>
          </div>
        </div>
      </div>

      {/* Filter Pertemuan */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-600 shrink-0">📍 Pertemuan:</span>
          {daftarPertemuan.length > 0 ? (
            <select
              value={selectedPertemuanId}
              onChange={(e) => setSelectedPertemuanId(e.target.value)}
              className="w-full sm:w-auto p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
            >
              {daftarPertemuan.map((p) => (
                <option key={p.id} value={p.id}>
                  Pertemuan {p.tanggal}
                </option>
              ))}
              <option value="ALL">📊 Tampilkan Semua Anggota (Master Data)</option>
            </select>
          ) : (
            <span className="text-xs text-slate-400 italic">Belum ada agenda pertemuan</span>
          )}
        </div>

        <div className="text-xs font-semibold text-slate-500 text-right sm:text-left">
          Jumlah Anggota Tampil:{' '}
          <strong className="text-emerald-700 font-bold">{anggotaTampil.length} Orang</strong>
        </div>
      </div>

      {/* 1. TAMPILAN MOBILE (HANYA MUNCUL DI HP / LAYAR KECIL) */}
      <div className="block md:hidden space-y-3">
        {loadingData ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
            Memuat data tabungan...
          </div>
        ) : anggotaTampil.length > 0 ? (
          anggotaTampil.map((item, index) => {
            const setoran = getSetoranPertemuanIni(item.id)
            const trx = transaksiPertemuanIni.find((t) => t.idAnggota === item.id)

            return (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">#{index + 1}</span>
                    <h4 className="text-sm font-extrabold text-slate-800">{item.nama}</h4>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {trx?.statusHadir || 'Hadir'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Setoran Pertemuan Ini:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {setoran > 0 ? `Rp ${setoran.toLocaleString('id-ID')}` : '-'}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenEditBaris(item)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  ✏️ Edit Setoran
                </button>
              </div>
            )
          })
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs italic">
            Belum ada anggota yang dicatat kehadirannya pada pertemuan ini.
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
                <th className="py-3 px-4">NAMA ANGGOTA</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">
                  SETORAN ({pertemuanTerpilihObj?.tanggal || 'PERTEMUAN INI'})
                </th>
                <th className="py-3 px-4 text-center w-28">AKSI</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loadingData ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    Memuat data tabungan...
                  </td>
                </tr>
              ) : anggotaTampil.length > 0 ? (
                anggotaTampil.map((item, index) => {
                  const setoran = getSetoranPertemuanIni(item.id)
                  const trx = transaksiPertemuanIni.find((t) => t.idAnggota === item.id)

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.nama}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {trx?.statusHadir || 'Hadir'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700">
                        {setoran > 0 ? `Rp ${setoran.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenEditBaris(item)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 mx-auto"
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    Belum ada anggota yang dicatat kehadirannya pada pertemuan ini.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer Total */}
            <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-200 text-xs">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-right uppercase font-extrabold tracking-wider">
                  TOTAL SETORAN PERTEMUAN INI:
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-800 font-black text-sm">
                  Rp {totalSetoranPertemuanIni.toLocaleString('id-ID')}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL 1: FORM CATAT / EDIT SETORAN TABUNGAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                Catat / Edit Setoran Tabungan
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitFormModal} className="space-y-3 sm:space-y-4">
              {/* Cari / Pilih Anggota */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cari Nama / No. Anggota
                </label>
                <input
                  type="text"
                  placeholder="Ketik nama anggota..."
                  value={
                    selectedAnggota
                      ? `${selectedAnggota.id}. ${selectedAnggota.nama}`
                      : searchAnggota
                  }
                  onChange={(e) => {
                    setSearchAnggota(e.target.value)
                    setSelectedAnggota(null)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  required
                />

                {isDropdownOpen && !selectedAnggota && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {filteredMasterAnggota.length > 0 ? (
                      filteredMasterAnggota.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => {
                            setSelectedAnggota(a)
                            setIsDropdownOpen(false)

                            const existingTrx = transaksiPertemuanIni.find((t) => t.idAnggota === a.id)
                            if (existingTrx && existingTrx.tabunganWajib) {
                              setInputTabunganDisplay(formatRupiahDisplay(existingTrx.tabunganWajib))
                            } else {
                              setInputTabunganDisplay('')
                            }
                          }}
                          className="p-2.5 hover:bg-emerald-50 cursor-pointer font-semibold text-slate-700 flex justify-between"
                        >
                          <span>{a.nama}</span>
                          <span className="text-slate-400">No. {a.id}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-slate-400 text-center">Anggota tidak ditemukan</div>
                    )}
                  </div>
                )}
              </div>

              {/* Input Nominal Tabungan (Formatted Thousand Separator) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Tabungan (Rp)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 500.000"
                  value={inputTabunganDisplay}
                  onChange={(e) => {
                    const formatted = formatRupiahDisplay(e.target.value)
                    setInputTabunganDisplay(formatted)
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
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
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Simpan Setoran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: POP-UP KONFIRMASI (SAFETY GUARD HUMAN ERROR) */}
      {isConfirmOpen && selectedAnggota && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 sm:p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                Konfirmasi Perubahan Data
              </h4>
              <p className="text-xs text-slate-500 mt-2">
                Apakah Anda yakin ingin menyimpan setoran tabungan sebesar:
              </p>
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs font-bold text-slate-600">{selectedAnggota.nama}</p>
                <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                  Rp {pendingTabunganValue.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Batal / Cek Lagi
              </button>
              <button
                onClick={handleExecuteSave}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Ya, Simpan Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}