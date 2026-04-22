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
}

export interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  size_label: string;
  unit_price: number;
  quantity: number;
  total: number;
}

interface UseOrdersOptions {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
  adminEndpoint?: boolean; // Si true, utilise /admin/orders au lieu de /orders
}

export function useOrders(options: UseOrdersOptions = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const optionsRef = useRef(options); // Utiliser une ref pour éviter de recréer fetchOrders

  // Mettre à jour la ref quand options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const fetchOrders = useCallback(async (opts: UseOrdersOptions = {}) => {
    const finalOpts = { ...optionsRef.current, ...opts };

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (finalOpts.page) params.append('page', finalOpts.page.toString());
      if (finalOpts.perPage) params.append('per_page', finalOpts.perPage.toString());
      if (finalOpts.status) params.append('status', finalOpts.status);
      params.append('t', Date.now().toString());

      // Déterminer l'endpoint à utiliser
      const baseEndpoint = finalOpts.adminEndpoint ? '/admin/orders' : '/orders';
      const endpoint = `${baseEndpoint}?${params.toString()}`;
      const response = await api.get<any>(endpoint);

      // Handle pagination response
      const orderData = response.data || response;
      const ordersList = Array.isArray(orderData) ? orderData : (orderData.data || []);

      setOrders(ordersList);
      setPagination(response.meta || response);
      setError(null);
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors du chargement des commandes';
      setError(errorMsg);
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []); // Pas de dépendance - on utilise une ref à la place

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
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la mise à jour';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      await api.delete(`/orders/${orderId}`);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la suppression';
      setError(errorMsg);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

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
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors du chargement';
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
