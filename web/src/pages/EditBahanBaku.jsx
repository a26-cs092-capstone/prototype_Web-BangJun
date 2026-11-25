import { Link, useParams } from 'react-router'
import MaterialForm from '../components/materials/MaterialForm'

function EditBahanBaku({ materials, setMaterials, reload }) {
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

  return (
    <MaterialForm
      key={material.id}
      mode="edit"
      material={material}
      materials={materials}
      setMaterials={setMaterials}
      reload={reload}
    />
  )
}

export default EditBahanBaku
