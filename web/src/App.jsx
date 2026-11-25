import { useCallback, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import StokMasuk from './pages/StokMasuk'
import StokKeluar from './pages/StokKeluar'
import BahanBaku from './pages/BahanBaku'
import TambahBahanBaku from './pages/TambahBahanBaku'
import EditBahanBaku from './pages/EditBahanBaku'
import DetailBahanBaku from './pages/DetailBahanBaku'
import RiwayatTransaksi from './pages/RiwayatTransaksi'
import DetailTransaksi from './pages/DetailTransaksi'
import { ToastProvider, useToast } from './components/ui/ToastProvider'
import { api } from './api'

function Placeholder({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-main">{title}</h1>
      <p className="mt-2 text-sm text-text-muted">Halaman sedang dalam tahap pengembangan.</p>
    </div>
  )
}

function AppRoutes() {
  const [materials, setMaterials] = useState([])
  const [stockTransactions, setStockTransactions] = useState([])
  const [ready, setReady] = useState(false)
  const { notify } = useToast()

  const reload = useCallback(async () => {
    try {
      const [nextMaterials, nextTransactions] = await Promise.all([
        api.getMaterials(),
        api.getTransactions(),
      ])
      setMaterials(nextMaterials)
      setStockTransactions(nextTransactions)
      setReady(true)
    } catch (error) {
      notify({ type: 'error', title: 'Gagal memuat data', message: error.message })
    }
  }, [notify])

  useEffect(() => { reload() }, [reload])

  if (!ready) {
    return <p className="p-8 text-sm text-text-muted">Memuat data stok dari server...</p>
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard materials={materials} stockTransactions={stockTransactions} />} />
        <Route path="/bahan-baku" element={<BahanBaku materials={materials} setMaterials={setMaterials} reload={reload} />} />
        <Route path="/bahan-baku/tambah" element={<TambahBahanBaku materials={materials} setMaterials={setMaterials} reload={reload} />} />
        <Route path="/bahan-baku/:materialId/edit" element={<EditBahanBaku materials={materials} setMaterials={setMaterials} reload={reload} />} />
        <Route path="/bahan-baku/:materialId" element={<DetailBahanBaku materials={materials} stockTransactions={stockTransactions} />} />
        <Route path="/stok-masuk" element={<StokMasuk materials={materials} setMaterials={setMaterials} stockTransactions={stockTransactions} setStockTransactions={setStockTransactions} reload={reload} />} />
        <Route path="/stok-keluar" element={<StokKeluar materials={materials} setMaterials={setMaterials} stockTransactions={stockTransactions} setStockTransactions={setStockTransactions} reload={reload} />} />
        <Route path="/riwayat-transaksi" element={<RiwayatTransaksi stockTransactions={stockTransactions} />} />
        <Route path="/riwayat-transaksi/:id" element={<DetailTransaksi stockTransactions={stockTransactions} />} />
        <Route path="/ai-assistant" element={<Placeholder title="AI Stock Assistant" />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  )
}
