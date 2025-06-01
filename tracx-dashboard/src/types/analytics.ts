export interface AnalyticsEvent {
  ts: number;
  ttl: number;
  variant: string;
  sessionId: string;
  maxDepth: number;
}

export interface AnalyticsResponse {
  items: AnalyticsEvent[];
}

export interface VariantAnalytics {
  variant: string;
  totalSessions: number;
  averageMaxDepth: number;
  uniqueUsers: number;
  lastUpdated: Date;
} 