import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BarcodeDisplay from '../../components/BarcodeDisplay/BarcodeDisplay'
import api from '../../services/api'
import './BatchDetailPage.scss'

const statusLabels: Record<string, string> = {
  DRAFT: 'Черновик',
  ARRIVED: 'Прибыла',
  QUARANTINE: 'Карантин',
  CERTIFIED: 'Сертифицирована',
  ACTIVE: 'Активна',
  SHIPPED: 'Отгружена',
  SCRAPPED: 'Списана',
}

const movementLabels: Record<string, string> = {
  IN: 'Поступление',
  OUT: 'Списание',
  MOVE: 'Перемещение',
  RESERVE: 'Резерв',
  RELEASE: 'Снятие резерва',
}

const BatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('GENERAL')

  // Запрос данных партии
  const { data: batch, isLoading, error, refetch } = useQuery({
    queryKey: ['batch', id],
    queryFn: async () => {
      const res = await api.get(`/batches/${id}`)
      return res.data
    },
    enabled: !!id,
  })

  // Мутирование статуса
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await api.put(`/batches/${id}/status`, { status: newStatus })
      return res.data
    },
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ['batches'] })
    },
    onError: (error: any) => alert(error.response?.data?.message || 'Ошибка обновления статуса'),
  })

  // Мутирование загрузки документа
  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post(`/batches/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      refetch()
      setFile(null)
    },
    onError: (error: any) => alert(error.response?.data?.message || 'Ошибка загрузки файла'),
  })

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    setSelectedStatus(newStatus)
    if (newStatus && newStatus !== batch?.status) {
      updateStatusMutation.mutate(newStatus)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = () => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', documentType)
    uploadDocumentMutation.mutate(formData)
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Удалить документ?')) return
    try {
      await api.delete(`/batches/documents/${documentId}`)
      refetch()
    } catch (error) {
      alert('Ошибка удаления файла')
    }
  }

  const summary = useMemo(() => {
    const totalQuantity = Number(batch?.quantity ?? 0)
    const totalReserved = batch?.stockItems?.reduce((sum: number, item: any) => sum + Number(item.reserved ?? 0), 0) ?? 0
    const totalAvailable = Math.max(totalQuantity - totalReserved, 0)

    return { totalQuantity, totalReserved, totalAvailable }
  }, [batch])

  const formatDateTime = (value?: string | Date) => {
    if (!value) return '—'
    const date = typeof value === 'string' ? new Date(value) : value
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU')
  }

  const baseUrl = useMemo(() => {
    const apiBase = api.defaults.baseURL ?? ''
    return apiBase ? apiBase.replace(/\/api\/?$/, '') : ''
  }, [])

  const buildFileUrl = (path?: string) => {
    if (!path) return '#'
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    return `${baseUrl}${path}`
  }

  const normalizeStatusClass = (status?: string) => String(status || 'unknown').toLowerCase()

  const formatFileSize = (size?: number) => {
    const normalized = Number.isFinite(size) ? Number(size) : 0
    return `${(normalized / 1024).toFixed(1)} KB`
  }

  if (isLoading) return <div className="loading">Загрузка...</div>
  if (error) return <div className="error">Ошибка: {(error as any).message}</div>
  if (!batch) return <div>Партия не найдена</div>

  const statusOptions = ['DRAFT', 'ARRIVED', 'QUARANTINE', 'CERTIFIED', 'ACTIVE', 'SHIPPED', 'SCRAPPED']

  return (
    <div className="batch-detail-page">
      <header className="page-header">
        <h1>Подробно: {batch.batchNumber}</h1>
        <button onClick={() => navigate('/batches')} className="back-btn">Назад</button>
      </header>

      <div className="batch-info">
        <section className="info-section">
          <h2>Основная информация</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Номер партии</label>
              <div className="value">{batch.batchNumber}</div>
            </div>
            <div className="info-item">
              <label>Штрих-код</label>
              <div className="value">{batch.barcode || 'Не указан'}</div>
              {batch.barcode && (
                <div className="barcode-wrap">
                  <BarcodeDisplay code={batch.barcode} />
                </div>
              )}
            </div>
            <div className="info-item">
              <label>Тип продукта</label>
              <div className="value">{batch.productType?.name || batch.productTypeName || 'Не указан'}</div>
            </div>
            <div className="info-item">
              <label>Единица измерения</label>
              <div className="value">{batch.unit || '—'}</div>
            </div>
            <div className="info-item">
              <label>Создана</label>
              <div className="value">{formatDateTime(batch.createdAt)}</div>
            </div>
            <div className="info-item status-item">
              <label>Статус</label>
              <div className="value">
                <span className={`status-badge ${normalizeStatusClass(batch.status)}`}>
                  {statusLabels[batch.status] || batch.status || '—'}
                </span>
                <select
                  value={selectedStatus || batch.status}
                  onChange={handleStatusChange}
                  className="status-select"
                  disabled={updateStatusMutation.isPending}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status] || status}
                    </option>
                  ))}
                </select>
                {updateStatusMutation.isPending && (
                  <span className="status-updating">Обновление...</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="summary-section">
          <h2>Сводка по количеству</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <label>Всего</label>
              <div className="value">{summary.totalQuantity} {batch.unit}</div>
            </div>
            <div className="summary-item">
              <label>Зарезервировано</label>
              <div className="value">{summary.totalReserved} {batch.unit}</div>
            </div>
            <div className="summary-item">
              <label>Доступно</label>
              <div className="value">{summary.totalAvailable} {batch.unit}</div>
            </div>
          </div>
        </section>

        <section className="movements-section">
          <h2>Движения</h2>
          {batch.inventoryMovements?.length ? (
            <ul className="movements-list">
              {batch.inventoryMovements.map((movement: any) => (
                <li key={movement.id}>
                  <div>
                    <span className="movement-type">{movementLabels[movement.type] || movement.type}</span>
                    <span className="movement-details">
                      {movement.quantity} {batch.unit} • {formatDateTime(movement.date)}
                      {movement.reason && <div>{movement.reason}</div>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-movements">Нет движений</p>
          )}
        </section>

        <section className="stock-section">
          <h2>Запасы по складам</h2>
          {batch.stockItems?.length ? (
            <div className="stock-table">
              <table>
                <thead>
                  <tr>
                    <th>Склад</th>
                    <th>Тип</th>
                    <th>Локация</th>
                    <th>Количество</th>
                    <th>Зарезервировано</th>
                    <th>Доступно</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.stockItems.map((item: any) => {
                    const available = Math.max(Number(item.quantity ?? 0) - Number(item.reserved ?? 0), 0)
                    return (
                      <tr key={item.id}>
                        <td>{item.warehouse?.name || 'Неизвестный склад'}</td>
                        <td>{item.warehouse?.type || '—'}</td>
                        <td>{item.warehouse?.location || '—'}</td>
                        <td className="quantity-cell">{item.quantity} {batch.unit}</td>
                        <td className="quantity-cell">{item.reserved} {batch.unit}</td>
                        <td className="quantity-cell">{available} {batch.unit}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-stock">Нет запасов</p>
          )}
        </section>

        <section className="documents-section">
          <h2>Документы</h2>
          <div
            className={`upload-area ${file ? 'dragover' : ''}`}
            onDrop={(e) => {
              e.preventDefault()
              if (e.dataTransfer.files?.length) {
                setFile(e.dataTransfer.files[0])
              }
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="upload-controls">
              <label className="field-label" htmlFor="document-type">Тип документа</label>
              <select
                id="document-type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="doc-type-select"
              >
                <option value="GENERAL">Общий</option>
                <option value="CERTIFICATE">Сертификат</option>
                <option value="INVOICE">Счет</option>
                <option value="SPEC">Спецификация</option>
              </select>
            </div>
            <input
              type="file"
              onChange={handleFileChange}
              className="file-input"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
            />
            <button
              onClick={handleUpload}
              disabled={!file || uploadDocumentMutation.isPending}
              className={`upload-btn ${uploadDocumentMutation.isPending ? 'uploading' : ''}`}
            >
              {uploadDocumentMutation.isPending ? 'Загрузка...' : 'Загрузить документ'}
            </button>
            {file && <span>Выбран: {file.name} ({formatFileSize(file.size)})</span>}
          </div>

          {batch.documents?.length ? (
            <ul className="documents-list">
              {batch.documents.map((doc: any) => (
                <li key={doc.id} className="document-item">
                  <div className="document-info">
                    <a
                      href={buildFileUrl(doc.filePath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="document-name"
                    >
                      {doc.fileName}
                    </a>
                    <div className="document-meta">
                      <span className="file-size">
                        {formatFileSize(doc.fileSize)}
                      </span>
                      <span>{doc.type || 'GENERAL'}</span>
                      <span>{formatDateTime(doc.uploadDate)}</span>
                    </div>
                  </div>
                  <div className="document-actions">
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="delete-btn"
                      disabled={uploadDocumentMutation.isPending}
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-documents">
              Документы отсутствуют
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default BatchDetailPage
