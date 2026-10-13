import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/apiClient";
import type {
  DashboardClient,
  DashboardData,
  DashboardDeliveryNote,
  DashboardOrder,
  DashboardProduct,
  DashboardRange,
  SeriesPoint,
  Trend,
} from "@/components/admin/dashboard/types";

const emptyTrend: Trend = { value: 0, positive: true };
const emptyDashboard: DashboardData = {
  loading: true,
  error: null,
  hasData: false,
  totals: {
    revenue: 0, orders: 0, pendingPayments: 0, delivered: 0, cancelled: 0,
    processing: 0, pending: 0, clients: 0, newClients: 0, returningClients: 0,
    averageRating: null, reviewCount: null, overallAverageRating: null, overallReviewCount: null, averageBasket: 0,
  },
  trends: {
    revenue: emptyTrend, orders: emptyTrend, pendingPayments: emptyTrend,
    delivered: emptyTrend, cancelled: emptyTrend, clients: emptyTrend, newClients: emptyTrend,
    averageBasket: emptyTrend,
  },
  series: [],
  topProducts: [],
  regions: [],
  ranges: [],
};

function unwrapList<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (!response || typeof response !== "object") return [];
  const value = response as { data?: unknown; orders?: unknown; reviews?: unknown };
  if (Array.isArray(value.data)) return value.data as T[];
  if (value.data && typeof value.data === "object" && Array.isArray((value.data as { data?: unknown }).data)) {
    return (value.data as { data: T[] }).data;
  }
  if (Array.isArray(value.orders)) return value.orders as T[];
  if (Array.isArray(value.reviews)) return value.reviews as T[];
  return [];
}

function numeric(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKey(value?: string): string | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

function isInRange(value: string | undefined, start: string, end: string): boolean {
  const key = dateKey(value);
  return Boolean(key && key >= start && key <= end);
}

function statusIs(value: string | undefined, expected: string): boolean {
  return (value || "").trim().toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "") === expected;
}

function latestDeliveryNotes(notes: DashboardDeliveryNote[]): Map<string, DashboardDeliveryNote> {
  const result = new Map<string, DashboardDeliveryNote>();
  notes.forEach((note) => {
    if (note.order_id === undefined || note.order_id === null) return;
    const key = String(note.order_id);
    const existing = result.get(key);
    if (!existing || (note.created_at && (!existing.created_at || note.created_at > existing.created_at))) {
      result.set(key, note);
    }
  });
  return result;
}

function hasDeliveryStatus(
  order: DashboardOrder,
  notesByOrder: Map<string, DashboardDeliveryNote>,
  status: string,
): boolean {
  return statusIs(notesByOrder.get(String(order.id))?.status, status);
}

function makeTrend(current: number, previous: number): Trend {
  if (previous === 0) return { value: current === 0 ? 0 : 100, positive: current >= previous };
  return { value: Math.abs(((current - previous) / previous) * 100), positive: current >= previous };
}

function daysBetween(start: string, end: string): number {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  return Math.floor((
    Date.UTC(endYear, endMonth - 1, endDay) - Date.UTC(startYear, startMonth - 1, startDay)
  ) / 86400000);
}

function toMetricOrders(orders: DashboardOrder[], notesByOrder: Map<string, DashboardDeliveryNote>) {
  const deliveredOrders = orders.filter((order) => hasDeliveryStatus(order, notesByOrder, "livree"));
  const cancelledOrders = orders.filter((order) =>
    statusIs(order.status, "annulee") || hasDeliveryStatus(order, notesByOrder, "annulee"),
  );
  const processingOrders = orders.filter((order) => {
    return statusIs(order.status, "accepte")
      && !hasDeliveryStatus(order, notesByOrder, "livree")
      && !hasDeliveryStatus(order, notesByOrder, "annulee");
  });
  const pendingOrders = orders.filter((order) =>
    statusIs(order.status, "en_attente") && !cancelledOrders.includes(order) && !deliveredOrders.includes(order),
  );
  const pendingPayments = orders.filter((order) => {
    const orderHasNotes = notesByOrder.has(String(order.id));
    return statusIs(order.status, "accepte")
      && orderHasNotes
      && !hasDeliveryStatus(order, notesByOrder, "livree")
      && !hasDeliveryStatus(order, notesByOrder, "annulee");
  }).reduce((sum, order) => sum + numeric(order.total), 0);

  return {
    deliveredOrders,
    cancelledOrders,
    processingOrders,
    pendingOrders,
    pendingPayments,
    revenue: deliveredOrders.reduce((sum, order) => sum + numeric(order.total), 0),
  };
}

