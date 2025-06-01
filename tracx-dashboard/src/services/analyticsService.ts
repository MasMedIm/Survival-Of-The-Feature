import axios from 'axios';
import { AnalyticsResponse, AnalyticsEvent, VariantAnalytics } from '../types/analytics';

// const API_URL = 'https://b9himymqn4.execute-api.us-west-1.amazonaws.com/Prod/events';
// const API_URL = 'https://b9himymqn4.execute-api.us-west-1.amazonaws.com/Prod/events';
const API_URL = '/api/events';

export const fetchAnalytics = async (): Promise<AnalyticsResponse> => {
  const response = await axios.get<AnalyticsResponse>(API_URL);
  return response.data;
};

export const processAnalytics = (events: AnalyticsEvent[]): VariantAnalytics[] => {
  const variantMap = new Map<string, VariantAnalytics>();

  events.forEach((event) => {
    if (!variantMap.has(event.variant)) {
      variantMap.set(event.variant, {
        variant: event.variant,
        totalSessions: 0,
        averageMaxDepth: 0,
        uniqueUsers: 0,
        lastUpdated: new Date(),
      });
    }

    const stats = variantMap.get(event.variant)!;
    stats.totalSessions++;
    stats.averageMaxDepth = (stats.averageMaxDepth * (stats.totalSessions - 1) + event.maxDepth) / stats.totalSessions;
    stats.lastUpdated = new Date(Math.max(stats.lastUpdated.getTime(), event.ts));
  });

  // Calculate unique users
  const uniqueUsers = new Map<string, Set<string>>();
  events.forEach((event) => {
    if (!uniqueUsers.has(event.variant)) {
      uniqueUsers.set(event.variant, new Set());
    }
    uniqueUsers.get(event.variant)!.add(event.sessionId);
  });

  uniqueUsers.forEach((users, variant) => {
    const stats = variantMap.get(variant)!;
    stats.uniqueUsers = users.size;
  });

  return Array.from(variantMap.values());
}; 