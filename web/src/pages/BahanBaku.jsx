import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { createPortal } from 'react-dom'
import { api } from '../api'
import {
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Eye,
} from 'lucide-react'
import { useToast } from '../components/ui/ToastProvider'

const PAGE_SIZE = 10
const statusOptions = ['Semua Status', 'Normal', 'Menipis', 'Kritis', 'Belum ditentukan']
const sortOptions = [
  { value: 'name-asc', label: 'Nama (A–Z)' },
  { value: 'name-desc', label: 'Nama (Z–A)' },
  { value: 'stock-asc', label: 'Stok tersedia (Terendah)' },
  { value: 'stock-desc', label: 'Stok tersedia (Tertinggi)' },
  { value: 'updated-desc', label: 'Terakhir diperbarui (Terbaru)' },
  { value: 'updated-asc', label: 'Terakhir diperbarui (Terlama)' },
]
const materialNameCollator = new Intl.Collator('id-ID', { sensitivity: 'base', numeric: true })

function getTimestampValue(value) {
  const match = typeof value === 'string'
    ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value)
    : null
  if (!match) return null

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue, zone] = match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const hour = Number(hourValue)
  const minute = Number(minuteValue)
  const second = Number(secondValue)
  const calendarDate = new Date(Date.UTC(year, month - 1, day))
  if (
    calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day
    || hour > 23
    || minute > 59
    || second > 59
  ) return null

  if (zone !== 'Z') {
    const offset = /[+-](\d{2}):(\d{2})$/.exec(zone)
    if (Number(offset[1]) > 23 || Number(offset[2]) > 59) return null
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function formatStock(value) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)
}

function getStatusKey(status) {
  return status.toLocaleLowerCase('id-ID').replaceAll(' ', '-')
}

