import MaterialForm from '../components/materials/MaterialForm'

function TambahBahanBaku({ materials, setMaterials, reload }) {
  return (
    <MaterialForm
      mode="add"
      materials={materials}
      setMaterials={setMaterials}
      reload={reload}
    />
  )
}

export default TambahBahanBaku
