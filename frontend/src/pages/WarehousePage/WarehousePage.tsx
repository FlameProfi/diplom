import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import BarcodeScanner from '../../components/ScannerComponent/BarcodeScanner'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import './WarehousePage.scss'

const WarehousePage = () => {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'scan' | 'stock' | 'reserve' | 'notifications'>('scan')
  const [barcode, setBarcode] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [movementType, setMovementType] = useState<'RECEIPT' | 'ISSUE' | 'RESERVE'>('RECEIPT')
  const [orderItemId, setOrderItemId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Query для партии по баркоду
  const { 
    data: batch, 
    refetch: refetchBatch, 
    error: batchError, 
    isFetching: batchFetching 
  } = useQuery({
    queryKey: ['batch', barcode],
    queryFn: async () => {
      if (!barcode) return null
      const res = await api.get(`/batches/barcode/${barcode}`)
      return res.data
    },
    enabled: !!barcode,
    staleTime: 5 * 60 * 1000, // 5 минут кэш
  })

  // Query для остатков
  const { 
    data: stock, 
    error: stockError, 
    isFetching: stockFetching 
  } = useQuery({
    queryKey: ['stock', activeTab === 'stock' ? 'all' : batch?.id],
    queryFn: async () => {
      if (activeTab === 'stock') {
        const res = await api.get('/stock')
        return res.data
      }
      if (batch?.id) {
        const res = await api.get(`/stock/batch/${batch.id}`)
        return res.data
      }
      return []
    },
    enabled: activeTab === 'stock' || !!batch?.id,
  })

  // Query для уведомлений
  const { 
    data: notifications, 
    error: notifError, 
    isFetching: notifFetching 
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const res = await api.get(`/notifications/user/${user.id}`)
      return res.data
    },
    enabled: activeTab === 'notifications' && !!user,
  })

  // Mutation для создания движения
  const createMovementMutation = useMutation({
    mutationFn: async (data: {
      batchId: string
      type: 'RECEIPT' | 'ISSUE' | 'RESERVE'
      quantity: number
      reason?: string
    }) => {
      return api.post('/inventory-movements', data)
    },
    onSuccess: (response) => {
      refetchBatch()
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setQuantity(0)
      setBarcode('')
      setManualInput('')
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

  // Mutation для резерва
  const reserveMutation = useMutation({
    mutationFn: async (data: {
      batchId: string
      orderItemId: string
      quantity: number
    }) => {
      return api.post('/inventory-movements/reserve', data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
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
    setBarcode(manualInput)
    refetchBatch()
  }

  const handleMovement = () => {
    if (!user) {
      alert('Пожалуйста, авторизуйтесь для работы с системой')
      return
    }
    
    if (!batch) {
      alert('Сначала отсканируйте или найдите партию')
      return
    }
    
    if (quantity <= 0) {
      alert('Введите количество больше 0')
      return
    }

    if (movementType === 'ISSUE' && quantity > batch.quantity) {
      alert(`Недостаточно товара на складе. Доступно: ${batch.quantity}`)
      return
    }

    if (createMovementMutation.isPending) {
      return // Предотвращаем повторные клики
    }

    createMovementMutation.mutate({
      batchId: batch.id,
      type: movementType,
      quantity,
      reason: `Движение по скану/вводу: ${barcode}`,
    })
  }

  const handleReserve = () => {
    if (!user) {
      alert('Пожалуйста, авторизуйтесь для работы с системой')
      return
    }

    if (!batch) {
      alert('Сначала отсканируйте партию для резерва')
      return
    }

    if (!orderItemId) {
      alert('Выберите ID элемента заказа')
      return
    }

    if (quantity <= 0) {
      alert('Введите количество больше 0')
      return
    }

    if (quantity > batch.quantity) {
      alert(`Недостаточно товара для резерва. Доступно: ${batch.quantity}`)
      return
    }

    if (reserveMutation.isPending) {
      return
    }

    reserveMutation.mutate({
      batchId: batch.id,
      orderItemId,
      quantity,
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    logout()
    window.location.href = '/login'
  }

  // Если пользователь не авторизован, показываем сообщение
  if (!user) {
    return (
      <div className="warehouse-page">
        <div className="auth-required">
          <h2>Доступ ограничен</h2>
          <p>Для работы с складом необходимо авторизоваться</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="login-btn"
          >
            Войти в систему
          </button>
        </div>
      </div>
    )
  }

  // Показываем лоадер при загрузке
  if (batchFetching || stockFetching || notifFetching || isLoading) {
    return (
      <div className="warehouse-page loading">
        <div className="loader">Загрузка...</div>
      </div>
    )
  }
  return (
    <div className="warehouse-page">
      <h2>Панель Складского Работника</h2>

      {/* Вкладки */}
      <div className="tabs">
        <button
          className={activeTab === 'scan' ? 'active' : ''}
          onClick={() => setActiveTab('scan')}
        >
          Сканер
        </button>
        <button
          className={activeTab === 'stock' ? 'active' : ''}
          onClick={() => setActiveTab('stock')}
        >
          Остатки
        </button>
        <button
          className={activeTab === 'reserve' ? 'active' : ''}
          onClick={() => setActiveTab('reserve')}
        >
          Резерв
        </button>
        <button
          className={activeTab === 'notifications' ? 'active' : ''}
          onClick={() => setActiveTab('notifications')}
        >
          Уведомления
        </button>
      </div>

      {/* Вкладка Сканер */}
      {activeTab === 'scan' && (
        <div>
          <div className="scanner-container">
            <BarcodeScanner onScan={handleScan} />
          </div>
          <div className="manual-input">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Баркод вручную"
              className="border p-2 rounded flex-1"
            />
            <button onClick={handleManualSearch} className="bg-blue-500 text-white px-4 py-2 rounded ml-2">
              Найти
            </button>
          </div>
          {batchError && <p className="error">Ошибка поиска партии: {batchError.message}</p>}
          {batch && (
            <div className="batch-card">
              <h3>{batch.batchNumber}</h3>
              <p>Тип: {batch.productType?.name}</p>
              <p>Остаток: {batch.quantity} {batch.unit}</p>
              <p>Статус: <span className={`status-badge status-${batch.status.toLowerCase()}`}>{batch.status}</span></p>
              <div className="movement-form">
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as any)}
                  className="border p-2 rounded mb-2"
                >
                  <option value="RECEIPT">Приёмка</option>
                  <option value="ISSUE">Отпуск</option>
                  <option value="RESERVE">Резерв</option>
                </select>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="Количество"
                  className="border p-2 rounded mb-2"
                  min="0"
                />
                <button
                  onClick={handleMovement}
                  disabled={createMovementMutation.isPending || quantity <= 0}
                  className="bg-green-500 text-white px-6 py-2 rounded disabled:opacity-50"
                >
                  {createMovementMutation.isPending ? 'Сохранение...' : 'Выполнить движение'}
                </button>
              </div>
            </div>
          )}
          {!batch && barcode && <p>Партия не найдена по баркоду: {barcode}</p>}
        </div>
      )}

      {/* Вкладка Остатки */}
      {activeTab === 'stock' && (
        <div className="stock-table">
          {stockError && <p className="error">Ошибка загрузки остатков: {stockError.message}</p>}
          {stock && stock.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Партия</th>
                  <th>Склад</th>
                  <th>Остаток</th>
                  <th>Резерв</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.batch.batchNumber}</td>
                    <td>{s.warehouse.name}</td>
                    <td>{s.quantity} {s.batch.unit}</td>
                    <td>{s.reserved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Остатки не найдены. Запустите seed или добавьте данные.</p>
          )}
        </div>
      )}

      {/* Вкладка Резерв */}
      {activeTab === 'reserve' && (
        <div className="reserve-section">
          <h3>Резерв под заказы</h3>
          {batch ? (
            <div>
              <p>Партия для резерва: {batch.batchNumber} (остаток: {batch.quantity})</p>
              <select
                value={orderItemId}
                onChange={(e) => setOrderItemId(e.target.value)}
                className="border p-2 rounded mb-2"
              >
                <option value="">Выберите позицию заказа</option>
                {/* Здесь query для orderItems, e.g., useQuery(['orderItems']) */}
                <option value="test-order-item-1">Заказ ORDER-001 (5 ед.)</option>
                <option value="test-order-item-2">Заказ ORDER-002 (10 ед.)</option>
              </select>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="Количество для резерва"
                className="border p-2 rounded mb-2"
                min="0"
              />
              <button
                onClick={handleReserve}
                disabled={reserveMutation.isPending || quantity <= 0 || !orderItemId}
                className="bg-yellow-500 text-white px-6 py-2 rounded disabled:opacity-50"
              >
                {reserveMutation.isPending ? 'Резервирование...' : 'Зарезервировать'}
              </button>
            </div>
          ) : (
            <p>Сначала отсканируйте партию для резерва.</p>
          )}
        </div>
      )}

      {/* Вкладка Уведомления */}
      {activeTab === 'notifications' && (
        <div className="notifications-list">
          <h3>Уведомления</h3>
          {notifError && <p className="error">Ошибка загрузки уведомлений: {notifError.message}</p>}
          {notifications && notifications.length > 0 ? (
            <ul>
              {notifications.map((n: any) => (
                <li key={n.id} className="notification-item">
                  {n.message} ({new Date(n.createdAt).toLocaleString()})
                </li>
              ))}
            </ul>
          ) : (
            <p>Уведомлений нет. Создайте движение для генерации (low stock).</p>
          )}
        </div>
      )}
    </div>
  );
};

export default WarehousePage;