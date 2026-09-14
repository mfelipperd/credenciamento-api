export interface HealthCheckItem {
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    database: HealthCheckItem;
    redis: HealthCheckItem;
  };
}
