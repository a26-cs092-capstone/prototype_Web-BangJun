import { supabase } from './store.js'
const { request } = supabase

const DEMO_MINIMUM = {
  B001: 10, B002: 5, B003: 8, B004: 10, B005: 10,
  B009: 2, B010: 2, B011: 2, B012: 2, B013: 50,
  B014: 15, B015: 20, B016: 10,
}
const GROUP = ['B006', 'B007', 'B008']

for (const [id, min] of Object.entries(DEMO_MINIMUM)) {
  await request('bahan_baku', {
    method: 'PATCH',
    params: { ingredient_id: `eq.${id}` },
    body: { stok_minimum: min },
  })
  console.log('minimum', id, min)
}
for (const id of GROUP) {
  await request('bahan_baku', {
    method: 'PATCH',
    params: { ingredient_id: `eq.${id}` },
    body: { is_aktif: false },
  })
  console.log('nonaktif', id)
}
console.log('done')
