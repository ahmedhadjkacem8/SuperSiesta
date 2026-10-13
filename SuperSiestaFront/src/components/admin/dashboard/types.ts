export interface DateRange {
  start: string;
  end: string;
}

export type DashboardRange = DateRange & {
  preset: "today" | "7days" | "30days" | "3months" | "1year" | "custom";
};

export interface Trend {
  value: number;
  positive: boolean;
}

export interface DashboardOrder {
  id: string | number;
  client_id?: string | number | null;
  total?: number | string;
  status?: string;
  created_at?: string;
  city?: string;
  user_id?: string | number | null;
  source?: string;
  governorate?: string;
  region?: string;
  items?: DashboardOrderItem[];
}

export interface DashboardOrderItem {
  product_id?: string | number | null;
  product_name?: string;
  product_image?: string | null;
  product?: {
    range?: string;
    image?: string | null;
  } | null;
  size_label?: string;
  quantity?: number | string;
  unit_price?: number | string;
  total?: number | string;
  range?: string;
  product_range?: string;
  cancellation_rate?: number | string;
  cancelled_quantity?: number | string;
}

export interface DashboardDeliveryNote {
  id: string | number;
  order_id?: string | number;
  status?: string;
  created_at?: string;
}

export interface DashboardClient {
  id?: string | number;
  user_id?: string | number | null;
  created_at?: string;
}

export interface DashboardProduct {
  id: string | number;
  name?: string;
  image?: string | null;
  gamme?: string | null;
}

export interface DashboardReview {
  rating?: number | string;
  created_at?: string;
}

export interface SeriesPoint {
  label: string;
  fullDate: string;
  revenue: number;
  orders: number;
  newClients: number;
  averageBasket: number;
}

export interface DashboardData {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  totals: {
    revenue: number;
    orders: number;
    pendingPayments: number;
    delivered: number;
    cancelled: number;
    processing: number;
    pending: number;
    clients: number;
    newClients: number;
    returningClients: number;
    averageRating: number | null;
    reviewCount: number | null;
    overallAverageRating: number | null;
    overallReviewCount: number | null;
    averageBasket: number;
  };
  trends: {
    revenue: Trend;
    orders: Trend;
    pendingPayments: Trend;
    delivered: Trend;
    cancelled: Trend;
    clients: Trend;
    newClients: Trend;
    averageBasket: Trend;
  };
  series: SeriesPoint[];
  topProducts: Array<{
    name: string;
    image: string | null;
    size: string;
    sales: number;
    revenue: number;
    cancellationRate: number | null;
  }>;
  regions: Array<{ name: string; count: number; cancelledCount: number }>;
  ranges: Array<{ name: string; revenue: number; image: string | null }>;
}
