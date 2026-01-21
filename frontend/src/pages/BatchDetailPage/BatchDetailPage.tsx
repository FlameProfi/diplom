import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './BatchDetailPage.scss'
const BatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Запрос данных партии
  const { data: batch, isLoading, error, refetch } = useQuery({
    queryKey: ['batch', id],
    queryFn: async () => {
      const res = await axios.get(`/api/batches/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Мутирование статуса
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await axios.put(`/api/batches/${id}/status`, { status: newStatus });
      return res.data;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (error: any) => alert(error.response?.data?.message || 'Ошибка обновления статуса'),
  });

  // Мутирование загрузки документа
  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await axios.post(`/api/batches/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      refetch();
      setFile(null);
    },
    onError: (error: any) => alert(error.response?.data?.message || 'Ошибка загрузки файла'),
  });

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setSelectedStatus(newStatus);
    if (newStatus && newStatus !== batch?.status) {
      updateStatusMutation.mutate(newStatus);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    uploadDocumentMutation.mutate(formData);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Удалить документ?')) return;
    try {
      await axios.delete(`/api/batches/documents/${documentId}`);
      refetch();
    } catch (error) {
      alert('Ошибка удаления файла');
    }
  };

  if (isLoading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">Ошибка: {(error as any).message}</div>;
  if (!batch) return <div>Партия не найдена</div>;

  const statusOptions = ['DRAFT', 'QUARANTINE', 'CERTIFIED', 'ACTIVE', 'SHIPPED', 'SCRAPPED'];

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
    </div>
    <div className="info-item">
      <label>Тип продукта</label>
      <div className="value">{batch.productType?.name || batch.productTypeName || 'Не указан'}</div>
    </div>
    <div className="info-item">
      <label>Общее количество</label>
      <div className="value">{batch.quantity} {batch.unit}</div>
    </div>
    <div className="info-item status-item">
      <label>Статус</label>
      <div className="value">
        <span className={`status-badge ${batch.status.toLowerCase()}`}>
          {batch.status}
        </span>
        <select 
          value={selectedStatus || batch.status} 
          onChange={handleStatusChange} 
          className="status-select"
          disabled={updateStatusMutation.isPending}
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
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

        <section className="movements-section">
  <h2>Движения</h2>
  {batch.inventoryMovements?.length ? (
    <ul className="movements-list">
      {batch.inventoryMovements.slice(0, 10).map((movement) => (
        <li key={movement.id}>
          <div>
            <span className="movement-type">{movement.type}</span>
            <span className="movement-details">
              {movement.quantity} {batch.unit} - {new Date(movement.date).toLocaleString('ru-RU')}
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
            <th>Количество</th>
            <th>Зарезервировано</th>
          </tr>
        </thead>
        <tbody>
          {batch.stockItems.map((item) => (
            <tr key={item.id}>
              <td>{item.warehouse?.name || 'Неизвестный склад'}</td>
              <td className="quantity-cell">{item.quantity} {batch.unit}</td>
              <td className="quantity-cell">{item.reserved} {batch.unit}</td>
            </tr>
          ))}
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
      e.preventDefault();
      setFile(e.dataTransfer.files[0]);
    }}
    onDragOver={(e) => e.preventDefault()}
  >
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
    {file && <span>Выбран: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>}
  </div>
  
  {batch.documents?.length ? (
    <ul className="documents-list">
      {batch.documents.map((doc) => (
        <li key={doc.id} className="document-item">
          <div className="document-info">
            <a 
              href={doc.filePath} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="document-name"
            >
              {doc.fileName}
            </a>
            <div className="document-meta">
              <span className="file-size">
                {(doc.fileSize / 1024).toFixed(1)} KB
              </span>
              <span>{new Date(doc.uploadDate).toLocaleString('ru-RU')}</span>
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
  );
};

export default BatchDetailPage;
