
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  CircleAlert,
} from 'lucide-react'

const summaryCards = [
  {
    id: 1,
    title: 'Total Bahan Baku',
    status: null,
    description: 'item',
    icon: Package,
    variant: 'default',
  },
  {
    id: 2,
    title: 'Stok Normal',
    status: 'Normal',
    description: 'item aman',
    icon: CheckCircle2,
    variant: 'normal',
  },
  {
    id: 3,
    title: 'Stok Menipis',
    status: 'Menipis',
    description: 'item waspada',
    icon: AlertTriangle,
    variant: 'warning',
  },
  {
    id: 4,
    title: 'Stok Kritis',
    status: 'Kritis',
    description: 'butuh belanja',
    icon: CircleAlert,
    variant: 'critical',
  },
]

export function getDashboardSummary(materials) {
  const activeMaterials = materials.filter((material) => material.active)

  return summaryCards.map((card) => ({
    ...card,
    value: String(card.status
      ? activeMaterials.filter((material) => material.status === card.status).length
      : activeMaterials.length),
  }))
}

export const chartPanels = [
  {
    id: 1,
    title: 'Distribusi Status Stok',
    description: 'Komposisi ketersediaan bahan saat ini',
    emptyTitle: 'Visualisasi belum tersedia',
    emptyDescription:
      '',
  },
  {
    id: 2,
    title: 'Aktivitas Transaksi Harian',
    description: 'Frekuensi mutasi barang dalam 7 hari terakhir',
    emptyTitle: 'Visualisasi belum tersedia',
    emptyDescription:
      '',
  },
]

export function getDashboardAttentionItems(materials) {
  return materials
    .filter((material) => material.active && ['Menipis', 'Kritis'].includes(material.status))
    .sort((left, right) => (left.status === 'Kritis' ? -1 : 0) - (right.status === 'Kritis' ? -1 : 0))
}

const DASHBOARD_TRANSACTION_LIMIT = 8

function byNewestFirst(left, right) {
  return `${right.date}T${right.time}`.localeCompare(`${left.date}T${left.time}`)
    || String(right.id).localeCompare(String(left.id))
}

export function getDashboardTransactions(stockTransactions) {
  return [...stockTransactions]
    .sort(byNewestFirst)
    .slice(0, DASHBOARD_TRANSACTION_LIMIT)
}
