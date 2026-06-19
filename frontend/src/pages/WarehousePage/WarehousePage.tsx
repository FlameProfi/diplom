import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BarcodeScanner from '../../components/ScannerComponent/BarcodeScanner'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { formatNumber } from '../../utils/format'
import { hasPermission, Role } from '../../utils/roles'
import './WarehousePage.scss'

type TabKey = 'scan' | 'stock' | 'reserve' | 'notifications' | 'movements' | 'overview' | 'manage'

type Warehouse = {
  id: string
  name: string
  type?: string
  location?: string
}

type BatchProductType = {
  id?: string
  name?: string
  unit?: string
}

type BatchStockItem = {
  id: string
  quantity: number
  reserved: number
  warehouseName?: string
  warehouse?: {
    name: string
  }
}

type Batch = {
  id: string
  batchNumber: string
  quantity: number
  unit: string
  status: string
  barcode?: string
  productType?: BatchProductType
  stockItems?: BatchStockItem[]
}

type StockItem = {
  id: string
  quantity: number
  reserved: number
  batch: {
    id: string
    batchNumber: string
    unit: string
  }
  warehouse: {
    id: string
    name: string
  }
}

type NotificationItem = {
  id: string
  message: string
  createdAt: string
}

type OrderItem = {
  id: string
  batchId: string
  batchNumber: string
  quantity: number
  price?: number
  orderNumber: string
  customerName: string
}

type OrderResponseItem = {
  id: string
  orderNumber: string
  customerName: string
  orderItems?: Array<{
    id: string
    batchId: string
    batchNumber: string
    quantity: number
    price?: number
  }>
}

type MovementSummary = {
  id: string
  batchId: string
  batchNumber: string
  type: string
  quantity: number
  date: string
  reason?: string
  userId: string
  userEmail: string
  fromWarehouseId?: string
  fromWarehouseName?: string
  toWarehouseId?: string
  toWarehouseName?: string
}

