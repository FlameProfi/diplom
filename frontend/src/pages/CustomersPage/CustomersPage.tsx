import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation();
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
    onError: (error) => alert(t('customers.errors.create', { message: error.message })),
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

  if (isLoading) return <div>{t('customers.loading')}</div>;
  if (error) return <div>{t('customers.errors.loading')}</div>;

  return (
    <div className="customers-page">
      <header className="page-header">
        <h1>{t('customers.title')}</h1>
        <div className="stats">
          <span>{t('customers.stats.total', { count: customers.length })}</span>
          <span>{t('customers.stats.regions', { count: new Set(customers.map((customer) => customer.region).filter(Boolean)).size })}</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          disabled={createMutation.isPending}
        >
          {showForm ? t('customers.actions.cancel') : t('customers.actions.new')}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="customer-form">
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="customer-name">{t('customers.form.name')}</label>
              <input id="customer-name" {...register('name')} placeholder={t('customers.form.namePlaceholder')} required />
            </div>
            <div className="form-field">
              <label htmlFor="customer-email">Email</label>
              <input id="customer-email" {...register('email')} placeholder="mail@example.com" type="email" />
            </div>
            <div className="form-field">
              <label htmlFor="customer-phone">{t('customers.form.phone')}</label>
              <input id="customer-phone" {...register('phone')} placeholder="+7 (999) 000-00-00" />
            </div>
            <div className="form-field">
              <label htmlFor="customer-region">{t('customers.form.region')}</label>
              <input id="customer-region" {...register('region')} placeholder={t('customers.form.regionPlaceholder')} />
            </div>
            <div className="form-field">
              <label htmlFor="customer-country">{t('customers.form.country')}</label>
              <input id="customer-country" {...register('country')} placeholder={t('customers.form.countryPlaceholder')} />
            </div>
            <div className="form-field full">
              <label htmlFor="customer-address">{t('customers.form.address')}</label>
              <input id="customer-address" {...register('address')} placeholder={t('customers.form.addressPlaceholder')} />
            </div>
            <div className="form-field">
              <label htmlFor="customer-tax">{t('customers.form.taxId')}</label>
              <input id="customer-tax" {...register('taxId')} placeholder={t('customers.form.taxIdPlaceholder')} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-success" disabled={createMutation.isPending}>
              {createMutation.isPending ? t('customers.actions.creating') : t('customers.actions.create')}
            </button>
          </div>
        </form>
      )}

      <div className="filters mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('customers.filters.searchPlaceholder')}
          className="search-input"
        />
        <input
          type="text"
          value={searchRegion}
          onChange={(e) => setSearchRegion(e.target.value)}
          placeholder={t('customers.filters.regionPlaceholder')}
          className="search-input"
        />
      </div>

      <div className="table-container">
        <table className="customers-table">
          <thead>
            <tr>
              <th>{t('customers.table.name')}</th>
              <th>Email</th>
              <th>{t('customers.table.phone')}</th>
              <th>{t('customers.table.region')}</th>
              <th>{t('customers.table.country')}</th>
              <th>{t('customers.table.address')}</th>
              <th>{t('customers.table.taxId')}</th>
              <th>{t('customers.table.created')}</th>
              <th>{t('customers.table.orders')}</th>
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
                <td>{new Date(customer.createdAt).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}</td>
                <td>
                  <Link to={`/orders?customerId=${customer.id}`} className="link">
                    {t('customers.table.ordersCount', { count: customer.ordersCount ?? 0 })}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCustomers.length === 0 && <div className="empty-state">{t('customers.table.empty')}</div>}
      </div>
    </div>
  );
};

export default CustomersPage;
