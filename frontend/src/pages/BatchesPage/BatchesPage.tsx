// src/pages/BatchesPage.tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BarcodeDisplay from '../../components/BarcodeDisplay/BarcodeDisplay'
import api from '../../services/api'
import './BatchesPage.scss'

interface CreateBatchForm {
  batchNumber: string
  productTypeId: string
  quantity: number
  unit: string
  status: string
  productionDate?: string
  expiryDate?: string
  barcode?: string
  packagingType?: string
  minStock?: number
}

const BatchesPage = () => {
  const { t } = useTranslation()

  const statusOptions = [
    { value: 'DRAFT', label: t('batches.statuses.DRAFT') },
    { value: 'QUARANTINE', label: t('batches.statuses.QUARANTINE') },
    { value: 'CERTIFIED', label: t('batches.statuses.CERTIFIED') },
    { value: 'ACTIVE', label: t('batches.statuses.ACTIVE') },
    { value: 'SHIPPED', label: t('batches.statuses.SHIPPED') },
    { value: 'SCRAPPED', label: t('batches.statuses.SCRAPPED') },
  ]

  const queryClient = useQueryClient()
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const { data: batches = [], isLoading, error } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const res = await api.get('/batches');
      return res.data;
    },
  });

  const { data: productTypes = [] } = useQuery({
    queryKey: ['productTypes'],
    queryFn: async () => {
      const res = await api.get('/producttypes')
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateBatchForm) => api.post('/batches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      setShowForm(false)
      reset()
    },
    onError: (error: any) => {
      alert(t('batches.createError', { message: error.response?.data?.message || error.message }))
    },
  })

  const { register, handleSubmit, reset, setValue, watch } = useForm<CreateBatchForm>({
    defaultValues: {
      batchNumber: '',
      productTypeId: '',
      quantity: 0,
      unit: '',
      status: 'ACTIVE',
      productionDate: '',
      expiryDate: '',
      barcode: '',
      packagingType: '',
      minStock: undefined,
    },
  })

  const selectedProductTypeId = watch('productTypeId')

  useEffect(() => {
    if (!selectedProductTypeId) return
    const productType = productTypes.find((type: any) => type.id === selectedProductTypeId)
    if (productType?.unit) {
      setValue('unit', productType.unit)
    }
  }, [productTypes, selectedProductTypeId, setValue])

  const onSubmit = (data: CreateBatchForm) => {
    const normalizedMinStock = Number.isFinite(data.minStock as number) ? Number(data.minStock) : undefined
    const payload: CreateBatchForm = {
      ...data,
      batchNumber: data.batchNumber.trim(),
      unit: data.unit.trim(),
      quantity: Number(data.quantity) || 0,
      barcode: data.barcode?.trim() || '',
      packagingType: data.packagingType?.trim() || '',
      productionDate: data.productionDate || undefined,
      expiryDate: data.expiryDate || undefined,
      minStock: normalizedMinStock,
    }

    createMutation.mutate(payload)
  }

  // Фильтрация
  const filteredBatches = useMemo(() => {
    return batches.filter((batch: any) => {
      const batchNumber = String(batch.batchNumber || '');
      const barcode = String(batch.barcode || '');
      const status = String(batch.status || '');
      const matchesSearch =
        batchNumber.toLowerCase().includes(search.toLowerCase()) ||
        barcode.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' || status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [batches, search, filterStatus])

  if (isLoading) return <div className="loading">{t('batches.loading')}</div>;
  if (error) return <div className="error">{t('batches.errorLoading')}</div>;

  return (
    <div className="batches-page">
      <header className="page-header">
        <div>
          <h1>{t('batches.title')}</h1>
          <p className="subtitle">{t('batches.subtitle')}</p>
        </div>
        <div className="stats">
          <span>{t('batches.stats.total', { count: batches.length })}</span>
          <span className="active">{t('batches.stats.active', { count: batches.filter((b: any) => b.status === 'ACTIVE').length })}</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          disabled={createMutation.isPending}
        >
          {showForm ? t('batches.actions.cancel') : t('batches.actions.new')}
        </button>
      </header>

      {showForm && (
        <form className="batch-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="batchNumber">{t('batches.form.batchNumber')}</label>
              <input id="batchNumber" {...register('batchNumber')} placeholder={t('batches.form.batchNumberPlaceholder')} />
              <span className="helper">{t('batches.form.batchNumberHelper')}</span>
            </div>
            <div className="form-field">
              <label htmlFor="productTypeId">{t('batches.form.productType')}</label>
              <select id="productTypeId" {...register('productTypeId', { required: true })}>
                <option value="">{t('batches.form.productTypePlaceholder')}</option>
                {productTypes.map((type: any) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="quantity">{t('batches.form.quantity')}</label>
              <input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                {...register('quantity', { valueAsNumber: true, min: 0 })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="unit">{t('batches.form.unit')}</label>
              <input id="unit" {...register('unit', { required: true })} placeholder={t('batches.form.unitPlaceholder')} />
            </div>
            <div className="form-field">
              <label htmlFor="status">{t('batches.form.status')}</label>
              <select id="status" {...register('status')}>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="productionDate">{t('batches.form.productionDate')}</label>
              <input id="productionDate" type="date" {...register('productionDate')} />
            </div>
            <div className="form-field">
              <label htmlFor="expiryDate">{t('batches.form.expiryDate')}</label>
              <input id="expiryDate" type="date" {...register('expiryDate')} />
            </div>
            <div className="form-field">
              <label htmlFor="barcode">{t('batches.form.barcode')}</label>
              <input id="barcode" {...register('barcode')} placeholder={t('batches.form.barcodePlaceholder')} />
            </div>
            <div className="form-field">
              <label htmlFor="packagingType">{t('batches.form.packagingType')}</label>
              <input id="packagingType" {...register('packagingType')} placeholder={t('batches.form.packagingTypePlaceholder')} />
            </div>
            <div className="form-field">
              <label htmlFor="minStock">{t('batches.form.minStock')}</label>
              <input
                id="minStock"
                type="number"
                step="0.01"
                min="0"
                {...register('minStock', { valueAsNumber: true, min: 0 })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t('batches.actions.save') : t('batches.actions.create')}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => { reset(); setShowForm(false); }}>
              {t('batches.actions.reset')}
            </button>
          </div>
        </form>
      )}

      <div className="filters">
        <input
          type="text"
          placeholder={t('batches.filters.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="status-filter"
        >
          <option value="ALL">{t('batches.filters.allStatuses')}</option>
          <option value="DRAFT">{t('batches.statuses.DRAFT')}</option>
          <option value="ACTIVE">{t('batches.filters.active')}</option>
          <option value="QUARANTINE">{t('batches.statuses.QUARANTINE')}</option>
          <option value="CERTIFIED">{t('batches.statuses.CERTIFIED')}</option>
          <option value="SHIPPED">{t('batches.filters.shipped')}</option>
          <option value="SCRAPPED">{t('batches.filters.scrapped')}</option>
        </select>
      </div>

      <div className="table-container">
        <table className="batches-table">
          <thead>
            <tr>
              <th>{t('batches.table.number')}</th>
              <th>{t('batches.table.type')}</th>
              <th>{t('batches.table.quantity')}</th>
              <th>{t('batches.table.barcode')}</th>
              <th>{t('batches.table.status')}</th>
              <th>{t('batches.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches.map((batch: any) => (
              <tr key={batch.id} className={`status-${String(batch.status || 'unknown').toLowerCase()}`}>
                <td>{batch.batchNumber}</td>
                <td>{batch.productType?.name || batch.productTypeName || '—'}</td>
                <td>{batch.quantity} {batch.unit}</td>
                <td>
                  {batch.barcode ? (
                    <div className="barcode-cell">
                      <BarcodeDisplay code={batch.barcode} />
                      <small>{batch.barcode}</small>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className={`status-badge status-${String(batch.status || 'unknown').toLowerCase()}`}>
                    {statusOptions.find((s) => s.value === batch.status)?.label || batch.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm" 
                  onClick={() => navigate(`/batches/${batch.id}`)}>{t('batches.actions.details')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBatches.length === 0 && (
          <div className="empty-state">{t('batches.table.empty')}</div>
        )}
      </div>
    </div>
  );
};


export default BatchesPage;
