import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import './DashboardPage.scss'

const DashboardPage = () => {
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

  const { data: stock = [], isLoading: stockLoading, error: stockError } = useQuery({
    queryKey: ['dashboard', 'stock'],
    queryFn: async () => {
      const res = await api.get('/stock')
      return res.data
    },
  })

  const isLoading = batchesLoading || ordersLoading || customersLoading || stockLoading
  const hasError = batchesError || ordersError || customersError || stockError

  const totalStock = stock.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
  const reservedStock = stock.reduce((sum: number, item: any) => sum + (item.reserved || 0), 0)

  const activeBatches = batches.filter((batch: any) => batch.status === 'ACTIVE').length
  const pendingOrders = orders.filter((order: any) => order.status === 'NEW').length

  if (isLoading) {
    return <div className="dashboard-state">Загрузка данных...</div>
  }

  if (hasError) {
    return <div className="dashboard-state error">Ошибка загрузки данных</div>
  }

  return (
    <div className="dashboard-page">
      <section className="summary-grid">
        <div className="summary-card">
          <p className="summary-label">Всего партий</p>
          <h2>{batches.length}</h2>
          <span className="summary-meta">Активные: {activeBatches}</span>
        </div>
        <div className="summary-card">
          <p className="summary-label">Остаток на складе</p>
          <h2>{totalStock.toFixed(1)}</h2>
          <span className="summary-meta">В резерве: {reservedStock.toFixed(1)}</span>
        </div>
        <div className="summary-card">
          <p className="summary-label">Заказы</p>
          <h2>{orders.length}</h2>
          <span className="summary-meta">Новых: {pendingOrders}</span>
        </div>
        <div className="summary-card">
          <p className="summary-label">Клиенты</p>
          <h2>{customers.length}</h2>
          <span className="summary-meta">Активные контракты</span>
        </div>
      </section>

      <section className="dashboard-panels">
        <div className="panel">
          <div className="panel-header">
            <h3>Последние партии</h3>
            <span>Обновлено сегодня</span>
          </div>
          <div className="panel-body">
            {batches.slice(0, 5).map((batch: any) => (
              <div key={batch.id} className="panel-row">
                <div>
                  <p className="row-title">{batch.batchNumber}</p>
                  <span className="row-subtitle">{batch.productType?.name || batch.productTypeName || 'Без типа'}</span>
                </div>
                <div className={`status-pill status-${String(batch.status).toLowerCase()}`}>
                  {batch.status}
                </div>
              </div>
            ))}
            {batches.length === 0 && <p className="empty-state">Партии не найдены</p>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Заказы в работе</h3>
            <span>Текущий месяц</span>
          </div>
          <div className="panel-body">
            {orders.slice(0, 5).map((order: any) => (
              <div key={order.id} className="panel-row">
                <div>
                  <p className="row-title">{order.orderNumber}</p>
                  <span className="row-subtitle">{order.customerName || 'Клиент не указан'}</span>
                </div>
                <div className="panel-amount">
                  {order.totalAmount ? `${order.totalAmount} ${order.currency || ''}` : '—'}
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="empty-state">Заказы не найдены</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
