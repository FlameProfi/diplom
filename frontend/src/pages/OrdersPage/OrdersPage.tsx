import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'; // Added useFieldArray
import './OrdersPage.scss'

interface OrderItemForm {
  batchId: string;
  quantity: number;
  price: number;
}

interface CreateOrderForm {
  orderNumber: string;
  customerId: string;
  status?: 'NEW';  // Added optional status
  totalAmount?: number;  // Added for calculation
  expectedDelivery: string;
  orderItems: OrderItemForm[];
}

const OrdersPage = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const currentDate = new Date('2025-11-04').toISOString().split('T')[0];  // Hardcoded for now; use real date lib in prod

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await axios.get('/api/orders');
      return res.data;
    },
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await axios.get('/api/customers');  // Add endpoint in CustomersModule later
      return res.data;
    },
  });

  const { data: batches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const res = await axios.get('/api/batches');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateOrderForm) => axios.post('/api/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowForm(false);
      reset();  // Reset form after success
    },
    onError: (error: any) => {
      // Improved error handling (use toast lib in prod)
      console.error('Creation error:', error);
      alert(`Ошибка создания: ${error.response?.data?.message || error.message}`);
    },
  });

  const updateStatusMutation = useMutation({  // New: For updating status
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.patch(`/api/orders/${id}/status/${status}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => alert(`Ошибка обновления: ${error.message}`),
  });

  const { register, handleSubmit, reset, control, watch, setValue } = useForm<CreateOrderForm>({
    defaultValues: {
      orderNumber: '',
      customerId: '',
      status: 'NEW',
      expectedDelivery: currentDate,  // Default to today
      orderItems: [{ batchId: '', quantity: 1, price: 0 }],
    },
  });

  // New: Manage dynamic orderItems array
  const { fields, append } = useFieldArray({
    control,
    name: 'orderItems',
  });

  // Watch orderItems to calculate totalAmount dynamically
  const orderItems = watch('orderItems');
  const totalAmount = orderItems?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;
  setValue('totalAmount', totalAmount);  // Update form value

  // Validate expectedDelivery > current date
  const watchedDelivery = watch('expectedDelivery');
  const isValidDelivery = !watchedDelivery || new Date(watchedDelivery) >= new Date(currentDate);

  const filteredOrders = orders.filter((order: any) =>
    filterStatus === 'ALL' || order.status === filterStatus
  );

  const onSubmit = (data: CreateOrderForm) => {
    if (!isValidDelivery) {
      alert('Дата доставки должна быть не раньше сегодня');
      return;
    }
    createMutation.mutate(data);
  };

  if (ordersLoading || customersLoading || batchesLoading) return <div>Загрузка...</div>;

  return (
    <div className="orders-page">
      <header className="page-header">
        <h1>Заказы</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary" disabled={createMutation.isPending}>
          {showForm ? 'Отмена' : 'Новый заказ'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="order-form">
          <input {...register('orderNumber')} placeholder="Номер заказа (ORDER-XXX)" required />
          <select {...register('customerId')} required>
            <option value="">Выберите клиента</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select {...register('status')}>
            <option value="NEW">Новый</option>
            {/* Add more if needed */}
          </select>
          <input
            type="date"
            {...register('expectedDelivery', { min: currentDate })}
            min={currentDate}
          />
          {!isValidDelivery && <span className="error">Дата должна быть в будущем</span>}
          <div className="order-items">
            <h3>Позиции (Итого: {totalAmount} RUB)</h3>  {/* Dynamic total */}
            {fields.map((field, index) => (
              <div key={field.id} className="item-row">  {/* Use field.id for key */}
                <select {...register(`orderItems.${index}.batchId`)}>
                  <option value="">Выберите партию</option>
                  {batches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  {...register(`orderItems.${index}.quantity`, { min: 1, valueAsNumber: true })}
                  placeholder="Кол-во"
                />
                <input
                  type="number"
                  {...register(`orderItems.${index}.price`, { min: 0, valueAsNumber: true })}
                  placeholder="Цена за ед."
                  step="0.01"
                />
                <button
                  type="button"
                  onClick={() => {
                    // Remove item (simple, remove last or specific)
                    const newItems = [...orderItems];
                    newItems.splice(index, 1);
                    setValue('orderItems', newItems);
                  }}
                >
                  Удалить
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => append({ batchId: '', quantity: 1, price: 0 })}  // Fixed: Use append
            >
              + Добавить позицию
            </button>
          </div>
          <button type="submit" className="btn btn-success" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Создаётся...' : 'Создать заказ'}
          </button>
        </form>
      )}

      <div className="filters mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="ALL">Все статусы</option>
          <option value="NEW">Новый</option>
          <option value="IN_PRODUCTION">В производстве</option>
          <option value="PACKED">Упакован</option>
          <option value="READY_FOR_SHIPMENT">Готов к отгрузке</option>
          <option value="SHIPPED">Отгружен</option>
          <option value="DELIVERED">Доставлен</option>
          <option value="CANCELLED">Отменён</option>
        </select>
      </div>

      <table className="orders-table">
        <thead>
          <tr>
            <th>Номер</th>
            <th>Клиент</th>
            <th>Статус</th>
            <th>Позиции</th>
            <th>Сумма</th>
            <th>Дата</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order: any) => (
            <tr key={order.id}>
              <td>{order.orderNumber}</td>
              <td>{order.customer?.name || 'N/A'}</td>
              <td>
                <span className={`status-${order.status.toLowerCase()}`}>{order.status}</span>
              </td>
              <td>
                {order.orderItems
                  ?.map((oi: any) => `${oi.quantity} x ${oi.batch?.batchNumber}`)
                  .join(', ') || 'N/A'}
              </td>
              <td>{order.totalAmount || 0} RUB</td>  {/* Fallback to 0 */}
              <td>{new Date(order.createdAt).toLocaleDateString('ru-RU')}</td>
              <td>
                {/* New: Status update dropdown */}
                <select
                  defaultValue={order.status}
                  onChange={(e) => {
                    if (e.target.value !== order.status) {
                      updateStatusMutation.mutate({ id: order.id, status: e.target.value });
                    }
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  <option value="NEW">Новый</option>
                  <option value="IN_PRODUCTION">В производстве</option>
                  <option value="PACKED">Упакован</option>
                  <option value="READY_FOR_SHIPMENT">Готов к отгрузке</option>
                  <option value="SHIPPED">Отгружен</option>
                  <option value="DELIVERED">Доставлен</option>
                  <option value="CANCELLED">Отменён</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredOrders.length === 0 && <div>Заказы не найдены</div>}
    </div>
  );
};

export default OrdersPage;