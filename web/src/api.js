const BASE = '/api/v1'

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal.')
  return data
}

export const api = {
  getMaterials: () => request('/materials'),
  getMaterial: (id) => request(`/materials/${id}`),
  getTransactions: () => request('/transactions?pageSize=2000').then((d) => d.items),
  createMaterial: (body) => request('/materials', { method: 'POST', body: JSON.stringify(body) }),
  updateMaterial: (id, body) => request(`/materials/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  stockIn: (body) => request('/transactions/stock-in', { method: 'POST', body: JSON.stringify(body) }),
  stockOut: (body) => request('/transactions/stock-out', { method: 'POST', body: JSON.stringify(body) }),
}
