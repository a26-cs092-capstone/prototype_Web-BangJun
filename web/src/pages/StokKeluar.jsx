import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpFromLine, Info } from 'lucide-react'
import { useToast } from '../components/ui/ToastProvider'
import { api } from '../api'

const WITA_TIME_ZONE = 'Asia/Makassar'
const stockOutReasons = [
  'Penggunaan operasional',
  'Bahan rusak',
  'Bahan kadaluwarsa',
  'Bahan terbuang',
  'Lainnya',
]

function getWitaDateTime() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WITA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

function formatStock(value) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)
}

function StokKeluar({ materials, setMaterials, stockTransactions, setStockTransactions, reload }) {
  const [initialDateTime] = useState(getWitaDateTime)
  const [materialId, setMaterialId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(initialDateTime.date)
  const [time, setTime] = useState(initialDateTime.time)
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const { notify } = useToast()

  const activeMaterials = materials.filter((material) => material.active)
  const selectedMaterial = activeMaterials.find((material) => material.id === materialId)
  const parsedQuantity = quantity === '' ? NaN : Number(quantity)
  const eligibleMaterials = activeMaterials.filter((material) => (
    typeof material.currentStock === 'number'
    && Number.isFinite(material.currentStock)
    && material.currentStock > 0
  ))

  function updateField(field, setter, value) {
    setter(value)
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function submitTransaction(event) {
    event.preventDefault()
    const nextErrors = {}
    const selectedIsEligible = selectedMaterial
      && typeof selectedMaterial.currentStock === 'number'
      && Number.isFinite(selectedMaterial.currentStock)
      && selectedMaterial.currentStock > 0

    if (!selectedIsEligible) nextErrors.materialId = 'Pilih bahan baku aktif dengan stok yang sudah dicatat.'
    if (quantity === '' || !Number.isFinite(parsedQuantity)) {
      nextErrors.quantity = 'Jumlah stok keluar wajib diisi dengan angka.'
    } else if (parsedQuantity <= 0) {
      nextErrors.quantity = 'Jumlah stok keluar harus lebih dari 0.'
    } else if (selectedIsEligible && parsedQuantity > selectedMaterial.currentStock) {
      nextErrors.quantity = 'Jumlah stok keluar melebihi stok yang tersedia.'
    }
    if (!reason) nextErrors.reason = 'Pilih alasan stok keluar.'
    if (!date) nextErrors.date = 'Tanggal transaksi wajib diisi.'
    if (!time) nextErrors.time = 'Waktu transaksi wajib diisi.'
    if (notes.length > 250) nextErrors.notes = 'Keterangan maksimal 250 karakter.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await api.stockOut({
        materialId: selectedMaterial.id,
        quantity: parsedQuantity,
        unit: selectedMaterial.unit,
        reason,
        date,
        time,
        notes: notes.trim(),
      })
      await reload()
    } catch (error) {
      notify({ type: 'error', title: 'Gagal menyimpan', message: error.message })
      return
    }

    notify({
      type: 'success',
      title: 'Berhasil disimpan',
      message: `Stok keluar untuk ${selectedMaterial.name} berhasil dicatat.`,
    })

    setMaterialId('')
    setQuantity('')
    setReason('')
    setNotes('')
    const nextDateTime = getWitaDateTime()
    setDate(nextDateTime.date)
    setTime(nextDateTime.time)
    setErrors({})
  }

  const availableStockMessage = !selectedMaterial
    ? 'Pilih bahan baku untuk melihat stok tersedia.'
    : `Stok tersedia: ${formatStock(selectedMaterial.currentStock)} ${selectedMaterial.unit}.`

  return (
    <div className="stock-out-page">
      <Link className="stock-out-back" to="/bahan-baku">
        <span aria-hidden="true">←</span> Kembali ke Bahan Baku
      </Link>

      <header className="stock-out-heading">
        <h1>Stok Keluar</h1>
        <p>Catat pengurangan persediaan bahan baku Kedai Bang Jun.</p>
      </header>

      <form className="stock-out-card" noValidate onSubmit={submitTransaction}>
        <div className="stock-out-card-heading">
          <h2>Informasi Transaksi</h2>
          <p>Lengkapi informasi bahan baku dan jumlah persediaan yang digunakan.</p>
        </div>

        <div className="stock-out-fields">
          <div className="stock-out-field stock-out-field--full">
            <label htmlFor="stock-out-material">Bahan Baku <span aria-hidden="true">*</span></label>
            <select
              id="stock-out-material"
              value={materialId}
              aria-invalid={Boolean(errors.materialId)}
              aria-describedby={errors.materialId ? 'stock-out-material-error' : 'stock-out-available-stock'}
              onChange={(event) => updateField('materialId', setMaterialId, event.target.value)}
            >
              <option value="">Pilih bahan baku...</option>
              {activeMaterials.map((material) => {
                const recorded = typeof material.currentStock === 'number'
                  && Number.isFinite(material.currentStock)
                const unavailableReason = !recorded
                  ? 'Belum dicatat'
                  : material.currentStock === 0
                    ? 'Stok 0'
                    : ''
                return (
                  <option value={material.id} key={material.id} disabled={!recorded || material.currentStock === 0}>
                    {material.name}{unavailableReason ? ` — ${unavailableReason}` : ''}
                  </option>
                )
              })}
            </select>
            {errors.materialId
              ? <span className="stock-out-error" id="stock-out-material-error">{errors.materialId}</span>
              : <span className="stock-out-available-stock" id="stock-out-available-stock"><Info size={14} />{availableStockMessage}</span>}
            {eligibleMaterials.length === 0 && !errors.materialId && (
              <span className="stock-out-help">Belum ada bahan baku aktif dengan stok yang bisa digunakan.</span>
            )}
          </div>

          <div className="stock-out-field stock-out-field--full">
            <label htmlFor="stock-out-quantity">Jumlah Stok Keluar <span aria-hidden="true">*</span></label>
            <input
              id="stock-out-quantity"
              type="number"
              min="0.01"
              step="any"
              max={selectedMaterial?.currentStock ?? undefined}
              value={quantity}
              placeholder="Masukkan jumlah stok"
              aria-invalid={Boolean(errors.quantity)}
              aria-describedby={errors.quantity ? 'stock-out-quantity-error' : 'stock-out-quantity-help'}
              onChange={(event) => updateField('quantity', setQuantity, event.target.value)}
            />
            {errors.quantity
              ? <span className="stock-out-error" id="stock-out-quantity-error">{errors.quantity}</span>
              : <span className="stock-out-help" id="stock-out-quantity-help">Jumlah tidak boleh melebihi stok tersedia.</span>}
          </div>

          <div className="stock-out-field stock-out-field--full">
            <label htmlFor="stock-out-reason">Alasan <span aria-hidden="true">*</span></label>
            <select
              id="stock-out-reason"
              value={reason}
              aria-invalid={Boolean(errors.reason)}
              aria-describedby={errors.reason ? 'stock-out-reason-error' : undefined}
              onChange={(event) => updateField('reason', setReason, event.target.value)}
            >
              <option value="">Pilih alasan</option>
              {stockOutReasons.map((option) => <option value={option} key={option}>{option}</option>)}
            </select>
            {errors.reason && <span className="stock-out-error" id="stock-out-reason-error">{errors.reason}</span>}
          </div>

          <div className="stock-out-field">
            <label htmlFor="stock-out-date">Tanggal Transaksi <span aria-hidden="true">*</span></label>
            <input
              id="stock-out-date"
              type="date"
              value={date}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? 'stock-out-date-error' : 'stock-out-date-help'}
              onChange={(event) => updateField('date', setDate, event.target.value)}
            />
            {errors.date
              ? <span className="stock-out-error" id="stock-out-date-error">{errors.date}</span>
              : <span className="stock-out-help" id="stock-out-date-help">Tanggal pencatatan penggunaan bahan.</span>}
          </div>

          <div className="stock-out-field">
            <label htmlFor="stock-out-time">Waktu Transaksi <span aria-hidden="true">*</span></label>
            <input
              id="stock-out-time"
              type="time"
              lang="en-GB"
              value={time}
              aria-invalid={Boolean(errors.time)}
              aria-describedby={errors.time ? 'stock-out-time-error' : 'stock-out-time-help'}
              onChange={(event) => updateField('time', setTime, event.target.value)}
            />
            {errors.time
              ? <span className="stock-out-error" id="stock-out-time-error">{errors.time}</span>
              : <span className="stock-out-help" id="stock-out-time-help">Format 24 jam, Waktu Indonesia Tengah (WITA).</span>}
          </div>

          <div className="stock-out-field stock-out-field--full">
            <div className="stock-out-label-row">
              <label htmlFor="stock-out-notes">Keterangan <span>(Opsional)</span></label>
              <span className="stock-out-character-count">{notes.length}/250 karakter</span>
            </div>
            <textarea
              id="stock-out-notes"
              maxLength={250}
              value={notes}
              placeholder="Contoh: Penggunaan operasional dapur..."
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? 'stock-out-notes-error' : 'stock-out-notes-help'}
              onChange={(event) => updateField('notes', setNotes, event.target.value)}
            />
            {errors.notes
              ? <span className="stock-out-error" id="stock-out-notes-error">{errors.notes}</span>
              : <span className="stock-out-help" id="stock-out-notes-help">Tambahkan alasan atau keterangan penggunaan bahan.</span>}
          </div>
        </div>

        <div className="stock-out-actions">
          <Link className="stock-out-cancel" to="/bahan-baku">Batal</Link>
          <button className="stock-out-submit" type="submit">
            <ArrowUpFromLine size={16} /> Simpan Stok Keluar
          </button>
        </div>
      </form>
    </div>
  )
}

export default StokKeluar
