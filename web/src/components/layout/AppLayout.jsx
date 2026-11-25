
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Bot,
} from 'lucide-react'

import logoBangJun from '../../assets/logo-bang-jun.png'

const navigation = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Bahan Baku',
    path: '/bahan-baku',
    icon: Package,
  },
  {
    label: 'Stok Masuk',
    path: '/stok-masuk',
    icon: ArrowDownToLine,
  },
  {
    label: 'Stok Keluar',
    path: '/stok-keluar',
    icon: ArrowUpFromLine,
  },
  {
    label: 'Riwayat Transaksi',
    path: '/riwayat-transaksi',
    icon: History,
  },
  {
    label: 'AI Stock Assistant',
    path: '/ai-assistant',
    icon: Bot,
  },
]

const pageTitles = {
  '/': 'Dashboard',
  '/bahan-baku': 'Bahan Baku',
  '/stok-masuk': 'Stok Masuk',
  '/stok-keluar': 'Stok Keluar',
  '/riwayat-transaksi': 'Riwayat Transaksi',
  '/ai-assistant': 'AI Stock Assistant',
}

function AppLayout() {
  const location = useLocation()
  const materialRoute = location.pathname.match(/^\/bahan-baku(?:\/([^/]+))?(?:\/(edit))?$/)
  const transactionDetailRoute = location.pathname.match(/^\/riwayat-transaksi\/([^/]+)$/)
  let breadcrumbs = [{ label: 'Beranda', to: '/' }]

  if (materialRoute) {
    breadcrumbs.push({ label: 'Bahan Baku', to: '/bahan-baku' })
    if (location.pathname === '/bahan-baku/tambah') breadcrumbs.push({ label: 'Tambah Bahan Baku' })
    else if (materialRoute[1] && materialRoute[2] === 'edit') {
      breadcrumbs.push({ label: 'Detail Bahan Baku', to: `/bahan-baku/${materialRoute[1]}` })
      breadcrumbs.push({ label: 'Edit Bahan Baku' })
    } else if (materialRoute[1]) breadcrumbs.push({ label: 'Detail Bahan Baku' })
  } else if (transactionDetailRoute) {
    breadcrumbs.push({ label: 'Riwayat Transaksi', to: '/riwayat-transaksi' })
    breadcrumbs.push({ label: 'Detail Transaksi' })
  } else {
    breadcrumbs.push({ label: pageTitles[location.pathname] || 'Halaman' })
  }
  const currentPage = breadcrumbs[breadcrumbs.length - 1].label

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <aside className="app-sidebar">

        {/* Brand */}
        <div className="sidebar-brand">
          <img
            src={logoBangJun}
            alt="Logo Kedai Bang Jun"
            className="sidebar-brand-logo"
          />

          <div className="sidebar-brand-info">
            <h1>Kedai Bang Jun</h1>
            <p>Sistem Stok Kedai</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-navigation">
          <p className="sidebar-section-label">
            Menu Utama
          </p>

          <div className="sidebar-menu">
            {navigation.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    isActive
                      ? 'sidebar-link active'
                      : 'sidebar-link'
                  }
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <p>Sistem Informasi Manajemen Stok</p>
          <p>Kedai Bang Jun © 2026</p>
        </div>

      </aside>

        {/* Main Content */}
        <main className="app-main">

        <header className="app-header">
            <div className="breadcrumb">
            <span className="breadcrumb-home">
                Beranda
            </span>

            <span className="breadcrumb-separator">
                ›
            </span>

            {breadcrumbs.slice(1, -1).map((crumb) => (
              <span className="breadcrumb-ancestor" key={crumb.label}>
                <Link className="breadcrumb-home" to={crumb.to}>{crumb.label}</Link>
                <span className="breadcrumb-separator" aria-hidden="true">›</span>
              </span>
            ))}

            <span className="breadcrumb-current">
                {currentPage}
            </span>
            </div>
        </header>

        <div className="app-content">
          <Outlet />
        </div>

      </main>

    </div>
  )
}

export default AppLayout
