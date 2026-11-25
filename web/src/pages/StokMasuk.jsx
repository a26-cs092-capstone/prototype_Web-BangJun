import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowDownToLine, Info } from 'lucide-react'
import { useToast } from '../components/ui/ToastProvider'
import { api } from '../api'

const WITA_TIME_ZONE = 'Asia/Makassar'

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

function StokMasuk({ materials, setMaterials, stockTransactions, setStockTransactions, reload }) {
  const [initialDateTime] = useState(getWitaDateTime)
  const [materialId, setMaterialId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(initialDateTime.date)
  const [time, setTime] = useState(initialDateTime.time)
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const { notify } = useToast()

  const activeMaterials = materials.filter((material) => material.active)
  const selectedMaterial = activeMaterials.find((material) => material.id === materialId)

  function updateField(field, setter, value) {
    setter(value)
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function submitTransaction(event) {
    event.preventDefault()
    const parsedQuantity = quantity === '' ? NaN : Number(quantity)
    const nextErrors = {}

    if (!selectedMaterial) nextErrors.materialId = 'Pilih bahan baku yang masih aktif.'
    if (quantity === '' || !Number.isFinite(parsedQuantity)) {
      nextErrors.quantity = 'Jumlah stok masuk wajib diisi dengan angka.'
    } else if (parsedQuantity <= 0) {
      nextErrors.quantity = 'Jumlah stok masuk harus lebih dari 0.'
    }
    if (!date) nextErrors.date = 'Tanggal transaksi wajib diisi.'
    if (!time) nextErrors.time = 'Waktu transaksi wajib diisi.'
    if (notes.length > 250) nextErrors.notes = 'Keterangan maksimal 250 karakter.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await api.stockIn({
        materialId: selectedMaterial.id,
        quantity: parsedQuantity,
        unit: selectedMaterial.unit,
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
      message: `Stok masuk untuk ${selectedMaterial.name} berhasil dicatat.`,
    })
    setMaterialId('')
    setQuantity('')
    setNotes('')
    const nextDateTime = getWitaDateTime()
    setDate(nextDateTime.date)
    setTime(nextDateTime.time)
    setErrors({})
  }

  const currentStockMessage = !selectedMaterial
    ? 'Pilih bahan baku untuk melihat stok saat ini.'
    : selectedMaterial.currentStock === null
      ? 'Stok saat ini: Belum dicatat.'
      : `Stok saat ini: ${formatStock(selectedMaterial.currentStock)} ${selectedMaterial.unit}.`

  return (
    <div className="stock-in-page">
      <Link className="stock-in-back" to="/bahan-baku">
        <span aria-hidden="true">←</span> Kembali ke Bahan Baku
      </Link>

      <header className="stock-in-heading">
        <h1>Stok Masuk</h1>
        <p>Catat penambahan persediaan bahan baku Kedai Bang Jun.</p>
      </header>

      <form className="stock-in-card" noValidate onSubmit={submitTransaction}>
        <div className="stock-in-card-heading">
          <h2>Informasi Transaksi</h2>
          <p>Lengkapi informasi bahan baku dan jumlah persediaan yang masuk.</p>
        </div>

        <div className="stock-in-fields">
          <div className="stock-in-field stock-in-field--full">
            <label htmlFor="stock-in-material">Bahan Baku <span aria-hidden="true">*</span></label>
            <select
              id="stock-in-material"
              value={materialId}
              aria-invalid={Boolean(errors.materialId)}
              aria-describedby={errors.materialId ? 'stock-in-material-error' : 'stock-in-current-stock'}
              onChange={(event) => updateField('materialId', setMaterialId, event.target.value)}
            >
              <option value="">Pilih bahan baku...</option>
              {activeMaterials.map((material) => (
                <option value={material.id} key={material.id}>{material.name}</option>
              ))}
            </select>
            {errors.materialId
              ? <span className="stock-in-error" id="stock-in-material-error">{errors.materialId}</span>
              : <span className="stock-in-current-stock" id="stock-in-current-stock"><Info size={14} />{currentStockMessage}</span>}
          </div>

          <div className="stock-in-field stock-in-field--full">
            <label htmlFor="stock-in-quantity">Jumlah Stok Masuk <span aria-hidden="true">*</span></label>
            <input
              id="stock-in-quantity"
              type="number"
              min="0.01"
              step="any"
              value={quantity}
              placeholder="Masukkan jumlah stok"
              aria-invalid={Boolean(errors.quantity)}
              aria-describedby={errors.quantity ? 'stock-in-quantity-error' : 'stock-in-quantity-help'}
              onChange={(event) => updateField('quantity', setQuantity, event.target.value)}
            />
            {errors.quantity
              ? <span className="stock-in-error" id="stock-in-quantity-error">{errors.quantity}</span>
              : <span className="stock-in-help" id="stock-in-quantity-help">Masukkan jumlah bahan baku yang ditambahkan ke persediaan.</span>}
          </div>

          <div className="stock-in-field">
            <label htmlFor="stock-in-date">Tanggal Transaksi <span aria-hidden="true">*</span></label>
            <input
              id="stock-in-date"
              type="date"
              value={date}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? 'stock-in-date-error' : 'stock-in-date-help'}
              onChange={(event) => updateField('date', setDate, event.target.value)}
            />
            {errors.date
              ? <span className="stock-in-error" id="stock-in-date-error">{errors.date}</span>
              : <span className="stock-in-help" id="stock-in-date-help">Tanggal stok masuk pasokan.</span>}
          </div>

          <div className="stock-in-field">
            <label htmlFor="stock-in-time">Waktu Transaksi <span aria-hidden="true">*</span></label>
            <input
              id="stock-in-time"
              type="time"
              lang="en-GB"
              value={time}
              aria-invalid={Boolean(errors.time)}
              aria-describedby={errors.time ? 'stock-in-time-error' : 'stock-in-time-help'}
              onChange={(event) => updateField('time', setTime, event.target.value)}
            />
            {errors.time
              ? <span className="stock-in-error" id="stock-in-time-error">{errors.time}</span>
              : <span className="stock-in-help" id="stock-in-time-help">Format 24 jam, Waktu Indonesia Tengah (WITA).</span>}
          </div>

          <div className="stock-in-field stock-in-field--full">
            <div className="stock-in-label-row">
              <label htmlFor="stock-in-notes">Keterangan <span>(Opsional)</span></label>
              <span className="stock-in-character-count">{notes.length}/250 karakter</span>
            </div>
            <textarea
              id="stock-in-notes"
              maxLength={250}
              value={notes}
              placeholder="Contoh: Pembelian bahan baku dari pemasok..."
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? 'stock-in-notes-error' : 'stock-in-notes-help'}
              onChange={(event) => updateField('notes', setNotes, event.target.value)}
            />
            {errors.notes
              ? <span className="stock-in-error" id="stock-in-notes-error">{errors.notes}</span>
              : <span className="stock-in-help" id="stock-in-notes-help">Tambahkan keterangan untuk memudahkan identifikasi transaksi.</span>}
          </div>
        </div>

        <div className="stock-in-actions">
          <Link className="stock-in-cancel" to="/bahan-baku">Batal</Link>
          <button className="stock-in-submit" type="submit">
            <ArrowDownToLine size={16} /> Simpan Stok Masuk
          </button>
        </div>
      </form>
    </div>
  )
}

export default StokMasuk
