// src/pages/BatchesPage.tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
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

const statusOptions = [
  { value: 'DRAFT', label: 'Черновик' },
  { value: 'QUARANTINE', label: 'Карантин' },
  { value: 'CERTIFIED', label: 'Сертифицирована' },
  { value: 'ACTIVE', label: 'Активна' },
  { value: 'SHIPPED', label: 'Отгружена' },
  { value: 'SCRAPPED', label: 'Списана' },
]

const BatchesPage = () => {
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
      alert(`Ошибка создания партии: ${error.response?.data?.message || error.message}`)
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

  if (isLoading) return <div className="loading">Загрузка партий...</div>;
  if (error) return <div className="error">Ошибка загрузки данных</div>;

  return (
    <div className="batches-page">
      <header className="page-header">
        <div>
          <h1>Партии продукции</h1>
          <p className="subtitle">Создавайте новые партии и отслеживайте их статус</p>
        </div>
        <div className="stats">
          <span>Всего: {batches.length}</span>
          <span className="active">Активных: {batches.filter((b: any) => b.status === 'ACTIVE').length}</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          disabled={createMutation.isPending}
        >
          {showForm ? 'Отмена' : 'Новая партия'}
        </button>
      </header>

      {showForm && (
        <form className="batch-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="batchNumber">Номер партии</label>
              <input id="batchNumber" {...register('batchNumber')} placeholder="BATCH-2024-001" />
              <span className="helper">Оставьте пустым для автогенерации</span>
            </div>
            <div className="form-field">
              <label htmlFor="productTypeId">Тип продукта</label>
              <select id="productTypeId" {...register('productTypeId', { required: true })}>
                <option value="">Выберите тип</option>
                {productTypes.map((type: any) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="quantity">Количество</label>
              <input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                {...register('quantity', { valueAsNumber: true, min: 0 })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="unit">Единица измерения</label>
              <input id="unit" {...register('unit', { required: true })} placeholder="кг, л, шт" />
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
              <label htmlFor="productionDate">Дата производства</label>
              <input id="productionDate" type="date" {...register('productionDate')} />
            </div>
            <div className="form-field">
              <label htmlFor="expiryDate">Срок годности</label>
              <input id="expiryDate" type="date" {...register('expiryDate')} />
            </div>
            <div className="form-field">
              <label htmlFor="barcode">Штрих-код</label>
              <input id="barcode" {...register('barcode')} placeholder="Сгенерируется автоматически" />
            </div>
            <div className="form-field">
              <label htmlFor="packagingType">Тип упаковки</label>
              <input id="packagingType" {...register('packagingType')} placeholder="Бочка, коробка, палета" />
            </div>
            <div className="form-field">
              <label htmlFor="minStock">Минимальный остаток</label>
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
              {createMutation.isPending ? 'Сохраняем...' : 'Создать партию'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => { reset(); setShowForm(false); }}>
              Сбросить
            </button>
          </div>
        </form>
      )}

      <div className="filters">
        <input
          type="text"
          placeholder="Поиск по номеру или баркоду..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="status-filter"
        >
          <option value="ALL">Все статусы</option>
          <option value="DRAFT">Черновик</option>
          <option value="ACTIVE">Активные</option>
          <option value="QUARANTINE">Карантин</option>
          <option value="CERTIFIED">Сертифицирована</option>
          <option value="SHIPPED">Отгружено</option>
          <option value="SCRAPPED">Списано</option>
        </select>
      </div>

      <div className="table-container">
        <table className="batches-table">
          <thead>
            <tr>
              <th>Номер</th>
              <th>Тип</th>
              <th>Кол-во</th>
              <th>Баркод</th>
              <th>Статус</th>
              <th>Действия</th>
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
                    {getStatusText(batch.status || '')}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm" 
                  onClick={() => navigate(`/batches/${batch.id}`)}>Подробно</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBatches.length === 0 && (
          <div className="empty-state">Партии не найдены</div>
        )}
      </div>
    </div>
  );
};

// Вспомогательная функция
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: 'Активна',
    QUARANTINE: 'Карантин',
    CERTIFIED: 'Сертифицирована',
    SHIPPED: 'Отгружена',
    SCRAPPED: 'Списана',
  };
  return map[status] || status;
};

export default BatchesPage;
