import { describe, it, expect } from 'vitest';

describe('Утилиты', () => {
  describe('Форматирование населения', () => {
    const formatPopulation = (pop: number): string => {
      if (pop >= 1000000) {
        return `${(pop / 1000000).toFixed(1)} млн`;
      }
      return pop.toLocaleString();
    };

    it('должен форматировать миллионы правильно', () => {
      expect(formatPopulation(12655050)).toBe('12.7 млн');
      expect(formatPopulation(5392992)).toBe('5.4 млн');
    });
  });
});