const WarehousePage = () => {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()

  const [activeTab, setActiveTab] = useState<TabKey>('scan')
  const [barcode, setBarcode] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [movementType, setMovementType] = useState<'RECEIPT' | 'ISSUE' | 'RESERVE'>('RECEIPT')
  const [orderItemId, setOrderItemId] = useState('')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [stockSearch, setStockSearch] = useState('')
  const [stockWarehouseFilter, setStockWarehouseFilter] = useState('')
  const [movementSearch, setMovementSearch] = useState('')
  const [manualBatch, setManualBatch] = useState<Batch | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [whName, setWhName] = useState('')
  const [whType, setWhType] = useState('MAIN')
  const [whLocation, setWhLocation] = useState('')

  const isAdmin = !!user && hasPermission(user.role, [Role.ADMIN, Role.MANAGER])

  const tabs = [
    { key: 'scan', label: t('warehouse.tabs.scan'), adminOnly: false },
    { key: 'stock', label: t('warehouse.tabs.stock'), adminOnly: false },
    { key: 'reserve', label: t('warehouse.tabs.reserve'), adminOnly: false },
    { key: 'notifications', label: t('warehouse.tabs.notifications'), adminOnly: false },
    { key: 'overview', label: t('warehouse.tabs.overview'), adminOnly: true },
    { key: 'movements', label: t('warehouse.tabs.movements'), adminOnly: true },
    { key: 'manage', label: t('warehouse.tabs.manage'), adminOnly: true },
  ]

  const visibleTabs = tabs.filter((tab) => (tab.adminOnly ? isAdmin : true))

  const {
    data: batch,
    refetch: refetchBatch,
    error: batchError,
    isFetching: batchFetching,
  } = useQuery<Batch | null>({
    queryKey: ['batch', barcode],
    queryFn: async () => {
      if (!barcode) return null
      const res = await api.get(`/batches/barcode/${barcode}`)
      return res.data
    },
    enabled: !!barcode,
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: stock,
    error: stockError,
    isFetching: stockFetching,
  } = useQuery<StockItem[]>({
    queryKey: ['stock'],
    queryFn: async () => {
      const res = await api.get('/stock')
      return res.data
    },
    enabled: activeTab === 'stock' || activeTab === 'overview',
  })

  const {
    data: notifications,
    error: notifError,
    isFetching: notifFetching,
  } = useQuery<NotificationItem[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const res = await api.get(`/notifications/user/${user.id}`)
      return res.data
    },
    enabled: activeTab === 'notifications' && !!user,
  })

  const {
    data: warehouses,
    error: warehouseError,
    isFetching: warehouseFetching,
  } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await api.get('/warehouses')
      return res.data
    },
    enabled: !!user,
  })

  const {
    data: orders,
    error: ordersError,
    isFetching: ordersFetching,
  } = useQuery<OrderResponseItem[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders')
      return res.data
    },
    enabled: activeTab === 'reserve' && !!user,
  })

  const {
    data: movements,
    error: movementsError,
    isFetching: movementsFetching,
  } = useQuery<MovementSummary[]>({
    queryKey: ['inventory-movements'],
    queryFn: async () => {
      const res = await api.get('/inventory-movements')
      return res.data
    },
    enabled: activeTab === 'movements' && isAdmin,
  })

  const resolvedBatch = manualBatch ?? batch

  const orderItems = useMemo<OrderItem[]>(() => {
    if (!orders) return []
    return orders.flatMap((order) =>
      (order.orderItems ?? []).map((item) => ({
        id: item.id,
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        price: item.price,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
      })),
    )
  }, [orders])

  const reserveOrderItems = useMemo(() => {
    if (!resolvedBatch) return []
    return orderItems.filter((item) => item.batchId === resolvedBatch.id)
  }, [orderItems, resolvedBatch])

  const filteredStock = useMemo(() => {
    if (!stock) return []
    return stock.filter((item) => {
      const matchesWarehouse = stockWarehouseFilter
        ? item.warehouse.id === stockWarehouseFilter
        : true
      const search = stockSearch.trim().toLowerCase()
      const matchesSearch = search
        ? item.batch.batchNumber.toLowerCase().includes(search) ||
          item.warehouse.name.toLowerCase().includes(search)
        : true
      return matchesWarehouse && matchesSearch
    })
  }, [stock, stockSearch, stockWarehouseFilter])

  const filteredMovements = useMemo(() => {
    if (!movements) return []
    const search = movementSearch.trim().toLowerCase()
    if (!search) return movements
    return movements.filter((movement) =>
      [
        movement.batchNumber,
        movement.userEmail,
        movement.reason ?? '',
        movement.fromWarehouseName ?? '',
        movement.toWarehouseName ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(search),
    )
  }, [movements, movementSearch])

  const totalReserved = resolvedBatch?.stockItems?.reduce((sum, item) => sum + item.reserved, 0) ?? 0
  const availableQuantity = resolvedBatch ? resolvedBatch.quantity - totalReserved : 0

  const totalStock = stock?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const totalReservedStock = stock?.reduce((sum, item) => sum + item.reserved, 0) ?? 0
  const totalAvailableStock = totalStock - totalReservedStock

  const createMovementMutation = useMutation({
    mutationFn: async (data: {
      batchId: string
      type: 'RECEIPT' | 'ISSUE' | 'RESERVE'
      quantity: number
      reason?: string
      fromWarehouseId?: string
      toWarehouseId?: string
      userId?: string
    }) => {
      return api.post('/inventory-movements', data)
    },
    onSuccess: () => {
      refetchBatch()
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      setQuantity(0)
      setMovementReason('')
      alert(t('warehouse.scan.movementSuccess'))
    },
    onError: (error: any) => {
      if (error.response?.status === 401) {
        alert(t('warehouse.scan.sessionExpired'))
        localStorage.removeItem('accessToken')
        logout()
        window.location.href = '/login'
        return
      }
      if (error.response?.status === 403) {
        alert(t('warehouse.scan.forbidden'))
        return
      }
      alert(t('warehouse.scan.createError', { message: error.response?.data?.message || error.message }))
    },
    onMutate: () => {
      setIsLoading(true)
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })

  const createWhMutation = useMutation({
    mutationFn: (data: Partial<Warehouse>) => api.post('/warehouses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      setWhName('')
      setWhLocation('')
      setWhType('MAIN')
    },
    onError: (err: any) => alert(t('warehouse.manage.createError', { message: err.message })),
  })

  const updateWhMutation = useMutation({
    mutationFn: (data: Warehouse) => api.put(`/warehouses/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      setEditingWarehouse(null)
      setWhName('')
      setWhLocation('')
      setWhType('MAIN')
    },
    onError: (err: any) => alert(t('warehouse.manage.updateError', { message: err.message })),
  })

  const deleteWhMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
    onError: (err: any) => alert(t('warehouse.manage.deleteError', { message: err.message })),
  })

  const handleSaveWarehouse = () => {
    if (!whName.trim()) return
    const data = { name: whName, type: whType, location: whLocation }
    if (editingWarehouse) {
      updateWhMutation.mutate({ ...editingWarehouse, ...data })
    } else {
      createWhMutation.mutate(data)
    }
  }

  const handleEditWh = (wh: Warehouse) => {
    setEditingWarehouse(wh)
    setWhName(wh.name)
    setWhType(wh.type || 'MAIN')
    setWhLocation(wh.location || '')
  }

  const handleCancelWhEdit = () => {
    setEditingWarehouse(null)
    setWhName('')
    setWhLocation('')
    setWhType('MAIN')
  }

  const reserveMutation = useMutation({
    mutationFn: async (data: {
      batchId: string
      orderItemId: string
      quantity: number
      userId?: string
    }) => {
      return api.post('/inventory-movements/reserve', data)
    },
    onSuccess: () => {
      refetchBatch()
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      setQuantity(0)
      setOrderItemId('')
      alert(t('warehouse.reserve.reserveSuccess'))
    },
    onError: (error: any) => {
      if (error.response?.status === 401) {
        alert(t('warehouse.scan.sessionExpired'))
        localStorage.removeItem('accessToken')
        logout()
        window.location.href = '/login'
        return
      }
      if (error.response?.status === 403) {
        alert(t('warehouse.reserve.forbidden'))
        return
      }
      alert(t('warehouse.reserve.error', { message: error.response?.data?.message || error.message }))
    },
    onMutate: () => {
      setIsLoading(true)
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })

  const handleScan = (scanned: string) => {
    if (!user) {
      alert(t('warehouse.scan.authPrompt'))
      return
    }
    setManualBatch(null)
    setBarcode(scanned)
    setManualInput(scanned)
    refetchBatch()
  }

  const handleManualSearch = () => {
    if (!user) {
      alert(t('warehouse.scan.authPrompt'))
      return
    }
    if (!manualInput.trim()) {
      alert(t('warehouse.scan.manualInput')) // A bit weird reuse, maybe should have separate key
      return
    }
    setManualBatch(null)
    setBarcode(manualInput)
    refetchBatch()
  }

  const handleLoadBatchById = async (batchId: string) => {
    try {
      setIsLoading(true)
      const res = await api.get(`/batches/${batchId}`)
      setManualBatch(res.data)
    } catch (error: any) {
      alert(`Ошибка загрузки партии: ${error.response?.data?.message || error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMovement = () => {
    if (!user) {
      alert(t('warehouse.scan.authPrompt'))
      return
    }

    if (!resolvedBatch) {
      alert(t('warehouse.scan.scanRequired'))
      return
    }

    if (quantity <= 0) {
      alert(t('warehouse.scan.quantityRequired'))
      return
    }

    if (movementType === 'ISSUE' && quantity > availableQuantity) {
      alert(t('warehouse.scan.insufficientStock', { count: availableQuantity }))
      return
    }

    if (createMovementMutation.isPending) {
      return
    }

    const movementPayload = {
      batchId: resolvedBatch.id,
      type: movementType,
      quantity,
      reason: movementReason || `Движение по скану/вводу: ${barcode || resolvedBatch.batchNumber}`,
      userId: user.id,
      fromWarehouseId: movementType === 'ISSUE' ? selectedWarehouseId || undefined : undefined,
      toWarehouseId: movementType !== 'ISSUE' ? selectedWarehouseId || undefined : undefined,
    }

    createMovementMutation.mutate(movementPayload)
  }

  const handleReserve = () => {
    if (!user) {
      alert(t('warehouse.scan.authPrompt'))
      return
    }

    if (!resolvedBatch) {
      alert(t('warehouse.reserve.scanFirst'))
      return
    }

    if (!orderItemId) {
      alert(t('warehouse.reserve.selectOrderItem'))
      return
    }

    if (quantity <= 0) {
      alert(t('warehouse.scan.quantityRequired'))
      return
    }

    if (quantity > availableQuantity) {
      alert(t('warehouse.scan.insufficientStock', { count: availableQuantity }))
      return
    }

    if (reserveMutation.isPending) {
      return
    }

    reserveMutation.mutate({
      batchId: resolvedBatch.id,
      orderItemId,
      quantity,
      userId: user.id,
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    logout()
    window.location.href = '/login'
  }

  const handleResetBatch = () => {
    setBarcode('')
    setManualInput('')
    setManualBatch(null)
  }

  if (!user) {
    return (
      <div className="warehouse-page">
        <div className="auth-required">
          <h2>{t('warehouse.accessDenied')}</h2>
          <p>{t('warehouse.authRequired')}</p>
          <button onClick={() => (window.location.href = '/login')} className="login-btn">
            {t('warehouse.login')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="warehouse-page">
      <div className="warehouse-header">
        <div>
          <h2>{t('warehouse.title')}</h2>
          <p className="subtitle">
            {user.email} • {t('warehouse.scan.status')}: {user.role}
          </p>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={handleResetBatch}>
            {t('warehouse.resetBatch')}
          </button>
          <button className="danger" onClick={handleLogout}>
            {t('warehouse.logout')}
          </button>
        </div>
      </div>

      <div className="tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key as TabKey)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'scan' && (
        <div className="scan-grid">
          <div className="scanner-container">
            <BarcodeScanner onScan={handleScan} />
            <div className="manual-input">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={t('warehouse.scan.manualInput')}
              />
              <button onClick={handleManualSearch}>{t('warehouse.scan.find')}</button>
            </div>
            {batchFetching && <p className="muted">{t('warehouse.scan.searching')}</p>}
            {batchError && <p className="error">{t('warehouse.scan.searchError', { message: batchError.message })}</p>}
          </div>

          <div className="batch-card">
            <h3>{t('warehouse.scan.batchTitle')}</h3>
            {resolvedBatch ? (
              <>
                <p>{t('warehouse.scan.number')}: {resolvedBatch.batchNumber}</p>
                <p>{t('warehouse.scan.type')}: {resolvedBatch.productType?.name ?? '—'}</p>
                <p>
                  {t('warehouse.scan.quantity')}: {formatNumber(resolvedBatch.quantity, i18n.language)} {resolvedBatch.unit}
                </p>
                <p>{t('warehouse.scan.reserve')}: {formatNumber(totalReserved, i18n.language)}</p>
                <p>
                  {t('warehouse.scan.available')}: {formatNumber(availableQuantity, i18n.language)} {resolvedBatch.unit}
                </p>
                <p>
                  {t('warehouse.scan.status')}:{' '}
                  <span className={`status-badge status-${resolvedBatch.status.toLowerCase()}`}>
                    {resolvedBatch.status}
                  </span>
                </p>
                {resolvedBatch.stockItems && resolvedBatch.stockItems.length > 0 && (
                  <div className="stock-badges">
                    {resolvedBatch.stockItems.map((item) => (
                      <div key={item.id} className="stock-badge">
                        <span>{item.warehouseName ?? item.warehouse?.name ?? 'Склад'}</span>
                        <strong>
                          {formatNumber(item.quantity, i18n.language)} / {formatNumber(item.reserved, i18n.language)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="muted">{t('warehouse.scan.scanPrompt')}</p>
            )}
          </div>

          <div className="movement-card">
            <h3>{t('warehouse.scan.operationTitle')}</h3>
            <div className="movement-form">
              <label>
                {t('warehouse.scan.opType')}
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as 'RECEIPT' | 'ISSUE' | 'RESERVE')}
                >
                  <option value="RECEIPT">{t('warehouse.scan.receipt')}</option>
                  <option value="ISSUE">{t('warehouse.scan.issue')}</option>
                  <option value="RESERVE">{t('warehouse.scan.reserveOp')}</option>
                </select>
              </label>
              <label>
                {t('warehouse.scan.warehouse')}
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                >
                  <option value="">{t('warehouse.scan.defaultWarehouse')}</option>
                  {warehouses?.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('warehouse.scan.quantityLabel')}
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="0"
                  placeholder={t('warehouse.scan.quantityPlaceholder')}
                />
              </label>
              <label>
                {t('warehouse.scan.reason')}
                <textarea
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder={t('warehouse.scan.reasonPlaceholder')}
                />
              </label>
              <button
                onClick={handleMovement}
                disabled={createMovementMutation.isPending || quantity <= 0 || !resolvedBatch}
              >
                {createMovementMutation.isPending ? t('warehouse.scan.saving') : t('warehouse.scan.submit')}
              </button>
              {warehouseError && <p className="error">{t('warehouse.scan.loadWarehousesError', { message: warehouseError.message })}</p>}
              {warehouseFetching && <p className="muted">{t('warehouse.scan.loadingWarehouses')}</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="stock-table">
          <div className="stock-filters">
            <input
              type="text"
              placeholder={t('warehouse.stock.searchPlaceholder')}
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
            />
            <select
              value={stockWarehouseFilter}
              onChange={(e) => setStockWarehouseFilter(e.target.value)}
            >
              <option value="">{t('warehouse.stock.allWarehouses')}</option>
              {warehouses?.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>
          {stockFetching && <p className="muted">{t('warehouse.stock.loading')}</p>}
          {stockError && <p className="error">{t('warehouse.stock.error', { message: stockError.message })}</p>}
          {filteredStock && filteredStock.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>{t('warehouse.stock.table.batch')}</th>
                  <th>{t('warehouse.stock.table.warehouse')}</th>
                  <th>{t('warehouse.stock.table.quantity')}</th>
                  <th>{t('warehouse.stock.table.reserve')}</th>
                  <th>{t('warehouse.stock.table.available')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item) => (
                  <tr key={item.id}>
                    <td>{item.batch.batchNumber}</td>
                    <td>{item.warehouse.name}</td>
                    <td>
                      {formatNumber(item.quantity, i18n.language)} {item.batch.unit}
                    </td>
                    <td>{formatNumber(item.reserved, i18n.language)}</td>
                    <td>{formatNumber(item.quantity - item.reserved, i18n.language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>{t('warehouse.stock.empty')}</p>
          )}
        </div>
      )}

      {activeTab === 'reserve' && (
        <div className="reserve-section">
          <h3>{t('warehouse.reserve.title')}</h3>
          {ordersFetching && <p className="muted">{t('warehouse.reserve.loadingOrders')}</p>}
          {ordersError && <p className="error">{t('warehouse.reserve.errorOrders', { message: ordersError.message })}</p>}
          {resolvedBatch ? (
            <div className="reserve-form">
              <p>
                {t('warehouse.reserve.batchPrompt', { number: resolvedBatch.batchNumber, count: availableQuantity, unit: resolvedBatch.unit })}
              </p>
              <label>
                {t('warehouse.reserve.orderItem')}
                <select
                  value={orderItemId}
                  onChange={(e) => setOrderItemId(e.target.value)}
                >
                  <option value="">{t('warehouse.reserve.selectOrderItem')}</option>
                  {reserveOrderItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.orderNumber} • {item.batchNumber} • {item.quantity} ед. • {item.customerName}
                    </option>
                  ))}
                </select>
              </label>
              {reserveOrderItems.length === 0 && (
                <p className="muted">
                  {t('warehouse.reserve.noOrdersForBatch')}
                </p>
              )}
              <label>
                {t('warehouse.reserve.quantityForReserve')}
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="0"
                  placeholder={t('warehouse.scan.quantityPlaceholder')}
                />
              </label>
              <button
                onClick={handleReserve}
                disabled={reserveMutation.isPending || quantity <= 0 || !orderItemId}
              >
                {reserveMutation.isPending ? t('warehouse.reserve.reserving') : t('warehouse.reserve.reserveBtn')}
              </button>
            </div>
          ) : (
            <div className="reserve-empty">
              <p>{t('warehouse.reserve.scanFirst')}</p>
              {orderItems.length > 0 && (
                <div className="reserve-helper">
                  <p className="muted">{t('warehouse.reserve.manualPrompt')}</p>
                  <select
                    value={orderItemId}
                    onChange={(e) => {
                      const selected = e.target.value
                      setOrderItemId(selected)
                      const item = orderItems.find((orderItem) => orderItem.id === selected)
                      if (item) {
                        handleLoadBatchById(item.batchId)
                      }
                    }}
                  >
                    <option value="">{t('warehouse.reserve.selectOrder')}</option>
                    {orderItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.orderNumber} • {item.batchNumber} • {item.quantity} ед. • {item.customerName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="notifications-list">
          <h3>{t('warehouse.notifications.title')}</h3>
          {notifFetching && <p className="muted">{t('warehouse.notifications.loading')}</p>}
          {notifError && <p className="error">{t('warehouse.notifications.error', { message: notifError.message })}</p>}
          {notifications && notifications.length > 0 ? (
            <ul>
              {notifications.map((notification) => (
                <li key={notification.id} className="notification-item">
                  {notification.message} ({new Date(notification.createdAt).toLocaleString()})
                </li>
              ))}
            </ul>
          ) : (
            <p>{t('warehouse.notifications.empty')}</p>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="overview-grid">
          <div className="summary-card">
            <h3>{t('warehouse.overview.summary')}</h3>
            <div className="summary-metrics">
              <div>
                <span>{t('warehouse.overview.total')}</span>
                <strong>{formatNumber(totalStock, i18n.language)}</strong>
              </div>
              <div>
                <span>{t('warehouse.overview.reserve')}</span>
                <strong>{formatNumber(totalReservedStock, i18n.language)}</strong>
              </div>
              <div>
                <span>{t('warehouse.overview.available')}</span>
                <strong>{formatNumber(totalAvailableStock, i18n.language)}</strong>
              </div>
            </div>
            {stockFetching && <p className="muted">{t('warehouse.overview.loading')}</p>}
          </div>
          <div className="summary-card">
            <h3>{t('warehouse.overview.activeBatch')}</h3>
            {resolvedBatch ? (
              <>
                <p>{resolvedBatch.batchNumber}</p>
                <p>
                  {formatNumber(resolvedBatch.quantity, i18n.language)} {resolvedBatch.unit}
                </p>
                <p>{t('warehouse.overview.available')}: {formatNumber(availableQuantity, i18n.language)}</p>
              </>
            ) : (
              <p className="muted">{t('warehouse.overview.notSelected')}</p>
            )}
          </div>
          <div className="summary-card">
            <h3>{t('warehouse.overview.currentWarehouse')}</h3>
            <p>{warehouses?.find((wh) => wh.id === selectedWarehouseId)?.name ?? t('warehouse.overview.default')}</p>
            {warehouseError && <p className="error">{t('warehouse.overview.errorWarehouses', { message: warehouseError.message })}</p>}
          </div>
        </div>
      )}

      {activeTab === 'manage' && isAdmin && (
        <div className="manage-warehouses">
          <div className="wh-form-card">
            <h3>{editingWarehouse ? t('warehouse.manage.editTitle') : t('warehouse.manage.createTitle')}</h3>
            <div className="wh-form">
              <label>
                {t('warehouse.manage.nameLabel')}
                <input value={whName} onChange={(e) => setWhName(e.target.value)} placeholder={t('warehouse.manage.namePlaceholder')} />
              </label>
              <label>
                {t('warehouse.manage.typeLabel')}
                <select value={whType} onChange={(e) => setWhType(e.target.value)}>
                  <option value="MAIN">{t('warehouse.manage.types.MAIN')}</option>
                  <option value="COLD">{t('warehouse.manage.types.COLD')}</option>
                  <option value="OUTDOOR">{t('warehouse.manage.types.OUTDOOR')}</option>
                  <option value="TRANSIT">{t('warehouse.manage.types.TRANSIT')}</option>
                </select>
              </label>
              <label>
                {t('warehouse.manage.locationLabel')}
                <input value={whLocation} onChange={(e) => setWhLocation(e.target.value)} placeholder={t('warehouse.manage.locationPlaceholder')} />
              </label>
              <div className="wh-form-actions">
                <button onClick={handleSaveWarehouse} disabled={createWhMutation.isPending || updateWhMutation.isPending}>
                  {editingWarehouse ? t('warehouse.manage.save') : t('warehouse.manage.create')}
                </button>
                {editingWarehouse && (
                  <button className="ghost" onClick={handleCancelWhEdit}>
                    {t('warehouse.manage.cancel')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="wh-list-card">
            <h3>{t('warehouse.manage.listTitle')}</h3>
            <table>
              <thead>
                <tr>
                  <th>{t('warehouse.manage.table.name')}</th>
                  <th>{t('warehouse.manage.table.type')}</th>
                  <th>{t('warehouse.manage.table.location')}</th>
                  <th>{t('warehouse.manage.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {warehouses?.map((wh) => (
                  <tr key={wh.id}>
                    <td>{wh.name}</td>
                    <td>{wh.type}</td>
                    <td>{wh.location || '—'}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => handleEditWh(wh)}>{t('warehouse.manage.edit')}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => { if (confirm(t('warehouse.manage.deleteConfirm'))) deleteWhMutation.mutate(wh.id) }}>
                        {t('warehouse.manage.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="movements-section">
          <div className="movements-toolbar">
            <input
              type="text"
              placeholder={t('warehouse.movements.searchPlaceholder')}
              value={movementSearch}
              onChange={(e) => setMovementSearch(e.target.value)}
            />
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })}>
              {t('warehouse.movements.refresh')}
            </button>
          </div>
          {movementsFetching && <p className="muted">{t('warehouse.movements.loading')}</p>}
          {movementsError && <p className="error">{t('warehouse.movements.error', { message: movementsError.message })}</p>}
          {filteredMovements && filteredMovements.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>{t('warehouse.movements.table.date')}</th>
                  <th>{t('warehouse.movements.table.batch')}</th>
                  <th>{t('warehouse.movements.table.type')}</th>
                  <th>{t('warehouse.movements.table.quantity')}</th>
                  <th>{t('warehouse.movements.table.warehouse')}</th>
                  <th>{t('warehouse.movements.table.user')}</th>
                  <th>{t('warehouse.movements.table.comment')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{new Date(movement.date).toLocaleString()}</td>
                    <td>{movement.batchNumber}</td>
                    <td>{movement.type}</td>
                    <td>{formatNumber(movement.quantity, i18n.language)}</td>
                    <td>
                      {movement.fromWarehouseName || movement.toWarehouseName || '—'}
                    </td>
                    <td>{movement.userEmail}</td>
                    <td>{movement.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>{t('warehouse.movements.empty')}</p>
          )}
        </div>
      )}

      {isLoading && <div className="global-loading">{t('warehouse.processing')}</div>}
    </div>
  )
}

export default WarehousePage
