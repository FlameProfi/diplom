import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './CustomersPage.scss'

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  region?: string;
  country?: string;
  address?: string;
  taxId?: string;
  createdAt: string;
  ordersCount?: number;
}

interface CreateCustomerForm {
  name: string;
  email: string;
  phone: string;
  region: string;
  country: string;
  address: string;
  taxId: string;
}

const CustomersPage = () => {
  const queryClient = useQueryClient();
  const [searchRegion, setSearchRegion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: customers = [], isLoading, error } = useQuery<Customer[]>({
    queryKey: ['customers', searchRegion],
    queryFn: async () => {
      const params = searchRegion ? { region: searchRegion } : {};
      const res = await api.get('/customers', { params });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerForm) => api.post('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
    },
    onError: (error) => alert('Ошибка создания: ' + error.message),
  });

  const { register, handleSubmit, reset } = useForm<CreateCustomerForm>();

  const onSubmit = (data: CreateCustomerForm) => {
    createMutation.mutate(data);
    reset();
  };

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.email,
        customer.phone,
        customer.region,
        customer.country,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [customers, searchTerm]);

  if (isLoading) return <div>Загрузка клиентов...</div>;
  if (error) return <div>Ошибка загрузки клиентов</div>;

  return (
    <div className="customers-page">
      <header className="page-header">
        <h1>Клиенты</h1>
        <div className="stats">
          <span>Всего: {customers.length}</span>
          <span>Регионов: {new Set(customers.map((customer) => customer.region).filter(Boolean)).size}</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          disabled={createMutation.isPending}
        >
          {showForm ? 'Отмена' : 'Новый клиент'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="customer-form">
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="customer-name">Название клиента</label>
              <input id="customer-name" {...register('name')} placeholder="ООО МеталлПром" required />
            </div>
            <div className="form-field">
              <label htmlFor="customer-email">Email</label>
              <input id="customer-email" {...register('email')} placeholder="mail@example.com" type="email" />
            </div>
            <div className="form-field">
              <label htmlFor="customer-phone">Телефон</label>
              <input id="customer-phone" {...register('phone')} placeholder="+7 (999) 000-00-00" />
            </div>
            <div className="form-field">
              <label htmlFor="customer-region">Регион</label>
              <input id="customer-region" {...register('region')} placeholder="Московская область" />
            </div>
            <div className="form-field">
              <label htmlFor="customer-country">Страна</label>
              <input id="customer-country" {...register('country')} placeholder="Россия" />
            </div>
            <div className="form-field full">
              <label htmlFor="customer-address">Адрес</label>
              <input id="customer-address" {...register('address')} placeholder="Адрес доставки или офиса" />
            </div>
            <div className="form-field">
              <label htmlFor="customer-tax">Налоговый ID</label>
              <input id="customer-tax" {...register('taxId')} placeholder="ИНН/КПП" />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-success" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создаётся...' : 'Создать клиента'}
            </button>
          </div>
        </form>
      )}

      <div className="filters mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Поиск по названию, email или телефону..."
          className="search-input"
        />
        <input
          type="text"
          value={searchRegion}
          onChange={(e) => setSearchRegion(e.target.value)}
          placeholder="Фильтр по региону (сервер)"
          className="search-input"
        />
      </div>

      <div className="table-container">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Регион</th>
              <th>Страна</th>
              <th>Адрес</th>
              <th>Налоговый ID</th>
              <th>Создан</th>
              <th>Заказы</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td>{customer.email || '—'}</td>
                <td>{customer.phone || '—'}</td>
                <td>{customer.region || '—'}</td>
                <td>{customer.country || '—'}</td>
                <td>{customer.address || '—'}</td>
                <td>{customer.taxId || '—'}</td>
                <td>{new Date(customer.createdAt).toLocaleDateString('ru-RU')}</td>
                <td>
                  <Link to={`/orders?customerId=${customer.id}`} className="link">
                    {customer.ordersCount ?? 0} заказов
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCustomers.length === 0 && <div className="empty-state">Клиенты не найдены</div>}
      </div>
    </div>
  );
};

export default CustomersPage;
