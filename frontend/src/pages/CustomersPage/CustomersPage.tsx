import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import './CustomersPage.scss'

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
  const [showForm, setShowForm] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', searchRegion],
    queryFn: async () => {
      const params = searchRegion ? { region: searchRegion } : {};
      const res = await axios.get('/api/customers', { params });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerForm) => axios.post('/api/customers', data),
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

  if (isLoading) return <div>Загрузка клиентов...</div>;

  return (
    <div className="customers-page">
      <header className="page-header">
        <h1>Клиенты</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Отмена' : 'Новый клиент'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="customer-form">
          <input {...register('name')} placeholder="Название клиента" required />
          <input {...register('email')} placeholder="Email" type="email" />
          <input {...register('phone')} placeholder="Телефон" />
          <input {...register('region')} placeholder="Регион" />
          <input {...register('country')} placeholder="Страна" />
          <input {...register('address')} placeholder="Адрес" />
          <input {...register('taxId')} placeholder="Налоговый ID" />
          <button type="submit" className="btn btn-success">Создать клиента</button>
        </form>
      )}

      <div className="filters mb-4">
        <input
          type="text"
          value={searchRegion}
          onChange={(e) => setSearchRegion(e.target.value)}
          placeholder="Поиск по региону..."
          className="search-input"
        />
      </div>

      <table className="customers-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Email</th>
            <th>Телефон</th>
            <th>Регион</th>
            <th>Страна</th>
            <th>Заказы</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer: any) => (
            <tr key={customer.id}>
              <td>{customer.name}</td>
              <td>{customer.email}</td>
              <td>{customer.phone}</td>
              <td>{customer.region}</td>
              <td>{customer.country}</td>
              <td>
                <Link to={`/orders?customerId=${customer.id}`} className="link">
                  {customer.orders?.length || 0} заказов
                </Link>
              </td>
              <td>
                <Link to={`/customers/${customer.id}`} className="btn btn-sm">Подробно</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {customers.length === 0 && <div>Клиенты не найдены</div>}
    </div>
  );
};

export default CustomersPage;