import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import './DashboardPage.scss'

const DashboardPage = () => {
  const { t, i18n } = useTranslation()
  const { data: batches = [], isLoading: batchesLoading, error: batchesError } = useQuery({
    queryKey: ['dashboard', 'batches'],
    queryFn: async () => {
      const res = await api.get('/batches')
      return res.data
    },
  })

  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['dashboard', 'orders'],
    queryFn: async () => {
      const res = await api.get('/orders')
      return res.data
    },
  })

  const { data: customers = [], isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['dashboard', 'customers'],
    queryFn: async () => {
      const res = await api.get('/customers')
      return res.data
    },
  })

  const { data: contracts = [], isLoading: contractsLoading, error: contractsError } = useQuery({
    queryKey: ['dashboard', 'contracts'],
    queryFn: async () => {
      const res = await api.get('/contracts')
      return res.data
    },
  })

  const { data: stock = [], isLoading: stockLoading, error: stockError } = useQuery({
    queryKey: ['dashboard', 'stock'],
    queryFn: async () => {
      const res = await api.get('/stock')
      return res.data
    },
  })

  const { data: movements = [], isLoading: movementsLoading, error: movementsError } = useQuery({
    queryKey: ['dashboard', 'movements'],
    queryFn: async () => {
      const res = await api.get('/inventory-movements')
      return res.data
    },
  })

  const isLoading = batchesLoading || ordersLoading || customersLoading || stockLoading || contractsLoading || movementsLoading
  const hasError = batchesError || ordersError || customersError || stockError || contractsError || movementsError

  const totalStock = stock.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
  const reservedStock = stock.reduce((sum: number, item: any) => sum + (item.reserved || 0), 0)

  const activeBatches = batches.filter((batch: any) => batch.status === 'ACTIVE').length
  const pendingOrders = orders.filter((order: any) => order.status === 'NEW').length
  const activeContracts = contracts.filter((contract: any) => String(contract.status || '').toUpperCase() === 'ACTIVE').length

  const recentCustomers = [...customers]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const movementTypeLabels: Record<string, string> = {
    RECEIPT: t('dashboard.movements.types.RECEIPT'),
    ISSUE: t('dashboard.movements.types.ISSUE'),
    RESERVE: t('dashboard.movements.types.RESERVE'),
  }

  const recentMovements = [...movements]
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const formatDate = (value?: string) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')
  }

  if (isLoading) {
    return <div className="dashboard-state">{t('dashboard.loading')}</div>
  }

  if (hasError) {
    return <div className="dashboard-state error">{t('dashboard.error')}</div>
  }

  return (
    <div className="dashboard-page">
      <section className="summary-grid">
        <div className="summary-card">
          <p className="summary-label">{t('dashboard.metrics.totalBatches')}</p>
          <h2>{batches.length}</h2>
          <span className="summary-meta">{t('dashboard.metrics.activeBatches', { count: activeBatches })}</span>
        </div>
        <div className="summary-card">
          <p className="summary-label">{t('dashboard.metrics.warehouseStock')}</p>
          <h2>{totalStock.toFixed(1)}</h2>
          <span className="summary-meta">{t('dashboard.metrics.inReserve', { count: reservedStock.toFixed(1) })}</span>
        </div>
        <div className="summary-card">
          <p className="summary-label">{t('dashboard.metrics.orders')}</p>
          <h2>{orders.length}</h2>
          <span className="summary-meta">{t('dashboard.metrics.newOrders', { count: pendingOrders })}</span>
        </div>
        <div className="summary-card">
          <p className="summary-label">{t('dashboard.metrics.customers')}</p>
          <h2>{customers.length}</h2>
          <span className="summary-meta">{t('dashboard.metrics.activeContracts', { count: activeContracts })}</span>
        </div>
        <div className="summary-card">
          <p className="summary-label">{t('dashboard.metrics.contracts')}</p>
          <h2>{contracts.length}</h2>
          <span className="summary-meta">{t('dashboard.metrics.inProgress', { count: activeContracts })}</span>
        </div>
      </section>

      <section className="dashboard-panels">
        <div className="panel">
          <div className="panel-header">
            <h3>{t('dashboard.recentBatches.title')}</h3>
            <span>{t('dashboard.recentBatches.updatedToday')}</span>
          </div>
          <div className="panel-body">
            {batches.slice(0, 5).map((batch: any) => (
              <div key={batch.id} className="panel-row">
                <div>
                  <p className="row-title">{batch.batchNumber}</p>
                  <span className="row-subtitle">{batch.productType?.name || batch.productTypeName || t('dashboard.recentBatches.noType')}</span>
                </div>
                <div className={`status-pill status-${String(batch.status).toLowerCase()}`}>
                  {batch.status}
                </div>
              </div>
            ))}
            {batches.length === 0 && <p className="empty-state">{t('dashboard.recentBatches.empty')}</p>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>{t('dashboard.activeOrders.title')}</h3>
            <span>{t('dashboard.activeOrders.currentMonth')}</span>
          </div>
          <div className="panel-body">
            {orders.slice(0, 5).map((order: any) => (
              <div key={order.id} className="panel-row">
                <div>
                  <p className="row-title">{order.orderNumber}</p>
                  <span className="row-subtitle">{order.customerName || t('dashboard.activeOrders.noCustomer')}</span>
                </div>
                <div className="panel-amount">
                  {order.totalAmount ? `${order.totalAmount} ${order.currency || ''}` : '—'}
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="empty-state">{t('dashboard.activeOrders.empty')}</p>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>{t('dashboard.newCustomers.title')}</h3>
            <span>{t('dashboard.newCustomers.recentRegistrations')}</span>
          </div>
          <div className="panel-body">
            {recentCustomers.map((customer: any) => (
              <div key={customer.id} className="panel-row">
                <div>
                  <p className="row-title">{customer.name}</p>
                  <span className="row-subtitle">
                    {customer.region || customer.country || t('dashboard.newCustomers.noRegion')}
                  </span>
                </div>
                <div className="panel-amount">
                  {formatDate(customer.createdAt)}
                </div>
              </div>
            ))}
            {recentCustomers.length === 0 && <p className="empty-state">{t('dashboard.newCustomers.empty')}</p>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>{t('dashboard.movements.title')}</h3>
            <span>{t('dashboard.movements.recentOperations')}</span>
          </div>
          <div className="panel-body">
            {recentMovements.map((movement: any) => {
              const relatedBatch = batches.find((batch: any) => batch.id === movement.batchId)
              const unit = relatedBatch?.unit || relatedBatch?.productType?.unit
              const typeKey = String(movement.type || '').toUpperCase()
              return (
                <div key={movement.id} className="panel-row">
                  <div>
                    <p className="row-title">{relatedBatch?.batchNumber || movement.batchId}</p>
                    <span className="row-subtitle">
                      {movementTypeLabels[typeKey] || movement.type} · {formatDate(movement.date)}
                    </span>
                  </div>
                  <div className={`panel-tag tag-${typeKey.toLowerCase()}`}>
                    {movement.quantity} {unit || ''}
                  </div>
                </div>
              )
            })}
            {recentMovements.length === 0 && <p className="empty-state">{t('dashboard.movements.empty')}</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
