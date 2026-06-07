import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

const OrdersPage = () => {
  const { t, i18n } = useTranslation()

  const statusOptions = [
    { value: 'NEW', label: t('orders.statuses.NEW') },
    { value: 'IN_PRODUCTION', label: t('orders.statuses.IN_PRODUCTION') },
    { value: 'PACKED', label: t('orders.statuses.PACKED') },
    { value: 'READY_FOR_SHIPMENT', label: t('orders.statuses.READY_FOR_SHIPMENT') },
    { value: 'SHIPPED', label: t('orders.statuses.SHIPPED') },
    { value: 'DELIVERED', label: t('orders.statuses.DELIVERED') },
    { value: 'CANCELLED', label: t('orders.statuses.CANCELLED') },
  ]

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
      alert(t('orders.errors.create', { message: error.response?.data?.message || error.message }))
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status/${status}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error: any) => alert(t('orders.errors.update', { message: error.message })),
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
      alert(t('orders.errors.deliveryDate'))
      return
    }

    const filteredItems = data.orderItems.filter((item) => item.batchId)
    if (filteredItems.length === 0) {
      alert(t('orders.errors.noItems'))
      return
    }

    createMutation.mutate({
      ...data,
      orderItems: filteredItems,
      totalAmount,
    })
  }

  if (ordersLoading || customersLoading || batchesLoading) return <div className="loading">{t('orders.loading')}</div>
  if (ordersError || customersError || batchesError) return <div className="error">{t('orders.errors.loading')}</div>

  return (
    <div className="orders-page">
      <header className="page-header">
        <div>
          <h1>{t('orders.title')}</h1>
          <p className="subtitle">{t('orders.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          disabled={createMutation.isPending}
        >
          {showForm ? t('orders.actions.cancel') : t('orders.actions.new')}
        </button>
      </header>

      <section className="summary">
        <div className="summary-card">
          <span className="label">{t('orders.summary.total')}</span>
          <strong>{orders.length}</strong>
        </div>
        <div className="summary-card">
          <span className="label">{t('orders.summary.new')}</span>
          <strong>{ordersStats.newOrders}</strong>
        </div>
        <div className="summary-card">
          <span className="label">{t('orders.summary.inProduction')}</span>
          <strong>{ordersStats.inProduction}</strong>
        </div>
        <div className="summary-card accent">
          <span className="label">{t('orders.summary.totalAmount')}</span>
          <strong>{ordersStats.totalRevenue.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')} ₽</strong>
        </div>
      </section>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="order-form">
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="orderNumber">{t('orders.form.orderNumber')}</label>
              <input id="orderNumber" {...register('orderNumber', { required: true })} placeholder={t('orders.form.orderNumberPlaceholder')} />
            </div>
            <div className="form-field">
              <label htmlFor="customerId">{t('orders.form.customer')}</label>
              <select id="customerId" {...register('customerId', { required: true })}>
                <option value="">{t('orders.form.selectCustomer')}</option>
                {customers.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="status">{t('orders.form.status')}</label>
              <select id="status" {...register('status')}>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="expectedDelivery">{t('orders.form.expectedDelivery')}</label>
              <input
                id="expectedDelivery"
                type="date"
                {...register('expectedDelivery', { min: currentDate })}
                min={currentDate}
              />
              {!isValidDelivery && <span className="error-text">{t('orders.form.deliveryError')}</span>}
            </div>
            <div className="form-field full">
              <label htmlFor="productionNotes">{t('orders.form.productionNotes')}</label>
              <textarea id="productionNotes" {...register('productionNotes')} rows={2} />
            </div>
            <div className="form-field full">
              <label htmlFor="packingNotes">{t('orders.form.packingNotes')}</label>
              <textarea id="packingNotes" {...register('packingNotes')} rows={2} />
            </div>
          </div>

          <div className="order-items">
            <div className="order-items-header">
              <h3>{t('orders.form.itemsTitle')}</h3>
              <div className="total">{t('orders.form.total', { amount: totalAmount.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US') })}</div>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="item-row">
                <select {...register(`orderItems.${index}.batchId`, { required: true })}>
                  <option value="">{t('orders.form.selectBatch')}</option>
                  {batches.map((batch: any) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNumber} ({batch.quantity} {batch.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  {...register(`orderItems.${index}.quantity`, { min: 1, valueAsNumber: true })}
                  placeholder={t('orders.form.quantity')}
                />
                <input
                  type="number"
                  {...register(`orderItems.${index}.price`, { min: 0, valueAsNumber: true })}
                  placeholder={t('orders.form.price')}
                  step="0.01"
                />
                <button type="button" className="btn btn-outline" onClick={() => remove(index)}>
                  {t('orders.actions.delete')}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => append({ batchId: '', quantity: 1, price: 0 })}
            >
              {t('orders.actions.addPosition')}
            </button>
          </div>

          <button type="submit" className="btn btn-success" disabled={createMutation.isPending}>
            {createMutation.isPending ? t('orders.actions.creating') : t('orders.actions.create')}
          </button>
        </form>
      )}

      <div className="filters">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('orders.filters.searchPlaceholder')}
          className="search-input"
        />
        {customerIdParam && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setSearchParams({})}
          >
            {t('orders.actions.resetFilter')}
          </button>
        )}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="status-filter"
        >
          <option value="ALL">{t('orders.filters.allStatuses')}</option>
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
              <th>{t('orders.table.number')}</th>
              <th>{t('orders.table.customer')}</th>
              <th>{t('orders.table.status')}</th>
              <th>{t('orders.table.items')}</th>
              <th>{t('orders.table.amount')}</th>
              <th>{t('orders.table.created')}</th>
              <th>{t('orders.table.delivery')}</th>
              <th>{t('orders.table.actions')}</th>
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
                <td>{(order.totalAmount || 0).toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')} ₽</td>
                <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US') : '—'}</td>
                <td>
                  {order.expectedDelivery
                    ? new Date(order.expectedDelivery).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')
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
        {filteredOrders.length === 0 && <div className="empty-state">{t('orders.table.empty')}</div>}
      </div>
    </div>
  )
}

export default OrdersPage