function BahanBaku({ materials, setMaterials, reload }) {
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('Semua Status')
  const [sortBy, setSortBy] = useState('name-asc')
  const [page, setPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [actionMenuPosition, setActionMenuPosition] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const dialogRef = useRef(null)
  const actionMenuRef = useRef(null)
  const cancelDialogButtonRef = useRef(null)
  const deleteTriggerRef = useRef(null)
  const materialsTableRef = useRef(null)
  const focusListAfterCloseRef = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (pendingDelete && dialog && !dialog.open) {
      dialog.showModal()
      cancelDialogButtonRef.current?.focus()
    }
  }, [pendingDelete])

  useEffect(() => {
    if (!openMenuId) return undefined

    actionMenuRef.current?.querySelector('[role="menuitem"]')?.focus()

    function closeMenu(event) {
      if (event.target?.closest?.('.materials-action-menu')) return
      setOpenMenuId(null)
      setActionMenuPosition(null)
    }

    window.addEventListener('scroll', closeMenu, true)
    window.addEventListener('resize', closeMenu)
    return () => {
      window.removeEventListener('scroll', closeMenu, true)
      window.removeEventListener('resize', closeMenu)
    }
  }, [openMenuId])

  const activeMaterials = useMemo(
    () => materials.filter((material) => material.active),
    [materials],
  )

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID')
    return activeMaterials.filter((material) => {
      const matchesName = material.name.toLocaleLowerCase('id-ID').includes(normalizedQuery)
      const matchesStatus = statusFilter === 'Semua Status' || material.status === statusFilter
      return matchesName && matchesStatus
    })
  }, [activeMaterials, query, statusFilter])

  const sortedMaterials = useMemo(() => {
    const sorted = [...filteredMaterials]
    const descending = sortBy.endsWith('desc')

    sorted.sort((left, right) => {
      if (sortBy.startsWith('name')) {
        const comparison = materialNameCollator.compare(left.name, right.name)
        return descending ? -comparison : comparison
      }

      if (sortBy.startsWith('stock')) {
        const leftMissing = left.currentStock === null
        const rightMissing = right.currentStock === null
        if (leftMissing || rightMissing) {
          if (leftMissing && rightMissing) return 0
          return leftMissing ? 1 : -1
        }
        const comparison = left.currentStock - right.currentStock
        return descending ? -comparison : comparison
      }

      const leftTimestamp = getTimestampValue(left.updatedAt)
      const rightTimestamp = getTimestampValue(right.updatedAt)
      if (leftTimestamp === null || rightTimestamp === null) {
        if (leftTimestamp === null && rightTimestamp === null) return 0
        return leftTimestamp === null ? 1 : -1
      }
      const comparison = leftTimestamp - rightTimestamp
      return descending ? -comparison : comparison
    })

    return sorted
  }, [filteredMaterials, sortBy])

  const pageCount = Math.max(1, Math.ceil(sortedMaterials.length / PAGE_SIZE))
  const visiblePage = Math.min(page, pageCount)
  const compactPages = useMemo(() => {
    const pages = new Set([1, pageCount])
    for (let p = visiblePage - 1; p <= visiblePage + 1; p += 1) {
      if (p >= 1 && p <= pageCount) pages.add(p)
    }
    return [...pages].sort((a, b) => a - b)
  }, [visiblePage, pageCount])
  const pageItems = sortedMaterials.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE)
  const menuMaterial = pageItems.find((material) => material.id === openMenuId)
  const firstItem = sortedMaterials.length === 0 ? 0 : (visiblePage - 1) * PAGE_SIZE + 1
  const lastItem = Math.min(visiblePage * PAGE_SIZE, sortedMaterials.length)

  function updateQuery(value) {
    setQuery(value)
    setPage(1)
  }

  function updateStatus(value) {
    setStatusFilter(value)
    setPage(1)
  }

  function updateSort(value) {
    setSortBy(value)
    setPage(1)
  }

  function toggleActionMenu(materialId, event) {
    if (openMenuId === materialId) {
      setOpenMenuId(null)
      setActionMenuPosition(null)
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const menuWidth = 160
    const menuHeight = 160
    const margin = 8
    const left = Math.max(margin, Math.min(
      bounds.right - menuWidth,
      window.innerWidth - menuWidth - margin,
    ))
    let top = bounds.bottom + 6

    if (top + menuHeight > window.innerHeight - margin) {
      top = Math.max(margin, bounds.top - menuHeight - 6)
    }

    deleteTriggerRef.current = event.currentTarget
    setActionMenuPosition({ top, left })
    setOpenMenuId(materialId)
  }

  function openDeleteDialog(material) {
    focusListAfterCloseRef.current = false
    setPendingDelete(material)
    setOpenMenuId(null)
    setActionMenuPosition(null)
  }

  function handleActionMenuKeyDown(event) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    setOpenMenuId(null)
    setActionMenuPosition(null)
    deleteTriggerRef.current?.focus()
  }

  function closeDeleteDialog() {
    if (dialogRef.current?.open) dialogRef.current.close()
    setPendingDelete(null)
  }

  function handleDialogClose() {
    if (focusListAfterCloseRef.current || !deleteTriggerRef.current?.isConnected) {
      materialsTableRef.current?.focus()
      focusListAfterCloseRef.current = false
      return
    }

    deleteTriggerRef.current?.focus()
  }

  function handleDialogCancel(event) {
    event.preventDefault()
    closeDeleteDialog()
  }

  function handleDialogBackdropClick(event) {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const clickedOutside = event.clientX < bounds.left
      || event.clientX > bounds.right
      || event.clientY < bounds.top
      || event.clientY > bounds.bottom

    if (clickedOutside) closeDeleteDialog()
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await api.updateMaterial(pendingDelete.id, { active: false })
      await reload()
    } catch (error) {
      notify({ type: 'error', title: 'Gagal mengarsipkan', message: error.message })
      return
    }
    notify({
      type: 'success',
      title: 'Berhasil diarsipkan',
      message: 'Bahan baku berhasil dihapus dari daftar aktif.',
    })
    focusListAfterCloseRef.current = true
    deleteTriggerRef.current = null
    if (dialogRef.current?.open) dialogRef.current.close()
    setPendingDelete(null)
      setOpenMenuId(null)
    setActionMenuPosition(null)
      setActionMenuPosition(null)
  }

  return (
    <div className="materials-page">
      <div className="materials-heading">
        <div>
          <h1 className="materials-title">Bahan Baku</h1>
          <p className="materials-description">Kelola dan pantau seluruh persediaan bahan baku Kedai Bang Jun.</p>
        </div>
        <Link to="/bahan-baku/tambah" className="materials-add-button">
          <Plus size={16} />
          Tambah Bahan Baku
        </Link>
      </div>

      <section className="materials-table-card" aria-label="Daftar bahan baku">
        <div className="materials-toolbar">
          <label className="materials-search">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">Cari nama bahan baku</span>
            <input
              type="search"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="Cari nama bahan baku..."
            />
          </label>
          <label className="materials-filter-label">
            <span className="visually-hidden">Filter status stok</span>
            <select value={statusFilter} onChange={(event) => updateStatus(event.target.value)}>
              {statusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="materials-filter-label">
            <span className="visually-hidden">Urutkan bahan baku</span>
            <select value={sortBy} onChange={(event) => updateSort(event.target.value)}>
              {sortOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <p className="materials-total">
            <span>Total Bahan: <strong>{activeMaterials.length}</strong></span>
          </p>
        </div>

        <div className="materials-table-scroll" ref={materialsTableRef} tabIndex={-1}>
          <table className="materials-table">
            <thead>
              <tr>
                <th scope="col">Nama Bahan Baku</th>
                <th scope="col">Stok Saat Ini</th>
                <th scope="col">Stok Minimum</th>
                <th scope="col">Satuan</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="visually-hidden">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((material) => {
                const statusKey = getStatusKey(material.status)
                return (
                <tr key={material.id}>
                  <td className="materials-name">{material.name}</td>
                  <td className={`materials-stock materials-stock--${statusKey}`}>
                    {material.currentStock === null ? (
                      <span className="stock-unrecorded">
                        <strong>—</strong>
                        <small>Belum dicatat</small>
                      </span>
                    ) : formatStock(material.currentStock)}
                  </td>
                  <td className="materials-minimum">{formatStock(material.minimumStock)}</td>
                  <td className="materials-unit">{material.unit}</td>
                  <td><span className={`materials-status materials-status--${statusKey}`}>{material.status}</span></td>
                  <td className="materials-actions-cell">
                    <button
                      type="button"
                      className="materials-action-trigger"
                      aria-label={`Aksi untuk ${material.name}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === material.id}
                      aria-controls={openMenuId === material.id ? `materials-action-menu-${material.id}` : undefined}
                      onClick={(event) => toggleActionMenu(material.id, event)}
                    >
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
                )
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td className="materials-empty" colSpan="6">
                    {activeMaterials.length === 0 ? 'Belum ada bahan baku.' : 'Bahan baku tidak ditemukan.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="materials-pagination">
          <p>Menampilkan <strong>{firstItem}–{lastItem}</strong> dari <strong>{sortedMaterials.length}</strong> bahan baku</p>
          <nav aria-label="Navigasi halaman daftar bahan baku" className="materials-page-controls">
            <button type="button" disabled={visiblePage <= 1} onClick={() => setPage(visiblePage - 1)}>Sebelumnya</button>
            {compactPages.map((pageNumber, index) => (
              <Fragment key={pageNumber}>
                {index > 0 && pageNumber - compactPages[index - 1] > 1 && (
                  <span className="page-ellipsis" aria-hidden="true">…</span>
                )}
                <button
                  type="button"
                  className={pageNumber === visiblePage ? 'current' : ''}
                  aria-current={pageNumber === visiblePage ? 'page' : undefined}
                  aria-label={`Halaman ${pageNumber}`}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              </Fragment>
            ))}
            <button type="button" disabled={visiblePage >= pageCount} onClick={() => setPage(visiblePage + 1)}>Berikutnya</button>
          </nav>
        </div>
      </section>

      {menuMaterial && actionMenuPosition && createPortal(
          <div
            id={`materials-action-menu-${menuMaterial.id}`}
            ref={actionMenuRef}
            className="materials-action-menu"
            role="menu"
            style={{ top: actionMenuPosition.top, left: actionMenuPosition.left }}
            onKeyDown={handleActionMenuKeyDown}
          >
            <Link role="menuitem" to={`/bahan-baku/${menuMaterial.id}`} onClick={() => { setOpenMenuId(null); setActionMenuPosition(null) }}>
              <Eye size={15} /> Detail
            </Link>
            <Link role="menuitem" to={`/bahan-baku/${menuMaterial.id}/edit`} onClick={() => { setOpenMenuId(null); setActionMenuPosition(null) }}>
              <Pencil size={15} /> Edit
            </Link>
            <button role="menuitem" type="button" onClick={() => openDeleteDialog(menuMaterial)}>
              <Trash2 size={15} /> Hapus
            </button>
          </div>,
          document.body,
        )}

      <dialog
        ref={dialogRef}
        className="materials-dialog"
        aria-labelledby="delete-material-title"
        onCancel={handleDialogCancel}
        onClose={handleDialogClose}
        onClick={handleDialogBackdropClick}
      >
        {pendingDelete && (
          <>
            <h2 id="delete-material-title">Hapus bahan baku?</h2>
            <p>Bahan “{pendingDelete.name}” akan dihapus dari daftar aktif. Data tetap tersimpan di database agar referensi riwayat transaksi terjaga.</p>
            <div className="materials-dialog-actions">
              <button ref={cancelDialogButtonRef} type="button" className="materials-cancel-button" onClick={closeDeleteDialog}>Batal</button>
              <button type="button" className="materials-delete-button" onClick={confirmDelete}>Ya, Hapus</button>
            </div>
          </>
        )}
      </dialog>
    </div>
  )
}

export default BahanBaku
