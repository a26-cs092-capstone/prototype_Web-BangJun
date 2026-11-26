import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertCircle, Check, Info, Package } from 'lucide-react'
import { useToast } from '../ui/ToastProvider'
import { api } from '../../api'
import { containsEmoji } from '../../validation'

const units = ['kg', 'gram', 'liter', 'ml', 'bungkus', 'pack', 'karung', 'piring', 'butir']

function formatUpdatedAt(value) {
  if (typeof value !== 'string') return 'Belum tersedia'
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match) return 'Belum tersedia'

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue] = match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const calendarDate = new Date(Date.UTC(year, month - 1, day))
  if (
    calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day
    || Number(hourValue) > 23
    || Number(minuteValue) > 59
    || Number(secondValue) > 59
    || !Number.isFinite(Date.parse(value))
  ) return 'Belum tersedia'

  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Makassar',
  }).format(new Date(value))

  return `${formatted} WITA`
}

function nextMaterialId(materials) {
  const largestId = materials.reduce((largest, material) => {
    const number = Number(material.id.match(/^mat-(\d+)$/)?.[1] ?? 0)
    return Math.max(largest, number)
  }, 0)

  return `mat-${String(largestId + 1).padStart(3, '0')}`
}

function MaterialForm({ mode, materials, setMaterials, material, reload }) {
  const isEdit = mode === 'edit'
  const unitLocked = isEdit && material.currentStock !== null
  const navigate = useNavigate()
  const { notify } = useToast()
  const [name, setName] = useState(material?.name ?? '')
  const [unit, setUnit] = useState(material?.unit ?? '')
  const [minimumStock, setMinimumStock] = useState(
    material ? String(material.minimumStock) : '',
  )
  const [errors, setErrors] = useState({})

  async function submitForm(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    const normalizedName = trimmedName.toLocaleLowerCase('id-ID')
    const duplicate = materials.some((item) => (
      item.id !== material?.id && item.name.trim().toLocaleLowerCase('id-ID') === normalizedName
    ))
    const parsedMinimum = minimumStock === '' ? NaN : Number(minimumStock)
    const nextErrors = {}

    if (!trimmedName) nextErrors.name = 'Nama bahan baku wajib diisi.'
    else if (trimmedName.length > 60) nextErrors.name = 'Nama bahan baku maksimal 60 karakter.'
    else if (duplicate) nextErrors.name = 'Nama bahan baku sudah digunakan.'
    else if (containsEmoji(trimmedName)) nextErrors.name = 'Emoji tidak diperbolehkan pada nama bahan baku.'

    if (!unit) nextErrors.unit = 'Satuan wajib dipilih.'
    if (minimumStock === '' || !Number.isFinite(parsedMinimum)) {
      nextErrors.minimumStock = 'Stok minimum wajib diisi dengan angka.'
    } else if (parsedMinimum < 0) {
      nextErrors.minimumStock = 'Stok minimum tidak boleh bernilai negatif.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      if (isEdit) {
        await api.updateMaterial(material.id, { name: trimmedName, unit, minimumStock: parsedMinimum })
      } else {
        await api.createMaterial({ name: trimmedName, unit, minimumStock: parsedMinimum })
      }
      await reload()
    } catch (error) {
      notify({ type: 'error', title: 'Gagal menyimpan', message: error.message })
      return
    }

    notify({
      type: 'success',
      title: isEdit ? 'Berhasil diperbarui' : 'Berhasil ditambahkan',
      message: isEdit
        ? 'Data bahan baku berhasil diperbarui.'
        : 'Data bahan baku berhasil ditambahkan.',
    })
    navigate('/bahan-baku')
  }

  const heading = isEdit ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'
  const helper = isEdit
    ? 'Perbarui informasi bahan baku yang tersimpan dalam persediaan Kedai Bang Jun.'
    : 'Tambahkan data bahan baku baru ke dalam persediaan Kedai Bang Jun.'

  return (
    <div className={`material-form-page material-form-page--${mode}`}>
      <Link className="material-form-back" to="/bahan-baku">
        <span aria-hidden="true">←</span> Kembali ke Bahan Baku
      </Link>

      <header className="material-form-heading">
        <h1>{heading}</h1>
        <p>{helper}</p>
      </header>

      <form className="material-form-card" noValidate onSubmit={submitForm}>
        <div className="material-form-card-heading">
          <h2>Informasi Bahan Baku</h2>
          <p>{isEdit
            ? 'Ubah informasi dasar bahan baku yang tersimpan dalam persediaan.'
            : 'Lengkapi informasi dasar bahan baku yang ingin ditambahkan.'}
          </p>
        </div>

        <div className="material-form-fields">
          <div className="material-form-field material-form-field--full">
            <div className="material-form-label-row">
              <label htmlFor="material-name">{isEdit ? 'NAMA BAHAN BAKU' : 'Nama Bahan Baku'} <span aria-hidden="true">*</span></label>
              <span className="material-form-character-count">
                {isEdit ? 'Maks. 60 Karakter' : 'Maks. 60 karakter'}
              </span>
            </div>
            <input
              id="material-name"
              name="name"
              type="text"
              maxLength={60}
              value={name}
              placeholder="Contoh: Beras Ramos Premium"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'material-name-error' : 'material-name-help'}
              onChange={(event) => setName(event.target.value)}
            />
            {errors.name
              ? <span className="material-form-error" id="material-name-error"><AlertCircle size={14} />{errors.name}</span>
              : <span className="material-form-help" id="material-name-help">Gunakan nama bahan baku yang mudah dikenali.</span>}
          </div>

          <div className="material-form-field">
            <label htmlFor="material-unit">{isEdit ? 'SATUAN' : 'Satuan'} <span aria-hidden="true">*</span></label>
            <select
              id="material-unit"
              name="unit"
              value={unit}
              disabled={unitLocked}
              aria-invalid={Boolean(errors.unit)}
              aria-describedby={unitLocked ? 'material-unit-locked' : errors.unit ? 'material-unit-error' : 'material-unit-help'}
              onChange={(event) => setUnit(event.target.value)}
            >
              <option value="">Pilih satuan</option>
              {units.map((option) => <option value={option} key={option}>{option}</option>)}
            </select>
            {unitLocked
              ? <span className="material-form-help" id="material-unit-locked">Satuan tidak dapat diubah karena stok bahan sudah dicatat.</span>
              : errors.unit
              ? <span className="material-form-error" id="material-unit-error"><AlertCircle size={14} />{errors.unit}</span>
              : <span className="material-form-help" id="material-unit-help">Pilih satuan yang digunakan untuk menghitung persediaan.</span>}
          </div>

          <div className="material-form-field">
            <label htmlFor="material-minimum">{isEdit ? 'STOK MINIMUM' : 'Stok Minimum'} <span aria-hidden="true">*</span></label>
            <div className="material-form-number-wrap">
              <input
                id="material-minimum"
                name="minimumStock"
                type="number"
                min="0"
                step="any"
                value={minimumStock}
                placeholder="Contoh: 10"
                aria-invalid={Boolean(errors.minimumStock)}
                aria-describedby={errors.minimumStock ? 'material-minimum-error' : 'material-minimum-help'}
                onChange={(event) => setMinimumStock(event.target.value)}
              />
              <span>{unit ? unit.toUpperCase() : isEdit ? material.unit.toUpperCase() : 'Satuan'}</span>
            </div>
            {errors.minimumStock
              ? <span className="material-form-error" id="material-minimum-error"><AlertCircle size={14} />{errors.minimumStock}</span>
              : <span className="material-form-help" id="material-minimum-help">Batas minimum persediaan sebelum bahan baku mendapatkan status peringatan.</span>}
          </div>
        </div>

        {isEdit ? (
          <section className="material-current-stock" aria-label="Informasi stok saat ini">
            <div className="material-current-stock-heading">
              <h3><Package size={15} /> INFORMASI STOK SAAT INI</h3>
              <span>Terakhir diperbarui: {formatUpdatedAt(material.updatedAt)}</span>
            </div>
            <div className="material-current-stock-values">
              <div>
                <span>Stok Saat Ini</span>
                {material.currentStock === null ? (
                  <span className="stock-unrecorded"><strong>—</strong><small>Belum dicatat</small></span>
                ) : (
                  <strong>{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(material.currentStock)} <small>{material.unit}</small></strong>
                )}
              </div>
              <div>
                <span>Status Persediaan</span>
                <strong className={`material-form-status material-form-status--${material.status.toLowerCase().replaceAll(' ', '-')}`}>
                  <i aria-hidden="true" /> {material.status}
                </strong>
              </div>
            </div>
          </section>
        ) : (
          <div className="material-form-note">
            <Info size={15} />
            <p><strong>Catatan:</strong> Stok awal tidak diisi pada formulir ini. Setelah bahan baku berhasil ditambahkan, catat jumlah stok yang tersedia melalui menu Stok Masuk agar seluruh perubahan persediaan tercatat dalam riwayat transaksi.</p>
          </div>
        )}

        <div className="material-form-actions">
          <Link className="material-form-cancel" to="/bahan-baku">Batal</Link>
          <button className="material-form-submit" type="submit">
            {isEdit ? <><Check size={15} /> Simpan Perubahan</> : <><Check size={15} /> Simpan Bahan Baku</>}
          </button>
        </div>
      </form>
    </div>
  )
}

export default MaterialForm
