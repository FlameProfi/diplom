import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import './OrdersPage.scss'

interface OrderItemForm {
  batchId: string
  quantity: number
  price: number
}

interface CreateOrderForm {
  orderNumber: string
  customerId: string
  status?: string
  totalAmount?: number
  expectedDelivery?: string
  productionNotes?: string
  packingNotes?: string
  orderItems: OrderItemForm[]
}

const statusOptions = [
  { value: 'NEW', label: 'Новый' },
  { value: 'IN_PRODUCTION', label: 'В производстве' },
  { value: 'PACKED', label: 'Упакован' },
  { value: 'READY_FOR_SHIPMENT', label: 'Готов к отгрузке' },
  { value: 'SHIPPED', label: 'Отгружен' },
  { value: 'DELIVERED', label: 'Доставлен' },
  { value: 'CANCELLED', label: 'Отменён' },
]

const OrdersPage = () => {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const currentDate = new Date().toISOString().split('T')[0]
  const customerIdParam = searchParams.get('customerId')

  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['orders', customerIdParam],
    queryFn: async () => {
      const params = customerIdParam ? { customerId: customerIdParam } : undefined
      const res = await api.get('/orders', { params })
      return res.data
    },
  })

  const { data: customers = [], isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers')
      return res.data
    },
  })

  const { data: batches = [], isLoading: batchesLoading, error: batchesError } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const res = await api.get('/batches')
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateOrderForm) => api.post('/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowForm(false)
      reset()
    },
    onError: (error: any) => {
      console.error('Creation error:', error)
      alert(`Ошибка создания: ${error.response?.data?.message || error.message}`)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status/${status}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error: any) => alert(`Ошибка обновления: ${error.message}`),
  })

  const { register, handleSubmit, reset, control, watch, setValue } = useForm<CreateOrderForm>({
    defaultValues: {
      orderNumber: '',
      customerId: '',
      status: 'NEW',
      expectedDelivery: currentDate,
      orderItems: [{ batchId: '', quantity: 1, price: 0 }],
      productionNotes: '',
      packingNotes: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'orderItems',
  })

  const orderItems = watch('orderItems')
  const totalAmount = orderItems?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0

  useEffect(() => {
    setValue('totalAmount', totalAmount)
  }, [setValue, totalAmount])

  const watchedDelivery = watch('expectedDelivery')
  const isValidDelivery = !watchedDelivery || new Date(watchedDelivery) >= new Date(currentDate)

  const filteredOrders = useMemo(() => {
    return orders.filter((order: any) => {
      if (customerIdParam && order.customerId !== customerIdParam) {
        return false
      }
      const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus
      const searchValue = search.trim().toLowerCase()
      const matchesSearch =
        !searchValue ||
        order.orderNumber?.toLowerCase().includes(searchValue) ||
        order.customerName?.toLowerCase().includes(searchValue)

      return matchesStatus && matchesSearch
    })
  }, [orders, filterStatus, search])

  const ordersStats = useMemo(() => {
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0)
    const newOrders = orders.filter((order: any) => order.status === 'NEW').length
    const inProduction = orders.filter((order: any) => order.status === 'IN_PRODUCTION').length
    return { totalRevenue, newOrders, inProduction }
  }, [orders])

  const onSubmit = (data: CreateOrderForm) => {
    if (!isValidDelivery) {
      alert('Дата доставки должна быть не раньше сегодня')
      return
    }

    const filteredItems = data.orderItems.filter((item) => item.batchId)
    if (filteredItems.length === 0) {
      alert('Добавьте хотя бы одну позицию с партией')
      return
    }

    createMutation.mutate({
      ...data,
      orderItems: filteredItems,
      totalAmount,
    })
  }

  if (ordersLoading || customersLoading || batchesLoading) return <div className="loading">Загрузка...</div>
  if (ordersError || customersError || batchesError) return <div className="error">Ошибка загрузки данных</div>

  return (
    <div className="orders-page">
      <header className="page-header">
        <div>
          <h1>Заказы</h1>
          <p className="subtitle">Контроль заказов, статусов и составов партий</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          disabled={createMutation.isPending}
        >
          {showForm ? 'Отмена' : 'Новый заказ'}
        </button>
      </header>

      <section className="summary">
        <div className="summary-card">
          <span className="label">Всего заказов</span>
          <strong>{orders.length}</strong>
        </div>
        <div className="summary-card">
          <span className="label">Новые</span>
          <strong>{ordersStats.newOrders}</strong>
        </div>
        <div className="summary-card">
          <span className="label">В производстве</span>
          <strong>{ordersStats.inProduction}</strong>
        </div>
        <div className="summary-card accent">
          <span className="label">Сумма заказов</span>
          <strong>{ordersStats.totalRevenue.toLocaleString('ru-RU')} ₽</strong>
        </div>
      </section>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="order-form">
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="orderNumber">Номер заказа</label>
              <input id="orderNumber" {...register('orderNumber', { required: true })} placeholder="ORDER-XXX" />
            </div>
            <div className="form-field">
              <label htmlFor="customerId">Клиент</label>
              <select id="customerId" {...register('customerId', { required: true })}>
                <option value="">Выберите клиента</option>
                {customers.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="status">Статус</label>
              <select id="status" {...register('status')}>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="expectedDelivery">Ожидаемая доставка</label>
              <input
                id="expectedDelivery"
                type="date"
                {...register('expectedDelivery', { min: currentDate })}
                min={currentDate}
              />
              {!isValidDelivery && <span className="error-text">Дата должна быть в будущем</span>}
            </div>
            <div className="form-field full">
              <label htmlFor="productionNotes">Примечания производства</label>
              <textarea id="productionNotes" {...register('productionNotes')} rows={2} />
            </div>
            <div className="form-field full">
              <label htmlFor="packingNotes">Примечания упаковки</label>
              <textarea id="packingNotes" {...register('packingNotes')} rows={2} />
            </div>
          </div>

          <div className="order-items">
            <div className="order-items-header">
              <h3>Позиции заказа</h3>
              <div className="total">Итого: {totalAmount.toLocaleString('ru-RU')} ₽</div>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="item-row">
                <select {...register(`orderItems.${index}.batchId`, { required: true })}>
                  <option value="">Выберите партию</option>
                  {batches.map((batch: any) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNumber} ({batch.quantity} {batch.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  {...register(`orderItems.${index}.quantity`, { min: 1, valueAsNumber: true })}
                  placeholder="Кол-во"
                />
                <input
                  type="number"
                  {...register(`orderItems.${index}.price`, { min: 0, valueAsNumber: true })}
                  placeholder="Цена за ед."
                  step="0.01"
                />
                <button type="button" className="btn btn-outline" onClick={() => remove(index)}>
                  Удалить
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => append({ batchId: '', quantity: 1, price: 0 })}
            >
              + Добавить позицию
            </button>
          </div>

          <button type="submit" className="btn btn-success" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Создаётся...' : 'Создать заказ'}
          </button>
        </form>
      )}

      <div className="filters">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по номеру или клиенту..."
          className="search-input"
        />
        {customerIdParam && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setSearchParams({})}
          >
            Сбросить фильтр клиента
          </button>
        )}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="status-filter"
        >
          <option value="ALL">Все статусы</option>
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Номер</th>
              <th>Клиент</th>
              <th>Статус</th>
              <th>Позиции</th>
              <th>Сумма</th>
              <th>Создан</th>
              <th>Доставка</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order: any) => (
              <tr key={order.id}>
                <td>{order.orderNumber}</td>
                <td>{order.customerName || order.customer?.name || '—'}</td>
                <td>
                  <span className={`status-badge status-${order.status?.toLowerCase() || 'new'}`}>
                    {statusOptions.find((status) => status.value === order.status)?.label || order.status}
                  </span>
                </td>
                <td>
                  {order.orderItems?.length
                    ? order.orderItems
                        .map((item: any) => `${item.quantity} x ${item.batchNumber || item.batch?.batchNumber || '—'}`)
                        .join(', ')
                    : '—'}
                </td>
                <td>{(order.totalAmount || 0).toLocaleString('ru-RU')} ₽</td>
                <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : '—'}</td>
                <td>
                  {order.expectedDelivery
                    ? new Date(order.expectedDelivery).toLocaleDateString('ru-RU')
                    : '—'}
                </td>
                <td>
                  <select
                    value={order.status}
                    onChange={(e) => {
                      if (e.target.value !== order.status) {
                        updateStatusMutation.mutate({ id: order.id, status: e.target.value })
                      }
                    }}
                    disabled={updateStatusMutation.isPending}
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOrders.length === 0 && <div className="empty-state">Заказы не найдены</div>}
      </div>
    </div>
  )
}

export default OrdersPage
