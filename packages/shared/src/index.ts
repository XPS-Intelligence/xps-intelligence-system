export type HealthResponse = {
  ok: boolean;
  service: string;
  timestamp: string;
};

export function getHealth(service: string): HealthResponse {
  return {
    ok: true,
    service,
    timestamp: new Date().toISOString()
  };
}
