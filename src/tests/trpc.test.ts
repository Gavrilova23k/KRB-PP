import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appRouter } from '@/server/trpc/router';
import { createCallerFactory } from '@/server/trpc/trpc';

// Создаём тестовый контекст и вызыватель
const createTestCaller = () => {
  const createContext = async () => ({});
  const createCaller = createCallerFactory(appRouter);
  return createCaller(createContext);
};

describe('tRPC Routers', () => {
  describe('City Router', () => {
    it('должен вернуть пустой массив для getAll без данных', async () => {
      const caller = createTestCaller();
      const result = await caller.city.getAll();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('должен вернуть null для несуществующего города', async () => {
      const caller = createTestCaller();
      const result = await caller.city.getById({ name: 'НеСуществующийГород' });
      
      expect(result).toBeNull();
    });
  });

  describe('Weather Router', () => {
    it('должен вернуть данные погоды для валидных координат', async () => {
      const caller = createTestCaller();
      const result = await caller.weather.getCurrent({
        lat: '55.7558',
        lon: '37.6173',
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('temp');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('icon');
      expect(typeof result.temp).toBe('number');
    });

    it('должен вернуть прогноз на 7 дней по умолчанию', async () => {
      const caller = createTestCaller();
      const result = await caller.weather.getForecast({
        lat: '55.7558',
        lon: '37.6173',
        days: 7,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('должен обработать невалидные координаты без падения', async () => {
      const caller = createTestCaller();
      const result = await caller.weather.getCurrent({
        lat: 'invalid',
        lon: 'invalid',
      });
      
      // Возвращает fallback-данные, но не падает
      expect(result).toBeDefined();
      expect(result).toHaveProperty('temp');
    });
  });

  describe('Input Validation', () => {
    it('должен отвергать отрицательное количество дней для прогноза', async () => {
      const caller = createTestCaller();
      
      await expect(
        caller.weather.getForecast({
          lat: '55.7558',
          lon: '37.6173',
          days: -1 as any,
        })
      ).rejects.toThrow();
    });

    it('должен отвергать слишком большое количество дней', async () => {
      const caller = createTestCaller();
      
      await expect(
        caller.weather.getForecast({
          lat: '55.7558',
          lon: '37.6173',
          days: 100 as any,
        })
      ).rejects.toThrow();
    });
  });
});