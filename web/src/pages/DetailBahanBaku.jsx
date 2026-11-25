import { Link, useParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  Clock3,
  History,
  Pencil,
  Settings,
  TriangleAlert,
} from 'lucide-react'

function formatQuantity(value) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)
}

function formatUpdatedAt(value) {
  if (typeof value !== 'string') return 'Belum tersedia'
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match) return 'Belum tersedia'

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue] = match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const date = new Date(value)
  const calendarDate = new Date(Date.UTC(year, month - 1, day))
  if (
    calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day
    || Number(hourValue) > 23
    || Number(minuteValue) > 59
    || Number(secondValue) > 59
    || !Number.isFinite(date.getTime())
  ) return 'Belum tersedia'

  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Makassar',
  }).format(date)

  return `${formatted} WITA`
}

function formatTransactionDate(date) {
  if (!date) return '—'
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
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

function transactionDateTimeKey(transaction) {
  return `${transaction.date || ''}T${transaction.time || ''}`
}

function getStatusKey(status) {
  return status.toLocaleLowerCase('id-ID').replaceAll(' ', '-')
}

function DetailBahanBaku({ materials, stockTransactions = [] }) {
  const { materialId } = useParams()
  const material = materials.find((item) => item.id === materialId && item.active)

  if (!material) {
    return (
      <section className="material-not-found">
        <h1>Bahan Baku Tidak Ditemukan</h1>
        <p>Data bahan baku ini tidak tersedia atau sudah tidak aktif.</p>
        <Link to="/bahan-baku">Kembali ke Bahan Baku</Link>
      </section>
    )
  }

  const statusKey = getStatusKey(material.status)
  const updatedAt = formatUpdatedAt(material.updatedAt)
  const materialTransactions = stockTransactions
    .filter((transaction) => transaction.materialId === material.id)
    .sort((left, right) => (
      transactionDateTimeKey(right).localeCompare(transactionDateTimeKey(left))
      || String(right.id).localeCompare(String(left.id))
    ))

  return (
    <div className="material-detail-page">
      <Link className="material-detail-back" to="/bahan-baku">
        <ArrowLeft size={17} /> Kembali ke Bahan Baku
      </Link>

      <header className="material-detail-heading">
        <div className="material-detail-title-row">
          <h1>{material.name}</h1>
          <span className={`material-detail-status material-detail-status--${statusKey}`}>
            {material.status}
          </span>
        </div>
        <p>Detail informasi dan kondisi persediaan bahan baku.</p>
      </header>

      <section className="material-detail-summary" aria-label="Ringkasan persediaan">
        <article className="material-detail-summary-card">
          <div className="material-detail-summary-label">
            <h2>STOK SAAT INI</h2>
            <Archive size={17} aria-hidden="true" />
          </div>
          <p className="material-detail-summary-value">
            {material.currentStock === null ? (
              <span className="stock-unrecorded"><strong>—</strong><small>Belum dicatat</small></span>
            ) : <><strong>{formatQuantity(material.currentStock)}</strong> {material.unit}</>}
          </p>
          {material.currentStock !== null && (
            <p className="material-detail-summary-note">Jumlah persediaan tersedia</p>
          )}
        </article>

        <article className="material-detail-summary-card">
          <div className="material-detail-summary-label">
            <h2>STOK MINIMUM</h2>
            <TriangleAlert size={17} aria-hidden="true" />
          </div>
          <p className="material-detail-summary-value">
            <strong>{formatQuantity(material.minimumStock)}</strong> {material.unit}
          </p>
          <p className="material-detail-summary-note">Batas minimum persediaan</p>
        </article>

        <article className="material-detail-summary-card">
          <div className="material-detail-summary-label">
            <h2>STATUS PERSEDIAAN</h2>
            <Settings size={17} aria-hidden="true" />
          </div>
          <span className={`material-detail-status material-detail-status--${statusKey}`}>
            {material.status}
          </span>
          <p className="material-detail-status-description">
            {material.status === 'Belum ditentukan'
              ? 'Ambang status persediaan belum ditentukan.'
              : 'Status ditampilkan sesuai data persediaan yang tersedia.'}
          </p>
        </article>
      </section>

      <section className="material-detail-card">
        <div className="material-detail-card-heading">
          <div>
            <h2>Informasi Bahan Baku</h2>
            <p>Spesifikasi identitas dan ambang stok unit</p>
          </div>
          <Link className="material-detail-edit" to={`/bahan-baku/${material.id}/edit`}>
            <Pencil size={15} /> Edit Bahan Baku
          </Link>
        </div>

        <dl className="material-detail-information">
          <div><dt>Nama Bahan Baku</dt><dd>{material.name}</dd></div>
          <div><dt>Satuan</dt><dd>{material.unit}</dd></div>
          <div><dt>Stok Minimum</dt><dd>{formatQuantity(material.minimumStock)} {material.unit}</dd></div>
          <div>
            <dt>Stok Saat Ini</dt>
            <dd>{material.currentStock === null
              ? <span className="stock-unrecorded"><strong>—</strong><small>Belum dicatat</small></span>
              : <>{formatQuantity(material.currentStock)} {material.unit}</>}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd><span className={`material-detail-status material-detail-status--${statusKey}`}>{material.status}</span></dd>
          </div>
          <div>
            <dt><Clock3 size={14} /> Terakhir Diperbarui</dt>
            <dd>{updatedAt}</dd>
          </div>
        </dl>
      </section>

      <section className="material-detail-card material-detail-history">
        <div className="material-detail-card-heading">
          <div>
            <h2>Riwayat Transaksi</h2>
            <p>Catatan perubahan persediaan untuk bahan baku ini.</p>
          </div>
          <Link className="material-detail-history-link" to="/riwayat-transaksi">
            Lihat Semua Riwayat Transaksi <ArrowRight size={16} />
          </Link>
        </div>

        {materialTransactions.length === 0 ? (
          <div className="material-detail-history-empty" role="status">
            <span className="material-detail-history-icon"><History size={20} /></span>
            <p>Belum ada riwayat transaksi untuk bahan baku ini.</p>
          </div>
        ) : (
          <div className="transaction-history-table-scroll">
            <table className="transaction-history-table">
              <thead>
                <tr>
                  <th scope="col">Tanggal &amp; Waktu</th>
                  <th scope="col">Jenis Transaksi</th>
                  <th scope="col">Jumlah</th>
                  <th scope="col">Alasan</th>
                  <th scope="col">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {materialTransactions.map((transaction) => {
                  const isStockIn = transaction.type === 'Stok Masuk'
                  const amountSign = isStockIn ? '+' : '−'
                  return (
                    <tr key={transaction.id}>
                      <td className="transaction-history-date-time">
                        <span>{formatTransactionDate(transaction.date)}</span>
                        <span>{formatTwelveHourTime(transaction.time)}</span>
                      </td>
                      <td>
                        <span className={`transaction-history-badge transaction-history-badge--${isStockIn ? 'in' : 'out'}`}>
                          <i aria-hidden="true" />{transaction.type}
                        </span>
                      </td>
                      <td className={`transaction-history-quantity transaction-history-quantity--${isStockIn ? 'in' : 'out'}`}>
                        {amountSign}{formatQuantity(transaction.quantity)} {transaction.unit}
                      </td>
                      <td className="transaction-history-reason">{transaction.reason || '—'}</td>
                      <td className="transaction-history-notes">{transaction.notes?.trim() || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default DetailBahanBaku
