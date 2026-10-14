import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export interface Order {
  id: string;
  order_number: string;
  status: 'en_attente' | 'accepté' | 'annulée';
  full_name: string;
  email: string;
  phone: string;
  phone2?: string | null;
  address: string;
  city: string;
  subtotal: number;
  total: number;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  invoice_id: string | null;
  delivery_note_id: string | null;
  latitude?: number;
  longitude?: number;
  user?: {
    id: string;
    email: string;
    profile?: {
      account_type: string;
    }
  };
  quote_id: string | null;
  notes?: string | null;
  bl_contact?: string | null;
  requires_special_discount?: boolean;
  has_payment_proof?: boolean;
}

export interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  size_label: string;
  unit_price: number;
  quantity: number;
  total: number;
  parameters?: Record<string, unknown> | null;
}

export interface OrdersPagination {
  data: Order[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

interface UseOrdersOptions {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
  raw?: boolean;
  adminEndpoint?: boolean; // Si true, utilise /admin/orders au lieu de /orders
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { page, perPage, status, search, raw, adminEndpoint } = options;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<OrdersPagination | null>(null);
  const optionsRef = useRef(options);
  const latestRequestRef = useRef(0);

  useEffect(() => {
    optionsRef.current = { page, perPage, status, search, raw, adminEndpoint };
  }, [page, perPage, status, search, raw, adminEndpoint]);

  const fetchOrders = useCallback(async (opts: UseOrdersOptions = {}) => {
    const finalOpts = { ...optionsRef.current, ...opts };
    const requestId = ++latestRequestRef.current;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (finalOpts.page) params.append('page', finalOpts.page.toString());
      if (finalOpts.perPage) params.append('per_page', finalOpts.perPage.toString());
      if (finalOpts.status) params.append('status', finalOpts.status);
      if (finalOpts.search?.trim()) params.append('search', finalOpts.search.trim());
      if (finalOpts.raw) params.append('_raw', '1');
      params.append('t', Date.now().toString());

      const baseEndpoint = finalOpts.adminEndpoint ? '/admin/orders' : '/orders';
      const endpoint = `${baseEndpoint}?${params.toString()}`;
      const response = await api.get<Order[] | OrdersPagination>(endpoint);

      if (requestId !== latestRequestRef.current) return;

      const ordersList = Array.isArray(response) ? response : response.data;
      setOrders(ordersList);
      setPagination(Array.isArray(response) ? null : response);
      setError(null);
    } catch (err: unknown) {
      if (requestId !== latestRequestRef.current) return;
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors du chargement des commandes';
      setError(errorMsg);
      console.error('Error fetching orders:', err);
    } finally {
      if (requestId === latestRequestRef.current) setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    try {
      const response = await api.put(`/orders/${orderId}`, { status });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: status as Order['status'], updated_at: new Date().toISOString() }
            : o
        )
      );
      return response;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      await api.delete(`/orders/${orderId}`);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      setError(errorMsg);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, page, perPage, status, search, raw, adminEndpoint]);

  return {
    orders,
    loading,
    error,
    pagination,
    fetchOrders,
    updateOrderStatus,
    deleteOrder,
  };
}

export function useOrderDetail(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetail = useCallback(async () => {
    try {
      setLoading(true);
      const timestamp = Date.now();
      const [orderData, itemsData] = await Promise.all([
        api.get<Order>(`/orders/${orderId}?t=${timestamp}`),
        api.get<OrderItem[]>(`/orders/${orderId}/items?t=${timestamp}`),
      ]);

      setOrder(orderData);
      setItems(itemsData || []);
      setError(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(errorMsg);
      console.error('Error fetching order detail:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail();
    }
  }, [orderId, fetchOrderDetail]);

  return { order, items, loading, error, refresh: fetchOrderDetail };
}
