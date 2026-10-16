import { createContext, useContext, type ReactNode } from 'react';
import { createHttpClient } from '../shared/lib/http';
import { createAuthApi } from '../features/auth/api/auth-api';
import { sessionStore } from '../features/auth/api/session-store';
import { createCatalogApi } from '../features/catalog/api/catalog-api';
import { createMockExamApi } from '../features/mock-exams/api/mock-exam-api';
import { createPerformanceApi } from '../features/performance/api/performance-api';

const http = createHttpClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  getToken: () => sessionStore.get()?.accessToken ?? null,
  onUnauthorized: () => sessionStore.set(null),
});
const services = {
  auth: createAuthApi(http),
  catalog: createCatalogApi(http),
  mockExams: createMockExamApi(http),
  performance: createPerformanceApi(http),
};
const ServicesContext = createContext(services);
export function ServicesProvider({ children }: { children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
export function useServices() {
  return useContext(ServicesContext);
}
