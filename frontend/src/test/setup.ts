import '@testing-library/jest-dom';
import { server } from './server';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// Node 25 provides a native localStorage global (--localstorage-file) that
// lacks getItem/setItem/clear methods. Override it with a proper in-memory
// implementation so apiClient and AuthService work correctly in tests.
const localStorageMap = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => localStorageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => localStorageMap.set(key, value)),
  removeItem: vi.fn((key: string) => localStorageMap.delete(key)),
  clear: vi.fn(() => localStorageMap.clear()),
  key: vi.fn((index: number) => Array.from(localStorageMap.keys())[index] ?? null),
  get length() {
    return localStorageMap.size;
  },
};
vi.stubGlobal('localStorage', localStorageMock);

// Clear localStorage between tests
afterEach(() => {
  localStorageMap.clear();
  vi.mocked(localStorageMock.getItem).mockClear();
  vi.mocked(localStorageMock.setItem).mockClear();
  vi.mocked(localStorageMock.removeItem).mockClear();
  vi.mocked(localStorageMock.clear).mockClear();
});

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

