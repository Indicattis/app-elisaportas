import { describe, it, expect } from 'vitest';
import { valorPorExtenso } from './valorExtenso';

describe('valorPorExtenso', () => {
  it('valores do contrato de kit', () => {
    expect(valorPorExtenso(13000)).toBe('treze mil reais');
    expect(valorPorExtenso(2000)).toBe('dois mil reais');
    expect(valorPorExtenso(11000)).toBe('onze mil reais');
  });
  it('compostos e centavos', () => {
    expect(valorPorExtenso(1500)).toBe('mil e quinhentos reais');
    expect(valorPorExtenso(12345.67)).toBe('doze mil trezentos e quarenta e cinco reais e sessenta e sete centavos');
    expect(valorPorExtenso(1)).toBe('um real');
  });
});
