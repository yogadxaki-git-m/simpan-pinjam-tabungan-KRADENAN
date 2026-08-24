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

interface TransaksiSimpanPinjam {
  id?: number
  idAnggota: number
  namaAnggota: string
  statusHadir?: 'Hadir' | 'Izin' | 'Absen'
  angsuranPokok: number
  bayarJasa: number
  pinjamanBaru: number
  riwayatPinjaman?: number[]
  riwayatCicilan?: { tanggal: string; pokok: number; jasa: number }[]
  isSaved?: boolean
}

export default function SimpanPinjamPage() {
  const [masterAnggota, setMasterAnggota] = useState<Anggota[]>([])
  const [daftarPertemuan, setDaftarPertemuan] = useState<PertemuanItem[]>([])
  const [selectedPertemuanId, setSelectedPertemuanId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [userRt, setUserRt] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('loading')
  const [loadingData, setLoadingData] = useState<boolean>(true)

  // Data transaksi khusus pertemuan terpilih
  const [transaksiPertemuanIni, setTransaksiPertemuanIni] = useState<TransaksiSimpanPinjam[]>([])

  // Modal State Ajukan Pinjaman Baru
  const [isModalPinjamOpen, setIsModalPinjamOpen] = useState(false)
  const [searchAnggota, setSearchAnggota] = useState('')
  const [selectedAnggota, setSelectedAnggota] = useState<Anggota | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [inputPinjamDisplay, setInputPinjamDisplay] = useState('')

  // Modal State Bayar Angsuran / Cicil
  const [isModalAngsurOpen, setIsModalAngsurOpen] = useState(false)
  const [inputAngsurPokokDisplay, setInputAngsurPokokDisplay] = useState('')
  const [inputBayarJasaDisplay, setInputBayarJasaDisplay] = useState('')

  // Modal State Detail / Edit Pinjaman
  const [isModalEditPinjamanOpen, setIsModalEditPinjamanOpen] = useState(false)
  const [selectedTrxForEdit, setSelectedTrxForEdit] = useState<TransaksiSimpanPinjam | null>(null)
  const [editRiwayatList, setEditRiwayatList] = useState<string[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Helper Format Angka Ribuan
  const formatRupiahDisplay = (val: string | number) => {
    if (!val && val !== 0) return ''
    const numberString = val.toString().replace(/[^0-9]/g, '')
    if (!numberString) return ''
    return parseInt(numberString, 10).toLocaleString('id-ID')
  }

  // Helper Unformat Angka
  const parseRawNumber = (val: string) => {
    const raw = val.toString().replace(/[^0-9]/g, '')
    return parseFloat(raw) || 0
  }

  // 1. Inisialisasi User & Data HANYA milik user_id yang aktif
  useEffect(() => {
    async function initData() {
      setLoadingData(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoadingData(false)
        return
      }

      const uid = user.id
      const rt = user.user_metadata?.rt_group || 'RT 09'
      const role = user.user_metadata?.role || 'simpan_pinjam'
      setUserId(uid)
      setUserRt(rt)
      setUserRole(role)

      if (role === 'tabungan') {
        setLoadingData(false)
        return
      }

      // Fetch Master Anggota terkunci user_id
      const { data: dataAnggota } = await supabase
        .from('anggota')
        .select('id, nama')
        .eq('user_id', uid)
        .order('id', { ascending: true })

      if (dataAnggota) {
        setMasterAnggota(dataAnggota)
      }

      // Fetch Pertemuan terkunci user_id
      const { data: dataPertemuan } = await supabase
        .from('pertemuan')
        .select('id, tanggal')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (dataPertemuan && dataPertemuan.length > 0) {
        setDaftarPertemuan(dataPertemuan)
        setSelectedPertemuanId(dataPertemuan[0].id)
      }

      setLoadingData(false)
    }

    initData()
  }, [])

  // 2. Load Detail Transaksi Pertemuan dari Supabase
  const loadDetailPertemuan = async (pId: string) => {
    if (!pId || pId === 'ALL' || !userId) {
      setTransaksiPertemuanIni([])
      return
    }

    const { data, error } = await supabase
      .from('transaksi')
      .select('*')
      .eq('id_pertemuan', pId)
      .eq('user_id', userId)

    if (!error && data) {
      const mapped: TransaksiSimpanPinjam[] = data.map((t) => ({
        id: t.id,
        idAnggota: Number(t.id_anggota),
        namaAnggota: t.nama_anggota,
        statusHadir: (t.status_hadir as 'Hadir' | 'Izin' | 'Absen') || 'Hadir',
        angsuranPokok: Number(t.angsuran_pokok) || 0,
        bayarJasa: Number(t.bayar_jasa) || 0,
        pinjamanBaru: Number(t.pinjaman_baru) || 0,
        riwayatPinjaman: Array.isArray(t.riwayat_pinjaman) ? t.riwayat_pinjaman : [],
        isSaved: true,
      }))
      setTransaksiPertemuanIni(mapped)
    } else {
      setTransaksiPertemuanIni([])
    }
  }

  useEffect(() => {
    if (userRole === 'simpan_pinjam' && userId) {
      loadDetailPertemuan(selectedPertemuanId)
    }
  }, [selectedPertemuanId, userRole, userId])

  // Proteksi Akses Terbatas untuk Role Tabungan
  if (userRole === 'tabungan') {
    return (
      <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 text-center max-w-md mx-auto space-y-4 shadow-sm my-8 sm:my-12">
        <div className="text-4xl">🚫</div>
        <h2 className="text-base sm:text-lg font-black text-slate-800">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Akun Anda terdaftar sebagai <strong>Pengurus Tabungan</strong> dan tidak memiliki hak akses untuk mengelola Buku Simpan Pinjam.
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

  const anggotaTampil = masterAnggota.filter((anggota) => {
    if (selectedPertemuanId === 'ALL') return true

    const trx = transaksiPertemuanIni.find((t) => t.idAnggota === anggota.id)
    if (!trx) return false

    const totalPinjamOrangIni =
      trx.riwayatPinjaman && trx.riwayatPinjaman.length > 0
        ? trx.riwayatPinjaman.reduce((a, b) => a + b, 0)
        : trx.pinjamanBaru || 0

    const adaAktivitasPinjaman =
      (trx.angsuranPokok || 0) > 0 ||
      (trx.bayarJasa || 0) > 0 ||
      totalPinjamOrangIni > 0

    return trx.isSaved || adaAktivitasPinjaman
  })

  const filteredMasterAnggota = masterAnggota.filter(
    (a) =>
      a.nama.toLowerCase().includes(searchAnggota.toLowerCase()) ||
      a.id.toString().includes(searchAnggota)
  )

  // 1. AJUKAN PINJAMAN BARU
  const handleSimpanPinjamanBaru = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAnggota) {
      alert('Pilih anggota terlebih dahulu!')
      return
    }

    if (!selectedPertemuanId || selectedPertemuanId === 'ALL') {
      alert('Pilih pertemuan spesifik terlebih dahulu!')
      return
    }

    const nominalPinjamBaruRaw = parseRawNumber(inputPinjamDisplay)
    const existingTrx = transaksiPertemuanIni.find((t) => t.idAnggota === selectedAnggota.id)

    if (existingTrx && existingTrx.id) {
      const oldList =
        existingTrx.riwayatPinjaman && existingTrx.riwayatPinjaman.length > 0
          ? existingTrx.riwayatPinjaman
          : existingTrx.pinjamanBaru
          ? [existingTrx.pinjamanBaru]
          : []
      const updatedList = [...oldList, nominalPinjamBaruRaw]
      const newTotalPinjaman = updatedList.reduce((a, b) => a + b, 0)

      await supabase
        .from('transaksi')
        .update({
          pinjaman_baru: newTotalPinjaman,
          riwayat_pinjaman: updatedList,
        })
        .eq('id', existingTrx.id)
        .eq('user_id', userId)

      setTransaksiPertemuanIni((prev) =>
        prev.map((item) =>
          item.id === existingTrx.id
            ? {
                ...item,
                pinjamanBaru: newTotalPinjaman,
                riwayatPinjaman: updatedList,
                isSaved: true,
              }
            : item
        )
      )
    } else {
      const { data: newTrx } = await supabase
        .from('transaksi')
        .insert([
          {
            user_id: userId,
            rt_group: userRt,
            id_pertemuan: selectedPertemuanId,
            id_anggota: selectedAnggota.id,
            nama_anggota: selectedAnggota.nama,
            status_hadir: 'Hadir',
            tabungan_wajib: 0,
            angsuran_pokok: 0,
            bayar_jasa: 0,
            pinjaman_baru: nominalPinjamBaruRaw,
            riwayat_pinjaman: [nominalPinjamBaruRaw],
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
            angsuranPokok: 0,
            bayarJasa: 0,
            pinjamanBaru: nominalPinjamBaruRaw,
            riwayatPinjaman: [nominalPinjamBaruRaw],
            isSaved: true,
          },
        ])
      }
    }

    setSelectedAnggota(null)
    setSearchAnggota('')
    setInputPinjamDisplay('')
    setIsModalPinjamOpen(false)
  }

  // 2. SIMPAN BAYAR ANGSURAN (AKUMULASI)
  const handleSimpanAngsuran = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAnggota) return

    const cicilanPokokBaru = parseRawNumber(inputAngsurPokokDisplay)
    const cicilanJasaBaru = parseRawNumber(inputBayarJasaDisplay)

    const existingTrx = transaksiPertemuanIni.find((t) => t.idAnggota === selectedAnggota.id)

    if (existingTrx && existingTrx.id) {
      const totalPokokBaru = (existingTrx.angsuranPokok || 0) + cicilanPokokBaru
      const totalJasaBaru = (existingTrx.bayarJasa || 0) + cicilanJasaBaru

      await supabase
        .from('transaksi')
        .update({
          angsuran_pokok: totalPokokBaru,
          bayar_jasa: totalJasaBaru,
        })
        .eq('id', existingTrx.id)
        .eq('user_id', userId)

      setTransaksiPertemuanIni((prev) =>
        prev.map((item) =>
          item.id === existingTrx.id
            ? {
                ...item,
                angsuranPokok: totalPokokBaru,
                bayarJasa: totalJasaBaru,
                isSaved: true,
              }
            : item
        )
      )
    } else {
      const { data: newTrx } = await supabase
        .from('transaksi')
        .insert([
          {
            user_id: userId,
            rt_group: userRt,
            id_pertemuan: selectedPertemuanId,
            id_anggota: selectedAnggota.id,
            nama_anggota: selectedAnggota.nama,
            status_hadir: 'Hadir',
            tabungan_wajib: 0,
            angsuran_pokok: cicilanPokokBaru,
            bayar_jasa: cicilanJasaBaru,
            pinjaman_baru: 0,
            riwayat_pinjaman: [],
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
            angsuranPokok: cicilanPokokBaru,
            bayarJasa: cicilanJasaBaru,
            pinjamanBaru: 0,
            riwayatPinjaman: [],
            isSaved: true,
          },
        ])
      }
    }

    setSelectedAnggota(null)
    setIsModalAngsurOpen(false)
  }

  const handleOpenModalAngsuran = (item: Anggota) => {
    setSelectedAnggota(item)
    setInputAngsurPokokDisplay('')
    setInputBayarJasaDisplay('')
    setIsModalAngsurOpen(true)
  }

  const handleAngsuranPokokChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    const formattedPokok = formatRupiahDisplay(rawVal)
    setInputAngsurPokokDisplay(formattedPokok)

    const rawNumberPokok = parseRawNumber(formattedPokok)
    const autoJasaOnePercent = Math.round(rawNumberPokok * 0.01)

    if (autoJasaOnePercent > 0) {
      setInputBayarJasaDisplay(formatRupiahDisplay(autoJasaOnePercent))
    } else {
      setInputBayarJasaDisplay('')
    }
  }

  const handleOpenEditPinjaman = (trx: TransaksiSimpanPinjam) => {
    setSelectedTrxForEdit(trx)
    const list =
      trx.riwayatPinjaman && trx.riwayatPinjaman.length > 0
        ? trx.riwayatPinjaman
        : trx.pinjamanBaru
        ? [trx.pinjamanBaru]
        : []
    setEditRiwayatList(list.map((n) => formatRupiahDisplay(n)))
    setIsModalEditPinjamanOpen(true)
  }

  const handleSaveEditPinjamanList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTrxForEdit || !selectedTrxForEdit.id) return

    const updatedRawNumbers = editRiwayatList.map((str) => parseRawNumber(str))
    const newTotal = updatedRawNumbers.reduce((a, b) => a + b, 0)

    await supabase
      .from('transaksi')
      .update({
        pinjaman_baru: newTotal,
        riwayat_pinjaman: updatedRawNumbers,
      })
      .eq('id', selectedTrxForEdit.id)
      .eq('user_id', userId)

    setTransaksiPertemuanIni((prev) =>
      prev.map((item) =>
        item.id === selectedTrxForEdit.id
          ? {
              ...item,
              pinjamanBaru: newTotal,
              riwayatPinjaman: updatedRawNumbers,
              isSaved: true,
            }
          : item
      )
    )

    setIsModalEditPinjamanOpen(false)
  }

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const namaPertemuan =
        daftarPertemuan.find((p) => p.id === selectedPertemuanId)?.tanggal || 'Semua_Data'

      const dataToExport = anggotaTampil.map((item, index) => {
        const trx = transaksiPertemuanIni.find((t) => t.idAnggota === item.id)
        const sudahDibayar = trx?.angsuranPokok || 0
        const totalPinjaman = trx?.pinjamanBaru || 0
        const sisaUtang = Math.max(0, totalPinjaman - sudahDibayar)
        const isLunas = totalPinjaman > 0 && sisaUtang === 0

        return {
          No: index + 1,
          'Nama Anggota': item.nama,
          'Total Pinjaman': totalPinjaman ? `Rp ${totalPinjaman.toLocaleString('id-ID')}` : 'Rp 0',
          'Sudah Dicicil': sudahDibayar ? `Rp ${sudahDibayar.toLocaleString('id-ID')}` : 'Rp 0',
          'Bayar Jasa 1%': trx?.bayarJasa ? `Rp ${trx.bayarJasa.toLocaleString('id-ID')}` : 'Rp 0',
          'Sisa Hutang': sisaUtang ? `Rp ${sisaUtang.toLocaleString('id-ID')}` : 'Rp 0',
          Status: isLunas ? 'LUNAS' : sisaUtang > 0 ? 'BELUM LUNAS' : '-',
        }
      })

      const totalPinjam = anggotaTampil.reduce((acc, curr) => {
        const trx = transaksiPertemuanIni.find((t) => t.idAnggota === curr.id)
        return acc + (trx?.pinjamanBaru || 0)
      }, 0)

      const totalCicil = anggotaTampil.reduce((acc, curr) => {
        const trx = transaksiPertemuanIni.find((t) => t.idAnggota === curr.id)
        return acc + (trx?.angsuranPokok || 0)
      }, 0)

      const totalJasa = anggotaTampil.reduce((acc, curr) => {
        const trx = transaksiPertemuanIni.find((t) => t.idAnggota === curr.id)
        return acc + (trx?.bayarJasa || 0)
      }, 0)

      const totalSisa = anggotaTampil.reduce((acc, curr) => {
        const trx = transaksiPertemuanIni.find((t) => t.idAnggota === curr.id)
        const pinjam = trx?.pinjamanBaru || 0
        const cicil = trx?.angsuranPokok || 0
        return acc + Math.max(0, pinjam - cicil)
      }, 0)

      dataToExport.push({
        No: '' as any,
        'Nama Anggota': 'TOTAL AKUMULASI',
        'Total Pinjaman': `Rp ${totalPinjam.toLocaleString('id-ID')}`,
        'Sudah Dicicil': `Rp ${totalCicil.toLocaleString('id-ID')}`,
        'Bayar Jasa 1%': `Rp ${totalJasa.toLocaleString('id-ID')}`,
        'Sisa Hutang': `Rp ${totalSisa.toLocaleString('id-ID')}`,
        Status: '',
      })

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Buku_Simpan_Pinjam')

      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 22 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 16 },
      ]

      const cleanFileName = `Laporan_Simpan_Pinjam_${userRt}_${namaPertemuan.replace(/\s+/g, '_')}.xlsx`
      XLSX.writeFile(workbook, cleanFileName)
    } catch (err) {
      console.error('Export Excel Error:', err)
      alert('Gagal mengekspor file Excel.')
    }
  }

  const totalAngsuranPertemuanIni = transaksiPertemuanIni.reduce((acc, curr) => {
    return acc + (Number(curr.angsuranPokok) || 0) + (Number(curr.bayarJasa) || 0)
  }, 0)

  const totalPinjamanBaruPertemuanIni = transaksiPertemuanIni.reduce((acc, curr) => {
    return acc + (Number(curr.pinjamanBaru) || 0)
  }, 0)

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
              Buku Simpan Pinjam Koperasi
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
              {userRt || 'Memuat...'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan Pinjaman Anggota & Bayar Angsuran Per Pertemuan
          </p>
        </div>

        <div className="flex items-stretch sm:items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 flex-1 sm:flex-none text-right">
            <p className="text-[9px] sm:text-[10px] font-bold text-emerald-800 uppercase">
              Angsuran Masuk
            </p>
            <p className="text-base sm:text-lg font-black text-emerald-700">
              Rp {totalAngsuranPertemuanIni.toLocaleString('id-ID')}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              title="Download Rekap Simpan Pinjam ke File Excel"
            >
              <span>📥</span> <span className="hidden xs:inline">Export</span> Excel
            </button>

            <button
              onClick={() => {
                setSelectedAnggota(null)
                setSearchAnggota('')
                setInputPinjamDisplay('')
                setIsModalPinjamOpen(true)
              }}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>+</span> Pinjaman Baru
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
                  Pertemuan Tanggal {p.tanggal}
                </option>
              ))}
              <option value="ALL">📊 Tampilkan Semua Anggota Master Data</option>
            </select>
          ) : (
            <span className="text-xs text-slate-400 italic">Belum ada agenda pertemuan</span>
          )}
        </div>

        <div className="text-xs font-semibold text-slate-500 text-right sm:text-left">
          Dicairkan Hari Ini:{' '}
          <strong className="text-rose-600 font-bold">
            Rp {totalPinjamanBaruPertemuanIni.toLocaleString('id-ID')}
          </strong>
        </div>
      </div>

      {/* 1. TAMPILAN MOBILE */}
      <div className="block md:hidden space-y-3">
        {loadingData ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
            Memuat data simpan pinjam...
          </div>
        ) : anggotaTampil.length > 0 ? (
          anggotaTampil.map((item, index) => {
            const trx = transaksiPertemuanIni.find((t) => t.idAnggota === item.id)
            const sudahDibayar = trx?.angsuranPokok || 0
            const totalPinjaman = trx?.pinjamanBaru || 0
            const sisaUtang = Math.max(0, totalPinjaman - sudahDibayar)
            const jumlahPinjamKali = trx?.riwayatPinjaman?.length || (totalPinjaman > 0 ? 1 : 0)
            const isLunas = totalPinjaman > 0 && sisaUtang === 0

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
                  {isLunas ? (
                    <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-300">
                      ✓ LUNAS
                    </span>
                  ) : (
                    <span className="bg-rose-50 text-rose-700 font-bold text-[10px] px-2 py-0.5 rounded-full border border-rose-200">
                      Sisa: Rp {sisaUtang.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Total Pinjam</span>
                    <span className="font-bold text-slate-800">
                      {totalPinjaman ? `Rp ${totalPinjaman.toLocaleString('id-ID')}` : '-'}
                    </span>
                    {jumlahPinjamKali > 1 && (
                      <span className="ml-1 text-[9px] text-amber-700 font-bold">({jumlahPinjamKali}x)</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Sudah Dicicil</span>
                    <span className="font-bold text-emerald-700">
                      {trx?.angsuranPokok ? `Rp ${trx.angsuranPokok.toLocaleString('id-ID')}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Bayar Jasa 1%</span>
                    <span className="font-bold text-amber-700">
                      {trx?.bayarJasa ? `Rp ${trx.bayarJasa.toLocaleString('id-ID')}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Status</span>
                    <span className="font-bold text-slate-700">{isLunas ? 'Lunas' : 'Belum Lunas'}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {totalPinjaman > 0 && trx && (
                    <button
                      onClick={() => handleOpenEditPinjaman(trx)}
                      className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition-colors"
                    >
                      ✏️ Rincian Pinjam
                    </button>
                  )}
                  {!isLunas && (
                    <button
                      onClick={() => handleOpenModalAngsuran(item)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] rounded-xl transition-colors shadow-sm"
                    >
                      + Cicil Angsuran
                    </button>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs italic">
            Belum ada transaksi simpan pinjam.
          </div>
        )}
      </div>

      {/* 2. TAMPILAN DESKTOP */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">NO</th>
                <th className="py-3 px-4">NAMA ANGGOTA</th>
                <th className="py-3 px-4 text-right">TOTAL PINJAMAN</th>
                <th className="py-3 px-4 text-right text-emerald-700">SUDAH DICICIL</th>
                <th className="py-3 px-4 text-right text-amber-700">BAYAR JASA 1%</th>
                <th className="py-3 px-4 text-right text-rose-600">SISA UTANG</th>
                <th className="py-3 px-4 text-center">AKSI</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loadingData ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Memuat data simpan pinjam...
                  </td>
                </tr>
              ) : anggotaTampil.length > 0 ? (
                anggotaTampil.map((item, index) => {
                  const trx = transaksiPertemuanIni.find((t) => t.idAnggota === item.id)
                  const sudahDibayar = trx?.angsuranPokok || 0
                  const totalPinjaman = trx?.pinjamanBaru || 0
                  const sisaUtang = Math.max(0, totalPinjaman - sudahDibayar)
                  const jumlahPinjamKali =
                    trx?.riwayatPinjaman?.length || (totalPinjaman > 0 ? 1 : 0)
                  const isLunas = totalPinjaman > 0 && sisaUtang === 0

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {item.nama}
                        {jumlahPinjamKali > 1 && (
                          <button
                            onClick={() => trx && handleOpenEditPinjaman(trx)}
                            className="ml-2 text-[9px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-extrabold px-1.5 py-0.5 rounded border border-amber-300 transition-colors cursor-pointer"
                            title="Klik untuk lihat rincian pinjaman"
                          >
                            {jumlahPinjamKali}x Pinjam
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        <div className="flex items-center justify-end gap-1">
                          <span>
                            {totalPinjaman ? `Rp ${totalPinjaman.toLocaleString('id-ID')}` : '-'}
                          </span>
                          {trx && totalPinjaman > 0 && (
                            <button
                              onClick={() => handleOpenEditPinjaman(trx)}
                              className="text-[10px] text-slate-400 hover:text-slate-700 p-0.5"
                              title="Edit/Lihat Rincian"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {trx?.angsuranPokok ? `Rp ${trx.angsuranPokok.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                        {trx?.bayarJasa ? `Rp ${trx.bayarJasa.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                        {sisaUtang > 0 ? `Rp ${sisaUtang.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLunas ? (
                          <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-emerald-300">
                            ✓ LUNAS
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenModalAngsuran(item)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] rounded-lg transition-colors"
                          >
                            + Cicil Angsuran
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    Belum ada transaksi simpan pinjam pada pertemuan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: AJUKAN PINJAMAN BARU */}
      {isModalPinjamOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                Ajukan Pinjaman Baru
              </h3>
              <button
                onClick={() => setIsModalPinjamOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimpanPinjamanBaru} className="space-y-3 sm:space-y-4">
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Pertemuan Pencairan
                </label>
                <select
                  value={selectedPertemuanId}
                  onChange={(e) => setSelectedPertemuanId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {daftarPertemuan.map((p) => (
                    <option key={p.id} value={p.id}>
                      Pertemuan Tanggal {p.tanggal}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Pinjaman Tambahan (Rp)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 100.000"
                  value={inputPinjamDisplay}
                  onChange={(e) => setInputPinjamDisplay(formatRupiahDisplay(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalPinjamOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Cairkan Pinjaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT DETAIL RINCIAN PINJAMAN */}
      {isModalEditPinjamanOpen && selectedTrxForEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Rincian: {selectedTrxForEdit.namaAnggota}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400">
                  Koreksi atau atur ulang rincian nilai pinjaman
                </p>
              </div>
              <button
                onClick={() => setIsModalEditPinjamanOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditPinjamanList} className="space-y-3">
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {editRiwayatList.map((val, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <span className="text-xs font-bold text-slate-600 min-w-[80px]">
                      Ke-{idx + 1}:
                    </span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const newFormatted = formatRupiahDisplay(e.target.value)
                        const copy = [...editRiwayatList]
                        copy[idx] = newFormatted
                        setEditRiwayatList(copy)
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right text-rose-600 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const copy = editRiwayatList.filter((_, i) => i !== idx)
                        setEditRiwayatList(copy)
                      }}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Total Akumulasi:</span>
                <span className="font-extrabold text-rose-600 text-sm">
                  Rp{' '}
                  {editRiwayatList
                    .reduce((acc, curr) => acc + parseRawNumber(curr), 0)
                    .toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalEditPinjamanOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BAYAR ANGSURAN / CICIL UTANG */}
      {isModalAngsurOpen && selectedAnggota && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Input Cicilan: {selectedAnggota.nama}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500">
                  Setoran cicilan baru akan ditambahkan ke angsuran
                </p>
              </div>
              <button
                onClick={() => setIsModalAngsurOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimpanAngsuran} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Cicilan Pokok (Rp)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 100.000"
                  value={inputAngsurPokokDisplay}
                  onChange={handleAngsuranPokokChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bayar Jasa 1% (Otomatis 1%)
                </label>
                <input
                  type="text"
                  placeholder="Otomatis terisi..."
                  value={inputBayarJasaDisplay}
                  onChange={(e) => setInputBayarJasaDisplay(formatRupiahDisplay(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-amber-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalAngsurOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  + Tambah Cicilan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}