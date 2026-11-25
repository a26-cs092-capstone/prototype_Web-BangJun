import {
  Plus,
  Minus,
  ArrowRight,
  Bot,
} from 'lucide-react'

import { Link } from 'react-router'

import {
  chartPanels,
  getDashboardSummary,
  getDashboardAttentionItems,
  getDashboardTransactions,
} from '../data/dashboardData'

function formatTransactionDateTime(date, time) {
    const [year, month, day] = (date || '').split('-').map(Number)
    const formattedDate = year && month && day
        ? new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            timeZone: 'UTC',
        }).format(new Date(Date.UTC(year, month - 1, day)))
        : '—'
    const match = /^(\d{2}):(\d{2})$/.exec(time || '')
    if (!match) return formattedDate
    const hour = Number(match[1])
    const minute = Number(match[2])
    if (hour > 23 || minute > 59) return formattedDate
    const period = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${formattedDate}, ${String(hour12).padStart(2, '0')}:${match[2]} ${period} WITA`
}

function Dashboard({ materials, stockTransactions }) {
  const summaryData = getDashboardSummary(materials)
  const attentionItems = getDashboardAttentionItems(materials)
  const recentTransactions = getDashboardTransactions(stockTransactions)

  return (
    <div className="dashboard">

        {/* Page Heading */}
        <section className="dashboard-heading">
            <div>
            <h1 className="dashboard-title">
                Halo, Bang Jun!
            </h1>

            <p className="dashboard-description">
                Pantau kondisi persediaan bahan baku Kedai Bang Jun.
            </p>
            </div>

            <div className="dashboard-actions">
            <Link
                to="stok-masuk"
                className="dashboard-button dashboard-button-in"
            >
                <Plus size={14} />
                Stok Masuk
            </Link>

            <Link
                to="stok-keluar"
                className="dashboard-button dashboard-button-out"
            >
                <Minus size={14} />
                Stok Keluar
            </Link>
            </div>
        </section>

        {/* Summary Cards */}
        <section className="dashboard-summary">
            {summaryData.map((item) => {
            const Icon = item.icon

            return (
                <div
                key={item.id}
                className="dashboard-summary-card"
                >
                <div className="dashboard-summary-info">
                    <p className="dashboard-summary-label">
                    {item.title}
                    </p>

                    <h2 className={`dashboard-summary-value dashboard-summary-value--${item.variant}`}>
                    {item.value}
                    </h2>

                    <p className="dashboard-summary-description">
                    {item.description}
                    </p>
                </div>

                <Icon
                    className={`dashboard-summary-icon dashboard-summary-icon--${item.variant}`}
                />
                </div>
            )
            })}
        </section>


        {/* Visualization Panels */}
        <section className="dashboard-visualizations">
        {chartPanels.map((panel) => (
            <div
            key={panel.id}
            className="dashboard-visual-card"
            >
            <div className="dashboard-visual-header">
                <div>
                <h2 className="dashboard-visual-title">
                    {panel.title}
                </h2>

                <p className="dashboard-visual-description">
                    {panel.description}
                </p>
                </div>
            </div>

            <div className="dashboard-visual-empty">
                <div className="dashboard-visual-empty-content">
                <div className="dashboard-visual-empty-icon">
                    <span>—</span>
                </div>

                <p className="dashboard-visual-empty-title">
                    {panel.emptyTitle}
                </p>

                <p className="dashboard-visual-empty-description">
                    {panel.emptyDescription}
                </p>
                </div>
            </div>
            </div>
        ))}
        </section>

        {/* Inventory Attention */}
        <section className="dashboard-attention">

        {/* Section Header */}
        <div className="dashboard-attention-heading">
            <div className="dashboard-attention-heading-left">
            <h2 className="dashboard-attention-title">
                Perlu Perhatian Segera
            </h2>

            <span className="dashboard-attention-count">
                {attentionItems.length} item
            </span>
            </div>

            <Link
            to="/bahan-baku"
            className="dashboard-attention-link"
            >
            Lihat Bahan Baku
            <ArrowRight size={15} />
            </Link>
        </div>

        {/* Inventory Table */}
        <div className="dashboard-table-wrapper">
            <table className="dashboard-attention-table">
            <thead>
                <tr>
                <th>Nama Bahan Baku</th>
                <th>Stok Saat Ini</th>
                <th>Stok Minimum</th>
                <th>Status</th>
                </tr>
            </thead>

            <tbody>
                {attentionItems.map((item) => (
                <tr key={item.id}>
                    <td className="dashboard-material-name">
                    {item.name}
                    </td>

                    <td className={`dashboard-stock-value dashboard-stock-value--${item.status === 'Kritis' ? 'critical' : 'warning'}`}>
                    {item.currentStock === null
                        ? '—'
                        : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(item.currentStock)}{' '}{item.unit}
                    </td>

                    <td className="dashboard-minimum-stock">
                    {item.minimumStock}
                    </td>

                    <td>
                    <span
                        className={`dashboard-status dashboard-status--${item.status === 'Kritis' ? 'critical' : 'warning'}`}
                    >
                        {item.status}
                    </span>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>

        </section>


        {/* AI Stock Assistant Banner */}
        <section className="dashboard-ai-banner">

        <div className="dashboard-ai-content">
            <div className="dashboard-ai-icon">
            <Bot size={19} />
            </div>

            <div className="dashboard-ai-info">
            <h2 className="dashboard-ai-title">
                AI Stock Assistant
            </h2>

            <p className="dashboard-ai-description">
                Lihat analisis risiko stok dan rekomendasi bahan baku
                berbasis pola dapur.
            </p>
            </div>
        </div>

        <Link
            to="/ai-assistant"
            className="dashboard-ai-link"
        >
            Buka AI Assistant
            <ArrowRight size={15} />
        </Link>

        </section>


        {/* Recent Stock Activities */}
        <section className="dashboard-recent">

        {/* Section Header */}
        <div className="dashboard-recent-heading">
            <div>
            <h2 className="dashboard-recent-title">
                Aktivitas Stok Terbaru
            </h2>

            <p className="dashboard-recent-description">
                Transaksi stok terbaru.
            </p>
            </div>

            <Link
            to="/riwayat-transaksi"
            className="dashboard-recent-link"
            >
            Lihat Semua Riwayat
            <ArrowRight size={15} />
            </Link>
        </div>

        {/* Recent Transactions Table */}
        <div className="dashboard-recent-table-wrapper">
            <table className="dashboard-recent-table">
            <thead>
                <tr>
                <th>Tanggal &amp; Waktu</th>
                <th>Nama Bahan Baku</th>
                <th>Jenis Transaksi</th>
                <th>Jumlah</th>
                </tr>
            </thead>

            <tbody>
                {recentTransactions.length === 0 ? (
                <tr>
                    <td className="dashboard-recent-empty" colSpan={4}>
                    Belum ada transaksi stok. Transaksi stok masuk dan stok keluar yang berhasil disimpan akan muncul di sini.
                    </td>
                </tr>
                ) : recentTransactions.map((item) => (
                <tr key={item.id}>
                    <td className="dashboard-recent-date">
                    {formatTransactionDateTime(item.date, item.time)}
                    </td>

                    <td className="dashboard-recent-material">
                    {item.materialName}
                    </td>

                    <td>
                    {item.type === '-' ? (
                        <span className="dashboard-recent-placeholder">
                        -
                        </span>
                    ) : (
                        <span
                        className={`dashboard-transaction-badge dashboard-transaction-badge--${
                            item.type === 'Stok Masuk'
                            ? 'in'
                            : 'out'
                        }`}
                        >
                        <span className="dashboard-transaction-dot" />
                        {item.type}
                        </span>
                    )}
                    </td>

                    <td
                    className={`dashboard-recent-amount ${
                        item.type === 'Stok Keluar'
                        ? 'dashboard-recent-amount--out'
                        : item.type === 'Stok Masuk'
                            ? 'dashboard-recent-amount--in'
                            : ''
                    }`}
                    >
                    {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(item.quantity)} {item.unit}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        </section>
        </div>
    )
}

export default Dashboard
