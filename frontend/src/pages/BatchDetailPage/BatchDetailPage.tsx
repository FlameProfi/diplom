import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BarcodeDisplay from '../../components/BarcodeDisplay/BarcodeDisplay'
import api from '../../services/api'
import { formatNumber } from '../../utils/format'
import './BatchDetailPage.scss'


const parameterAliases: Record<string, string[]> = {
  size: ['size', 'размер', 'габарит', 'dimension'],
  composition: ['composition', 'состав', 'material', 'материал'],
}

const BatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()

  const statusLabels: Record<string, string> = {
    DRAFT: t('batchDetail.fields.status_DRAFT', { defaultValue: t('batches.statuses.DRAFT') }),
    QUARANTINE: t('batchDetail.fields.status_QUARANTINE', { defaultValue: t('batches.statuses.QUARANTINE') }),
    CERTIFIED: t('batchDetail.fields.status_CERTIFIED', { defaultValue: t('batches.statuses.CERTIFIED') }),
    ACTIVE: t('batchDetail.fields.status_ACTIVE', { defaultValue: t('batches.statuses.ACTIVE') }),
    SHIPPED: t('batchDetail.fields.status_SHIPPED', { defaultValue: t('batches.statuses.SHIPPED') }),
    SCRAPPED: t('batchDetail.fields.status_SCRAPPED', { defaultValue: t('batches.statuses.SCRAPPED') }),
  }

  const movementLabels: Record<string, string> = {
    IN: t('batchDetail.movements.types.IN'),
    OUT: t('batchDetail.movements.types.OUT'),
    MOVE: t('batchDetail.movements.types.MOVE'),
    RESERVE: t('batchDetail.movements.types.RESERVE'),
    RELEASE: t('batchDetail.movements.types.RELEASE'),
  }
  const [selectedStatus, setSelectedStatus] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('GENERAL')
  const [showBarcode, setShowBarcode] = useState(false)
  const labelPrintRef = useRef<HTMLDivElement | null>(null)

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
    onError: (error: any) => alert(t('batchDetail.documents.statusUpdateError', { message: error.response?.data?.message || error.message })),
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
    onError: (error: any) => alert(t('batchDetail.documents.uploadError', { message: error.response?.data?.message || error.message })),
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
    if (!confirm(t('batchDetail.documents.deleteConfirm'))) return
    try {
      await api.delete(`/batches/documents/${documentId}`)
      refetch()
    } catch (error) {
      alert(t('batchDetail.documents.deleteError'))
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
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')
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

  const parsedParameters = useMemo(() => {
    const raw = String(batch?.parameters ?? '').trim()
    if (!raw) return {}

    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>
      }
    } catch {
      // ignore parse errors and fallback to plain text
    }

    return { raw }
  }, [batch?.parameters])

  const getParameterValue = (aliases: string[]) => {
    const entries = Object.entries(parsedParameters)
    const found = entries.find(([key]) => aliases.includes(key.toLowerCase()))
    if (!found) return null

    const value = found[1]
    if (value == null) return null
    return String(value)
  }

  const labelData = useMemo(() => {
    const size = getParameterValue(parameterAliases.size) || t('batchDetail.fields.notSpecified')
    const composition = getParameterValue(parameterAliases.composition)
      || (batch?.parameters ? String(batch.parameters) : t('batchDetail.fields.notSpecified'))

    return {
      size,
      composition,
      batchNumber: batch?.batchNumber || '—',
      barcode: batch?.barcode || '',
      productionDate: formatDateTime(batch?.productionDate || batch?.createdAt),
    }
  }, [batch, parsedParameters, t])

  const handlePrintLabel = () => {
    if (!labelPrintRef.current) return

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      alert(t('batchDetail.label.printWindowError'))
      return
    }

    const printableStyles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; display: flex; justify-content: center; }
        .label-card { border: 2px solid #111827; border-radius: 10px; padding: 30px; width: 500px; }
        .label-title { margin: 0 0 20px; font-size: 24px; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .label-row { margin-bottom: 12px; font-size: 18px; line-height: 1.4; }
        .label-row strong { display: inline-block; min-width: 160px; color: #4b5563; }
        .barcode-wrapper { margin-top: 25px; text-align: center; border-top: 1px dashed #ccc; padding-top: 20px; }
        .barcode-wrapper svg { max-width: 100%; height: auto; }
      </style>
    `

    printWindow.document.write(`
      <html>
        <head>
          <title>${t('batchDetail.label.printWindowTitle', { number: labelData.batchNumber })}</title>
          ${printableStyles}
        </head>
        <body>
          ${labelPrintRef.current.outerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (isLoading) return <div className="loading">{t('batchDetail.loading')}</div>
  if (error) return <div className="error">{t('batchDetail.error', { message: (error as any).message })}</div>
  if (!batch) return <div>{t('batchDetail.notFound')}</div>

  const statusOptions = ['DRAFT', 'QUARANTINE', 'CERTIFIED', 'ACTIVE', 'SHIPPED', 'SCRAPPED']

  return (
    <div className="batch-detail-page">
      <header className="page-header">
        <h1>{t('batchDetail.title', { number: batch.batchNumber })}</h1>
        <button onClick={() => navigate('/batches')} className="back-btn">{t('batchDetail.back')}</button>
      </header>

      <div className="batch-info">
        <section className="info-section">
          <h2>{t('batchDetail.sections.main')}</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>{t('batchDetail.fields.number')}</label>
              <div className="value">{batch.batchNumber}</div>
            </div>
            <div className="info-item">
              <label>{t('batchDetail.fields.barcode')}</label>
              <div className="value">{batch.barcode || t('batchDetail.fields.notSpecified')}</div>
              {batch.barcode && (
                <div className="barcode-wrap">
                  <button
                    type="button"
                    className="barcode-toggle"
                    onClick={() => setShowBarcode((prev) => !prev)}
                  >
                    {showBarcode ? t('batchDetail.fields.hide') : t('batchDetail.fields.show')}
                  </button>
                  {showBarcode && <BarcodeDisplay code={batch.barcode} />}
                </div>
              )}
            </div>
            <div className="info-item">
              <label>{t('batchDetail.fields.productType')}</label>
              <div className="value">{batch.productType?.name || batch.productTypeName || t('batchDetail.fields.notSpecified')}</div>
            </div>
            <div className="info-item">
              <label>{t('batchDetail.fields.unit')}</label>
              <div className="value">{batch.unit || '—'}</div>
            </div>
            <div className="info-item">
              <label>{t('batchDetail.fields.created')}</label>
              <div className="value">{formatDateTime(batch.createdAt)}</div>
            </div>
            <div className="info-item status-item">
              <label>{t('batchDetail.fields.status')}</label>
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
                  <span className="status-updating">{t('batchDetail.fields.updating')}</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="summary-section">
          <h2>{t('batchDetail.sections.summary')}</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <label>{t('batchDetail.fields.total')}</label>
              <div className="value">{formatNumber(summary.totalQuantity, i18n.language)} {batch.unit}</div>
            </div>
            <div className="summary-item">
              <label>{t('batchDetail.fields.reserved')}</label>
              <div className="value">{formatNumber(summary.totalReserved, i18n.language)} {batch.unit}</div>
            </div>
            <div className="summary-item">
              <label>{t('batchDetail.fields.available')}</label>
              <div className="value">{formatNumber(summary.totalAvailable, i18n.language)} {batch.unit}</div>
            </div>
          </div>
        </section>


        <section className="label-section">
          <h2>{t('batchDetail.sections.label')}</h2>
          <p className="label-description">
            {t('batchDetail.label.description')}
          </p>
          <div className="label-preview" ref={labelPrintRef}>
            <div className="label-card">
              <h3 className="label-title">{t('batchDetail.label.title')}</h3>
              <div className="label-row"><strong>{t('batchDetail.label.size')}:</strong> {labelData.size}</div>
              <div className="label-row"><strong>{t('batchDetail.label.composition')}:</strong> {labelData.composition}</div>
              <div className="label-row"><strong>{t('batchDetail.fields.number')}:</strong> {labelData.batchNumber}</div>
              <div className="label-row"><strong>{t('batchDetail.label.productionDate')}:</strong> {labelData.productionDate}</div>
              {labelData.barcode && (
                <div className="barcode-wrapper">
                  <BarcodeDisplay code={labelData.barcode} displayValue={true} />
                </div>
              )}
            </div>
          </div>
          <button type="button" className="print-label-btn" onClick={handlePrintLabel}>
            {t('batchDetail.label.print')}
          </button>
        </section>

        <section className="movements-section">
          <h2>{t('batchDetail.sections.movements')}</h2>
          {batch.inventoryMovements?.length ? (
            <ul className="movements-list">
              {batch.inventoryMovements.map((movement: any) => (
                <li key={movement.id}>
                  <div>
                    <span className="movement-type">{movementLabels[movement.type] || movement.type}</span>
                    <span className="movement-details">
                      {formatNumber(movement.quantity, i18n.language)} {batch.unit} • {formatDateTime(movement.date)}
                          {movement.reason && <div>{movement.reason}</div>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-movements">{t('batchDetail.movements.empty')}</p>
          )}
        </section>

        <section className="stock-section">
          <h2>{t('batchDetail.sections.stock')}</h2>
          {batch.stockItems?.length ? (
            <div className="stock-table">
              <table>
                <thead>
                  <tr>
                    <th>{t('batchDetail.stock.warehouse')}</th>
                    <th>{t('batchDetail.stock.type')}</th>
                    <th>{t('batchDetail.stock.location')}</th>
                    <th>{t('batchDetail.stock.quantity')}</th>
                    <th>{t('batchDetail.stock.reserved')}</th>
                    <th>{t('batchDetail.stock.available')}</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.stockItems.map((item: any) => {
                    const available = Math.max(Number(item.quantity ?? 0) - Number(item.reserved ?? 0), 0)
                    return (
                      <tr key={item.id}>
                        <td>{item.warehouse?.name || t('batchDetail.stock.unknownWarehouse')}</td>
                        <td>{item.warehouse?.type || '—'}</td>
                        <td>{item.warehouse?.location || '—'}</td>
                        <td className="quantity-cell">{formatNumber(item.quantity, i18n.language)} {batch.unit}</td>
                        <td className="quantity-cell">{formatNumber(item.reserved, i18n.language)} {batch.unit}</td>
                        <td className="quantity-cell">{formatNumber(available, i18n.language)} {batch.unit}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-stock">{t('batchDetail.stock.empty')}</p>
          )}
        </section>

        <section className="documents-section">
          <h2>{t('batchDetail.sections.documents')}</h2>
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
              <label className="field-label" htmlFor="document-type">{t('batchDetail.documents.type')}</label>
              <select
                id="document-type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="doc-type-select"
              >
                <option value="GENERAL">{t('batchDetail.documents.types.GENERAL')}</option>
                <option value="CERTIFICATE">{t('batchDetail.documents.types.CERTIFICATE')}</option>
                <option value="INVOICE">{t('batchDetail.documents.types.INVOICE')}</option>
                <option value="SPEC">{t('batchDetail.documents.types.SPEC')}</option>
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
              {uploadDocumentMutation.isPending ? t('batchDetail.documents.uploading') : t('batchDetail.documents.upload')}
            </button>
            {file && <span>{t('batchDetail.documents.selected', { name: file.name, size: formatFileSize(file.size) })}</span>}
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
                      <span>{t(`batchDetail.documents.types.${doc.type}`, { defaultValue: doc.type || 'GENERAL' })}</span>
                      <span>{formatDateTime(doc.uploadDate)}</span>
                    </div>
                  </div>
                  <div className="document-actions">
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="delete-btn"
                      disabled={uploadDocumentMutation.isPending}
                    >
                      {t('batchDetail.documents.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-documents">
              {t('batchDetail.documents.empty')}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default BatchDetailPage
