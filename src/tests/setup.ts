import { vi, beforeEach, afterEach } from 'vitest';

// Мокируем console.error чтобы не засорять логи тестов
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// Глобальные настройки
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});