function makeSeries(
  range: DashboardRange,
  orders: DashboardOrder[],
  notesByOrder: Map<string, DashboardDeliveryNote>,
  clients: DashboardClient[],
): SeriesPoint[] {
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  const count = Math.max(1, daysBetween(range.start, range.end) + 1);
  const map = new Map<string, SeriesPoint>();

  for (let i = 0; i < count; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = localDateKey(day);
    const dateLabel = day.toLocaleDateString("fr-TN", { day: "2-digit", month: "short" });
    map.set(key, { label: dateLabel, fullDate: key, revenue: 0, orders: 0, newClients: 0, averageBasket: 0 });
  }

  orders.forEach((order) => {
    if (!isInRange(order.created_at, range.start, range.end)) return;
    const key = dateKey(order.created_at);
    if (!key) return;
    const point = map.get(key);
    if (!point) return;
    point.orders += 1;
    if (hasDeliveryStatus(order, notesByOrder, "livree")) point.revenue += numeric(order.total);
  });

  clients.forEach((client) => {
    if (!isInRange(client.created_at, range.start, range.end)) return;
    const key = dateKey(client.created_at);
    if (!key) return;
    const point = map.get(key);
    if (point) point.newClients += 1;
  });

  return Array.from(map.values());
}

export function useDashboardData(range: DashboardRange): DashboardData {
  const [data, setData] = useState<DashboardData>(emptyDashboard);
  const firstLoad = useRef(true);
  const requestId = useRef(0);
  const productsCache = useRef<Map<string, DashboardProduct> | null>(null);
  const productsRequest = useRef<Promise<Map<string, DashboardProduct>> | null>(null);
  const loadRef = useRef<() => Promise<void>>(async () => undefined);
  const rangeStart = range.start;
  const rangeEnd = range.end;

  loadRef.current = async () => {
    const currentRequest = ++requestId.current;
    const showInitialLoading = firstLoad.current;
    try {
      if (showInitialLoading) setData((previous) => ({ ...previous, loading: true, error: null }));
      const timestamp = Date.now();
      const [notesResponse, clientsResponse, ordersResponse, reviewsResponse] = await Promise.all([
        api.get<unknown>(`/delivery-notes?per_page=1000&t=${timestamp}`),
        api.get<unknown>(`/clients?per_page=1000&t=${timestamp}`),
        api.get<unknown>(`/orders?per_page=1000&t=${timestamp}`),
        api.get<unknown>(`/published-reviews?start_date=${encodeURIComponent(rangeStart)}&end_date=${encodeURIComponent(rangeEnd)}&t=${timestamp}`),
      ]);
      if (currentRequest !== requestId.current) return;

      const orders = unwrapList<DashboardOrder>(ordersResponse);
      const notes = unwrapList<DashboardDeliveryNote>(notesResponse);
      const notesByOrder = latestDeliveryNotes(notes);
      const clients = unwrapList<DashboardClient>(clientsResponse);
      if (!productsCache.current) {
        if (!productsRequest.current) {
          productsRequest.current = api.get<unknown>(`/products?per_page=1000&t=${timestamp}`)
            .then((response) => new Map(unwrapList<DashboardProduct>(response).map((product) => [String(product.id), product])))
            .catch((error: unknown) => {
              productsRequest.current = null;
              throw error;
            });
        }
        productsCache.current = await productsRequest.current;
      }
      const productsById = productsCache.current;
      if (currentRequest !== requestId.current) return;
      const currentOrders = orders.filter((order) => isInRange(order.created_at, rangeStart, rangeEnd));
      const clientIdByUserId = new Map(
        clients
          .filter((client) => client.id !== null && client.id !== undefined && client.user_id !== null && client.user_id !== undefined)
          .map((client) => [String(client.user_id), String(client.id)]),
      );
      const orderCustomerId = (order: DashboardOrder) => {
        if (order.client_id !== null && order.client_id !== undefined) return String(order.client_id);
        if (order.user_id !== null && order.user_id !== undefined) {
          const userId = String(order.user_id);
          return clientIdByUserId.get(userId) || userId;
        }
        return null;
      };
      const previousEnd = new Date(`${rangeStart}T00:00:00`);
      previousEnd.setDate(previousEnd.getDate() - 1);
      const rangeLength = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1);
      const previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - rangeLength + 1);
      const previousStartKey = localDateKey(previousStart);
      const previousEndKey = localDateKey(previousEnd);
      const previousOrders = orders.filter((order) => isInRange(order.created_at, previousStartKey, previousEndKey));
      const currentMetrics = toMetricOrders(currentOrders, notesByOrder);
      const previousMetrics = toMetricOrders(previousOrders, notesByOrder);
      const currentClients = clients.filter((client) => isInRange(client.created_at, rangeStart, rangeEnd));
      const previousClients = clients.filter((client) => isInRange(client.created_at, previousStartKey, previousEndKey));
      const currentSeries = makeSeries(range, currentOrders, notesByOrder, clients);

      const customerOrders = new Map<string, number>();
      orders.forEach((order) => {
        const customerId = orderCustomerId(order);
        if (customerId) customerOrders.set(customerId, (customerOrders.get(customerId) || 0) + 1);
      });
      const currentCustomerIds = new Set<string>();
      currentOrders.forEach((order) => {
        const customerId = orderCustomerId(order);
        if (customerId) currentCustomerIds.add(customerId);
      });
      currentClients.forEach((client) => {
        const customerId = client.id ?? client.user_id;
        if (customerId !== null && customerId !== undefined) currentCustomerIds.add(String(customerId));
      });
      const previousCustomerIds = new Set<string>();
      previousOrders.forEach((order) => {
        const customerId = orderCustomerId(order);
        if (customerId) previousCustomerIds.add(customerId);
      });
      previousClients.forEach((client) => {
        const customerId = client.id ?? client.user_id;
        if (customerId !== null && customerId !== undefined) previousCustomerIds.add(String(customerId));
      });
      const returningClients = Array.from(currentCustomerIds).filter((id) => (customerOrders.get(id) || 0) > 1).length;
      const deliveredTotal = currentMetrics.deliveredOrders.reduce((sum, order) => sum + numeric(order.total), 0);
      const averageBasket = currentMetrics.deliveredOrders.length ? deliveredTotal / currentMetrics.deliveredOrders.length : 0;
      const previousDeliveredTotal = previousMetrics.deliveredOrders.reduce((sum, order) => sum + numeric(order.total), 0);
      const previousBasket = previousMetrics.deliveredOrders.length ? previousDeliveredTotal / previousMetrics.deliveredOrders.length : 0;

      const productMap = new Map<string, {
        name: string;
        image: string | null;
        size: string;
        sales: number;
        revenue: number;
        totalUnits: number;
        cancelledUnits: number;
        explicitRateTotal: number;
        explicitRateUnits: number;
      }>();
      const regionMap = new Map<string, { name: string; count: number; cancelledCount: number }>();
      const rangeMap = new Map<string, { revenue: number; image: string | null }>();
      currentOrders.forEach((order) => {
        const isCancelled = statusIs(order.status, "annulee") || hasDeliveryStatus(order, notesByOrder, "annulee");
        const city = order.city?.trim().replace(/\s+/g, " ") || "Ville non renseignée";
        const cityKey = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
        const cityStats = regionMap.get(cityKey) || { name: city, count: 0, cancelledCount: 0 };
        cityStats.count += 1;
        if (isCancelled) cityStats.cancelledCount += 1;
        regionMap.set(cityKey, cityStats);
        (order.items || []).forEach((item) => {
          const name = item.product_name?.trim();
          if (!name) return;
          const product = item.product_id ? productsById.get(String(item.product_id)) : undefined;
          const key = `${item.product_id || name}|${item.size_label || ""}`;
          const sales = Math.max(0, numeric(item.quantity) || 1);
          const current = productMap.get(key) || {
            name: product?.name || name,
            image: item.product_image || item.product?.image || product?.image || null,
            size: item.size_label || "",
            sales: 0,
            revenue: 0,
            totalUnits: 0,
            cancelledUnits: 0,
            explicitRateTotal: 0,
            explicitRateUnits: 0,
          };
          current.totalUnits += sales;
          current.cancelledUnits += isCancelled
            ? sales
            : Math.min(sales, numeric(item.cancelled_quantity));
          current.sales += isCancelled ? 0 : sales;
          if (item.cancellation_rate !== undefined && item.cancellation_rate !== null) {
            current.explicitRateTotal += numeric(item.cancellation_rate) * sales;
            current.explicitRateUnits += sales;
          }
          if (hasDeliveryStatus(order, notesByOrder, "livree")) {
            current.revenue += numeric(item.total) || numeric(item.unit_price) * sales;
          }
          productMap.set(key, current);
          const productRange = (item.range || item.product_range || item.product?.range || product?.gamme)?.trim();
          if (productRange) {
            const rangeValue = rangeMap.get(productRange) || {
              revenue: 0,
              image: item.product_image || item.product?.image || product?.image || null,
            };
            if (hasDeliveryStatus(order, notesByOrder, "livree")) {
              rangeValue.revenue += numeric(item.total) || numeric(item.unit_price) * sales;
            }
            rangeMap.set(productRange, rangeValue);
          }
        });
      });

      const rawReviews = reviewsResponse as {
        average?: unknown;
        count?: unknown;
        overall_average?: unknown;
        overall_count?: unknown;
      };
      const averageValue = rawReviews?.average;
      const averageRating = averageValue === null || averageValue === undefined ? null : numeric(averageValue);
      const overallAverageValue = rawReviews?.overall_average;
      const overallAverageRating = overallAverageValue === null || overallAverageValue === undefined
        ? averageRating
        : numeric(overallAverageValue);
      const reviewCountValue = rawReviews?.count;
      const reviewCount = reviewCountValue === undefined || reviewCountValue === null
        ? null
        : numeric(reviewCountValue);
      const overallCountValue = rawReviews?.overall_count;
      const overallReviewCount = overallCountValue === undefined || overallCountValue === null
        ? null
        : numeric(overallCountValue);

      const currentNewClients = currentClients.length;
      const totalClients = currentCustomerIds.size || currentClients.length;
      const previousNewClients = previousClients.length;
      const currentRevenueOrders = currentMetrics.deliveredOrders;
      const basketTotals = new Map<string, { amount: number; count: number }>();
      currentRevenueOrders.forEach((order) => {
        const key = dateKey(order.created_at);
        if (!key) return;
        const basket = basketTotals.get(key) || { amount: 0, count: 0 };
        basket.amount += numeric(order.total);
        basket.count += 1;
        basketTotals.set(key, basket);
      });
      currentSeries.forEach((point) => {
        const basket = basketTotals.get(point.fullDate);
        point.averageBasket = basket?.count ? basket.amount / basket.count : 0;
      });

      const totalOrders = currentOrders.length;
      setData({
        loading: false,
        error: null,
        hasData: orders.length > 0 || clients.length > 0 || overallReviewCount !== null && overallReviewCount > 0,
        totals: {
          revenue: currentMetrics.revenue,
          orders: totalOrders,
          pendingPayments: currentMetrics.pendingPayments,
          delivered: currentMetrics.deliveredOrders.length,
          cancelled: currentMetrics.cancelledOrders.length,
          processing: currentMetrics.processingOrders.length,
          pending: currentMetrics.pendingOrders.length,
          clients: totalClients,
          newClients: currentNewClients,
          returningClients,
          averageRating,
          reviewCount,
          overallAverageRating,
          overallReviewCount,
          averageBasket,
        },
        trends: {
          revenue: makeTrend(currentMetrics.revenue, previousMetrics.revenue),
          orders: makeTrend(totalOrders, previousOrders.length),
          pendingPayments: makeTrend(currentMetrics.pendingPayments, previousMetrics.pendingPayments),
          delivered: makeTrend(currentMetrics.deliveredOrders.length, previousMetrics.deliveredOrders.length),
          cancelled: makeTrend(currentMetrics.cancelledOrders.length, previousMetrics.cancelledOrders.length),
          clients: makeTrend(totalClients, previousCustomerIds.size || previousClients.length),
          newClients: makeTrend(currentNewClients, previousNewClients),
          averageBasket: makeTrend(averageBasket, previousBasket),
        },
        series: currentSeries,
        topProducts: Array.from(productMap.values())
          .map(({ totalUnits, cancelledUnits, explicitRateTotal, explicitRateUnits, ...product }) => ({
            ...product,
            cancellationRate: explicitRateUnits > 0
              ? explicitRateTotal / explicitRateUnits
              : totalUnits > 0
                ? (cancelledUnits / totalUnits) * 100
                : 0,
          }))
          .sort((a, b) => b.sales - a.sales),
        regions: Array.from(regionMap.values()).sort((a, b) => b.count - a.count),
        ranges: Array.from(rangeMap, ([name, value]) => ({ name, ...value })).sort((a, b) => b.revenue - a.revenue),
      });
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      const message = error instanceof Error ? error.message : "Erreur lors du chargement des statistiques.";
      console.error("Dashboard load error:", error);
      setData((previous) => ({ ...previous, loading: false, error: message }));
    } finally {
      firstLoad.current = false;
    }
  };

  const load = useCallback(() => loadRef.current(), []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); }, 10_000);
    return () => window.clearInterval(timer);
  }, [load, rangeStart, rangeEnd]);

  return data;
}
