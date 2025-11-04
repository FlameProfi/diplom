// src/pages/BatchesPage.tsx
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import BarcodeDisplay from '../../components/BarcodeDisplay/BarcodeDisplay'
import './BatchesPage.scss'

const BatchesPage = () => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const { data: batches = [], isLoading, error } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const res = await axios.get('/api/batches');
      return res.data;
    },
  });

  // Фильтрация
  const filteredBatches = batches.filter((batch: any) => {
    const matchesSearch =
      batch.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      (batch.barcode && batch.barcode.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === 'ALL' || batch.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) return <div className="loading">Загрузка партий...</div>;
  if (error) return <div className="error">Ошибка загрузки данных</div>;

  return (
    <div className="batches-page">
      <header className="page-header">
        <h1>Партии продукции</h1>
        <div className="stats">
          <span>Всего: {batches.length}</span>
          <span className="active">Активных: {batches.filter((b: any) => b.status === 'ACTIVE').length}</span>
        </div>
      </header>

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
          <option value="ACTIVE">Активные</option>
          <option value="QUARANTINE">Карантин</option>
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
              <tr key={batch.id} className={`status-${batch.status.toLowerCase()}`}>
                <td>{batch.batchNumber}</td>
                <td>{batch.productType?.name || '—'}</td>
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
                  <span className={`status-badge status-${batch.status.toLowerCase()}`}>
                    {getStatusText(batch.status)}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm">Подробно</button>
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