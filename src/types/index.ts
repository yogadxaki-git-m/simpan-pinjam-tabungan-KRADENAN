export type RoleType = 'simpan_pinjam' | 'tabungan';

export interface UserProfile {
  id: string;
  username: string;
  role_id: string;
  roles: {
    name: RoleType;
    description: string;
  };
}

export interface Anggota {
  id: string;
  nomor_anggota: string;
  nama: string;
  nik: string;
  no_hp?: string;
  alamat?: string;
}

export interface Pertemuan {
  id: string;
  nama_sesi: string;
  tanggal_sesi: string;
  created_at: string;
}

export interface TabunganRecord {
  id: string;
  anggota_id: string;
  nomor_rekening: string;
  saldo: number;
  anggota?: Anggota;
}

export interface PinjamanRecord {
  id: string;
  anggota_id: string;
  pertemuan_id: string;
  jumlah_pinjaman: number;
  sisa_pinjaman: number;
  tenor_bulan: number;
  status: 'aktif' | 'lunas' | 'macet';
  anggota?: Anggota;
}