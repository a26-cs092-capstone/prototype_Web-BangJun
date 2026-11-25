import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'

function formatTransactionDate(date) {
  if (!date) return '—'
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function formatTwelveHourTime(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(time || '')
  if (!match) return '—'
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return '—'
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${String(hour12).padStart(2, '0')}:${match[2]} ${period} WITA`
}

function DetailTransaksi({ stockTransactions }) {
  const { id } = useParams()
  const transaction = stockTransactions.find((item) => item.id === id)

  if (!transaction) {
    return (
      <section className="transaction-not-found">
        <h1>Transaksi Tidak Ditemukan</h1>
        <p>Data transaksi tidak tersedia selama aplikasi ini berjalan.</p>
        <Link to="/riwayat-transaksi"><ArrowLeft size={15} /> Kembali ke Riwayat Transaksi</Link>
      </section>
    )
  }

  const isStockIn = transaction.type === 'Stok Masuk'
  const formattedQuantity = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
    .format(transaction.quantity)

  return (
    <div className="transaction-detail-page">
      <Link className="transaction-detail-back" to="/riwayat-transaksi">
        <ArrowLeft size={17} aria-hidden="true" /> Kembali ke Riwayat Transaksi
      </Link>

      <header className="transaction-detail-heading">
        <h1>Detail Transaksi</h1>
        <p>Informasi lengkap mutasi persediaan dan rincian transaksi bahan baku.</p>
      </header>

      <article className="transaction-detail-card">
        <section className="transaction-detail-section">
          <h2>Informasi Transaksi</h2>
          <dl className="transaction-detail-meta">
            <div>
              <dt>ID Transaksi</dt>
              <dd className="transaction-detail-id">{transaction.id}</dd>
            </div>
            <div>
              <dt>Jenis Transaksi</dt>
              <dd>
                <span className={`transaction-history-badge transaction-history-badge--${isStockIn ? 'in' : 'out'}`}>
                  <i aria-hidden="true" />{transaction.type}
                </span>
              </dd>
            </div>
            <div>
              <dt>Tanggal Transaksi</dt>
              <dd>{formatTransactionDate(transaction.date)}</dd>
            </div>
            <div>
              <dt>Waktu Transaksi</dt>
              <dd>{formatTwelveHourTime(transaction.time)}</dd>
            </div>
          </dl>
        </section>

        <section className="transaction-detail-section">
          <h2>Detail Bahan Baku</h2>
          <dl className="transaction-detail-fields">
            <div>
              <dt>Nama Bahan Baku</dt>
              <dd>{transaction.materialName || '—'}</dd>
            </div>
            <div>
              <dt>Jumlah Transaksi</dt>
              <dd className={`transaction-detail-quantity transaction-detail-quantity--${isStockIn ? 'in' : 'out'}`}>
                {formattedQuantity} {transaction.unit || ''}
              </dd>
            </div>
            <div>
              <dt>Alasan</dt>
              <dd>{transaction.reason || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="transaction-detail-section transaction-detail-notes-section">
          <h2>Keterangan Transaksi</h2>
          <p className="transaction-detail-notes">{transaction.notes?.trim() || '—'}</p>
        </section>

        <div className="transaction-detail-actions">
          <Link to="/riwayat-transaksi"><ArrowLeft size={15} aria-hidden="true" /> Kembali ke Riwayat Transaksi</Link>
        </div>
      </article>
    </div>
  )
}

export default DetailTransaksi
