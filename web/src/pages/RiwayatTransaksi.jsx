import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Eye, History, Search } from 'lucide-react'

const PAGE_SIZE = 8
const transactionTypes = ['Semua Transaksi', 'Stok Masuk', 'Stok Keluar']

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

function RiwayatTransaksi({ stockTransactions }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('Semua Transaksi')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  const sortedTransactions = useMemo(
    () => [...stockTransactions].sort((left, right) => (
      transactionDateTimeKey(right).localeCompare(transactionDateTimeKey(left))
      || String(right.id).localeCompare(String(left.id))
    )),
    [stockTransactions],
  )

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID')
    return sortedTransactions.filter((transaction) => {
      const matchesName = (transaction.materialName || '')
        .toLocaleLowerCase('id-ID')
        .includes(normalizedQuery)
      const matchesType = typeFilter === 'Semua Transaksi' || transaction.type === typeFilter
      const matchesStart = !startDate || transaction.date >= startDate
      const matchesEnd = !endDate || transaction.date <= endDate
      return matchesName && matchesType && matchesStart && matchesEnd
    })
  }, [sortedTransactions, query, typeFilter, startDate, endDate])

  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const visiblePage = Math.min(page, pageCount)
  const pageTransactions = filteredTransactions.slice(
    (visiblePage - 1) * PAGE_SIZE,
    visiblePage * PAGE_SIZE,
  )
  const firstItem = filteredTransactions.length === 0 ? 0 : (visiblePage - 1) * PAGE_SIZE + 1
  const lastItem = Math.min(visiblePage * PAGE_SIZE, filteredTransactions.length)

  function updateFilter(setter, value) {
    setter(value)
    setPage(1)
  }

  return (
    <div className="transaction-history-page">
      <header className="transaction-history-heading">
        <h1>Riwayat Transaksi</h1>
        <p>Pantau seluruh aktivitas stok masuk dan stok keluar bahan baku Kedai Bang Jun.</p>
      </header>

      <section className="transaction-history-card" aria-label="Daftar riwayat transaksi">
        <div className="transaction-history-toolbar">
          <label className="transaction-history-search">
            <Search size={17} aria-hidden="true" />
            <span className="visually-hidden">Cari nama bahan baku</span>
            <input
              type="search"
              value={query}
              onChange={(event) => updateFilter(setQuery, event.target.value)}
              placeholder="Cari nama bahan baku..."
            />
          </label>

          <label className="transaction-history-filter">
            <span className="visually-hidden">Filter jenis transaksi</span>
            <select value={typeFilter} onChange={(event) => updateFilter(setTypeFilter, event.target.value)}>
              {transactionTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>

          <div className="transaction-history-date-filters" role="group" aria-label="Filter rentang tanggal transaksi">
            <label>
              <span>Dari tanggal</span>
              <input type="date" value={startDate} onChange={(event) => updateFilter(setStartDate, event.target.value)} />
            </label>
            <label>
              <span>Sampai tanggal</span>
              <input type="date" value={endDate} onChange={(event) => updateFilter(setEndDate, event.target.value)} />
            </label>
          </div>

          <p className="transaction-history-total">
            <span>Total Transaksi: <strong>{stockTransactions.length} Catatan</strong></span>
          </p>
        </div>

        <div className="transaction-history-table-scroll" tabIndex={0} aria-label="Tabel riwayat transaksi, dapat digulir ke samping">
          <table className="transaction-history-table">
            <thead>
              <tr>
                <th scope="col">Tanggal &amp; Waktu</th>
                <th scope="col">Bahan Baku</th>
                <th scope="col">Jenis Transaksi</th>
                <th scope="col">Jumlah</th>
                <th scope="col">Alasan</th>
                <th scope="col">Keterangan</th>
                <th scope="col"><span className="visually-hidden">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {pageTransactions.map((transaction) => {
                const isStockIn = transaction.type === 'Stok Masuk'
                return (
                  <tr key={transaction.id}>
                    <td className="transaction-history-date-time">
                      <span>{formatTransactionDate(transaction.date)}</span>
                      <span>{formatTwelveHourTime(transaction.time)}</span>
                    </td>
                    <td className="transaction-history-material">{transaction.materialName || '—'}</td>
                    <td>
                      <span className={`transaction-history-badge transaction-history-badge--${isStockIn ? 'in' : 'out'}`}>
                        <i aria-hidden="true" />{transaction.type}
                      </span>
                    </td>
                    <td className={`transaction-history-quantity transaction-history-quantity--${isStockIn ? 'in' : 'out'}`}>
                      {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(transaction.quantity)} {transaction.unit}
                    </td>
                    <td className="transaction-history-reason">{transaction.reason || '—'}</td>
                    <td className="transaction-history-notes">{transaction.notes?.trim() || '—'}</td>
                    <td className="transaction-history-action">
                      <Link
                        to={`/riwayat-transaksi/${encodeURIComponent(transaction.id)}`}
                        aria-label={`Lihat detail transaksi ${transaction.id}`}
                        title="Lihat detail transaksi"
                      >
                        <Eye size={18} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {pageTransactions.length === 0 && (
                <tr>
                  <td className="transaction-history-empty-cell" colSpan="7">
                    {stockTransactions.length === 0 ? (
                      <div className="transaction-history-empty">
                        <span className="transaction-history-empty-icon"><History size={20} /></span>
                        <strong>Belum ada transaksi</strong>
                        <span>Transaksi stok masuk dan stok keluar akan muncul di sini.</span>
                      </div>
                    ) : (
                      <div className="transaction-history-empty">
                        <strong>Transaksi tidak ditemukan</strong>
                        <span>Coba ubah pencarian atau filter yang dipilih.</span>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="transaction-history-pagination">
          <p>Menampilkan <strong>{firstItem}–{lastItem}</strong> dari <strong>{filteredTransactions.length}</strong> transaksi</p>
          <nav className="transaction-history-page-controls" aria-label="Navigasi halaman riwayat transaksi">
            <button type="button" disabled={visiblePage <= 1} onClick={() => setPage(visiblePage - 1)}>Sebelumnya</button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button
                type="button"
                key={pageNumber}
                className={pageNumber === visiblePage ? 'current' : ''}
                aria-current={pageNumber === visiblePage ? 'page' : undefined}
                aria-label={`Halaman ${pageNumber}`}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button type="button" disabled={visiblePage >= pageCount} onClick={() => setPage(visiblePage + 1)}>Berikutnya</button>
          </nav>
        </div>
      </section>
    </div>
  )
}

export default RiwayatTransaksi
