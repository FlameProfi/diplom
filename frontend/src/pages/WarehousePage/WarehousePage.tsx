import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import BarcodeScanner from '../../components/ScannerComponent/BarcodeScanner'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { hasPermission, Role } from '../../utils/roles'
import './WarehousePage.scss'

type TabKey = 'scan' | 'stock' | 'reserve' | 'notifications' | 'movements' | 'overview'

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

  const isAdmin = !!user && hasPermission(user.role as Role, Role.MANAGER)

  const tabs = [
    { key: 'scan', label: 'Сканер', adminOnly: false },
    { key: 'stock', label: 'Остатки', adminOnly: false },
    { key: 'reserve', label: 'Резерв', adminOnly: false },
    { key: 'notifications', label: 'Уведомления', adminOnly: false },
    { key: 'overview', label: 'Обзор', adminOnly: true },
    { key: 'movements', label: 'Движения', adminOnly: true },
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
      alert('Движение успешно создано!')
    },
    onError: (error: any) => {
      if (error.response?.status === 401) {
        alert('Сессия истекла. Перезайдите в систему.')
        localStorage.removeItem('accessToken')
        logout()
        window.location.href = '/login'
        return
      }
      if (error.response?.status === 403) {
        alert('Недостаточно прав для выполнения операции.')
        return
      }
      alert(`Ошибка создания движения: ${error.response?.data?.message || error.message}`)
    },
    onMutate: () => {
      setIsLoading(true)
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })

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
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      setQuantity(0)
      setOrderItemId('')
      alert('Резерв успешно создан!')
    },
    onError: (error: any) => {
      if (error.response?.status === 401) {
        alert('Сессия истекла. Перезайдите в систему.')
        localStorage.removeItem('accessToken')
        logout()
        window.location.href = '/login'
        return
      }
      if (error.response?.status === 403) {
        alert('Недостаточно прав для создания резерва.')
        return
      }
      alert(`Ошибка резерва: ${error.response?.data?.message || error.message}`)
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
      alert('Пожалуйста, авторизуйтесь для работы с системой')
      return
    }
    setManualBatch(null)
    setBarcode(scanned)
    setManualInput(scanned)
    refetchBatch()
  }

  const handleManualSearch = () => {
    if (!user) {
      alert('Пожалуйста, авторизуйтесь для работы с системой')
      return
    }
    if (!manualInput.trim()) {
      alert('Введите баркод для поиска')
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
      alert('Пожалуйста, авторизуйтесь для работы с системой')
      return
    }

    if (!resolvedBatch) {
      alert('Сначала отсканируйте или найдите партию')
      return
    }

    if (quantity <= 0) {
      alert('Введите количество больше 0')
      return
    }

    if (movementType === 'ISSUE' && quantity > availableQuantity) {
      alert(`Недостаточно доступного товара. Доступно: ${availableQuantity}`)
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
      alert('Пожалуйста, авторизуйтесь для работы с системой')
      return
    }

    if (!resolvedBatch) {
      alert('Сначала отсканируйте партию для резерва')
      return
    }

    if (!orderItemId) {
      alert('Выберите позицию заказа')
      return
    }

    if (quantity <= 0) {
      alert('Введите количество больше 0')
      return
    }

    if (quantity > availableQuantity) {
      alert(`Недостаточно товара для резерва. Доступно: ${availableQuantity}`)
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
          <h2>Доступ ограничен</h2>
          <p>Для работы с складом необходимо авторизоваться</p>
          <button onClick={() => (window.location.href = '/login')} className="login-btn">
            Войти в систему
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="warehouse-page">
      <div className="warehouse-header">
        <div>
          <h2>Панель склада</h2>
          <p className="subtitle">
            {user.email} • роль: {user.role}
          </p>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={handleResetBatch}>
            Сбросить партию
          </button>
          <button className="danger" onClick={handleLogout}>
            Выйти
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
                placeholder="Баркод вручную"
              />
              <button onClick={handleManualSearch}>Найти</button>
            </div>
            {batchFetching && <p className="muted">Идет поиск партии...</p>}
            {batchError && <p className="error">Ошибка поиска партии: {batchError.message}</p>}
          </div>

          <div className="batch-card">
            <h3>Партия</h3>
            {resolvedBatch ? (
              <>
                <p>Номер: {resolvedBatch.batchNumber}</p>
                <p>Тип: {resolvedBatch.productType?.name ?? '—'}</p>
                <p>
                  Остаток: {resolvedBatch.quantity} {resolvedBatch.unit}
                </p>
                <p>Резерв: {totalReserved}</p>
                <p>
                  Доступно: {availableQuantity} {resolvedBatch.unit}
                </p>
                <p>
                  Статус:{' '}
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
                          {item.quantity} / {item.reserved}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="muted">Отсканируйте партию, чтобы увидеть детали.</p>
            )}
          </div>

          <div className="movement-card">
            <h3>Операция</h3>
            <div className="movement-form">
              <label>
                Тип операции
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as 'RECEIPT' | 'ISSUE' | 'RESERVE')}
                >
                  <option value="RECEIPT">Приёмка</option>
                  <option value="ISSUE">Отпуск</option>
                  <option value="RESERVE">Резерв</option>
                </select>
              </label>
              <label>
                Склад
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                >
                  <option value="">По умолчанию</option>
                  {warehouses?.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Количество
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="0"
                  placeholder="Количество"
                />
              </label>
              <label>
                Причина
                <textarea
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="Комментарий к операции"
                />
              </label>
              <button
                onClick={handleMovement}
                disabled={createMovementMutation.isPending || quantity <= 0 || !resolvedBatch}
              >
                {createMovementMutation.isPending ? 'Сохранение...' : 'Выполнить'}
              </button>
              {warehouseError && <p className="error">Ошибка загрузки складов: {warehouseError.message}</p>}
              {warehouseFetching && <p className="muted">Загружаем список складов...</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="stock-table">
          <div className="stock-filters">
            <input
              type="text"
              placeholder="Поиск по партии или складу"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
            />
            <select
              value={stockWarehouseFilter}
              onChange={(e) => setStockWarehouseFilter(e.target.value)}
            >
              <option value="">Все склады</option>
              {warehouses?.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>
          {stockFetching && <p className="muted">Загружаем остатки...</p>}
          {stockError && <p className="error">Ошибка загрузки остатков: {stockError.message}</p>}
          {filteredStock && filteredStock.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Партия</th>
                  <th>Склад</th>
                  <th>Остаток</th>
                  <th>Резерв</th>
                  <th>Доступно</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item) => (
                  <tr key={item.id}>
                    <td>{item.batch.batchNumber}</td>
                    <td>{item.warehouse.name}</td>
                    <td>
                      {item.quantity} {item.batch.unit}
                    </td>
                    <td>{item.reserved}</td>
                    <td>{item.quantity - item.reserved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Остатки не найдены. Запустите seed или добавьте данные.</p>
          )}
        </div>
      )}

      {activeTab === 'reserve' && (
        <div className="reserve-section">
          <h3>Резерв под заказы</h3>
          {ordersFetching && <p className="muted">Загружаем заказы...</p>}
          {ordersError && <p className="error">Ошибка загрузки заказов: {ordersError.message}</p>}
          {resolvedBatch ? (
            <div className="reserve-form">
              <p>
                Партия для резерва: {resolvedBatch.batchNumber} (доступно: {availableQuantity}{' '}
                {resolvedBatch.unit})
              </p>
              <label>
                Позиция заказа
                <select
                  value={orderItemId}
                  onChange={(e) => setOrderItemId(e.target.value)}
                >
                  <option value="">Выберите позицию заказа</option>
                  {reserveOrderItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.orderNumber} • {item.batchNumber} • {item.quantity} ед. • {item.customerName}
                    </option>
                  ))}
                </select>
              </label>
              {reserveOrderItems.length === 0 && (
                <p className="muted">
                  Для этой партии нет заказов. Проверьте список заказов или выберите другую партию.
                </p>
              )}
              <label>
                Количество для резерва
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="0"
                  placeholder="Количество"
                />
              </label>
              <button
                onClick={handleReserve}
                disabled={reserveMutation.isPending || quantity <= 0 || !orderItemId}
              >
                {reserveMutation.isPending ? 'Резервирование...' : 'Зарезервировать'}
              </button>
            </div>
          ) : (
            <div className="reserve-empty">
              <p>Сначала отсканируйте партию для резерва.</p>
              {orderItems.length > 0 && (
                <div className="reserve-helper">
                  <p className="muted">Либо выберите заказ и подтяните партию вручную:</p>
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
                    <option value="">Выберите заказ</option>
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
          <h3>Уведомления</h3>
          {notifFetching && <p className="muted">Загружаем уведомления...</p>}
          {notifError && <p className="error">Ошибка загрузки уведомлений: {notifError.message}</p>}
          {notifications && notifications.length > 0 ? (
            <ul>
              {notifications.map((notification) => (
                <li key={notification.id} className="notification-item">
                  {notification.message} ({new Date(notification.createdAt).toLocaleString()})
                </li>
              ))}
            </ul>
          ) : (
            <p>Уведомлений нет. Создайте движение для генерации (low stock).</p>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="overview-grid">
          <div className="summary-card">
            <h3>Сводка склада</h3>
            <div className="summary-metrics">
              <div>
                <span>Всего</span>
                <strong>{totalStock}</strong>
              </div>
              <div>
                <span>В резерве</span>
                <strong>{totalReservedStock}</strong>
              </div>
              <div>
                <span>Доступно</span>
                <strong>{totalAvailableStock}</strong>
              </div>
            </div>
            {stockFetching && <p className="muted">Загружаем сводку...</p>}
          </div>
          <div className="summary-card">
            <h3>Активная партия</h3>
            {resolvedBatch ? (
              <>
                <p>{resolvedBatch.batchNumber}</p>
                <p>
                  {resolvedBatch.quantity} {resolvedBatch.unit}
                </p>
                <p>Доступно: {availableQuantity}</p>
              </>
            ) : (
              <p className="muted">Партия не выбрана.</p>
            )}
          </div>
          <div className="summary-card">
            <h3>Текущий склад</h3>
            <p>{warehouses?.find((wh) => wh.id === selectedWarehouseId)?.name ?? 'По умолчанию'}</p>
            {warehouseError && <p className="error">Ошибка загрузки складов: {warehouseError.message}</p>}
          </div>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="movements-section">
          <div className="movements-toolbar">
            <input
              type="text"
              placeholder="Поиск по партии, складу или пользователю"
              value={movementSearch}
              onChange={(e) => setMovementSearch(e.target.value)}
            />
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })}>
              Обновить
            </button>
          </div>
          {movementsFetching && <p className="muted">Загружаем движения...</p>}
          {movementsError && <p className="error">Ошибка загрузки движений: {movementsError.message}</p>}
          {filteredMovements && filteredMovements.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Партия</th>
                  <th>Тип</th>
                  <th>Количество</th>
                  <th>Склад</th>
                  <th>Пользователь</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{new Date(movement.date).toLocaleString()}</td>
                    <td>{movement.batchNumber}</td>
                    <td>{movement.type}</td>
                    <td>{movement.quantity}</td>
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
            <p>Движений пока нет.</p>
          )}
        </div>
      )}

      {isLoading && <div className="global-loading">Обработка...</div>}
    </div>
  )
}

export default WarehousePage
