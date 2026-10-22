const UN = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEN = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function ate999(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CEN[c]);
  if (r) {
    if (r < 20) partes.push(UN[r]);
    else {
      const d = Math.floor(r / 10), u = r % 10;
      partes.push(u ? `${DEZ[d]} e ${UN[u]}` : DEZ[d]);
    }
  }
  return partes.join(' e ');
}

function inteiroExtenso(n: number): string {
  if (n === 0) return 'zero';
  const grupos: { valor: number; sing: string; plur: string }[] = [
    { valor: Math.floor(n / 1_000_000_000) % 1000, sing: 'bilhão', plur: 'bilhões' },
    { valor: Math.floor(n / 1_000_000) % 1000, sing: 'milhão', plur: 'milhões' },
    { valor: Math.floor(n / 1000) % 1000, sing: 'mil', plur: 'mil' },
    { valor: n % 1000, sing: '', plur: '' },
  ];
  const partes: string[] = [];
  grupos.forEach(g => {
    if (!g.valor) return;
    if (g.sing === 'mil') partes.push(g.valor === 1 ? 'mil' : `${ate999(g.valor)} mil`);
    else if (g.sing) partes.push(`${ate999(g.valor)} ${g.valor === 1 ? g.sing : g.plur}`);
    else partes.push(ate999(g.valor));
  });
  if (partes.length > 1) {
    const ultimo = n % 1000;
    const fim = partes.pop()!;
    const usaE = ultimo > 0 && (ultimo < 100 || ultimo % 100 === 0);
    return `${partes.join(' ')}${usaE ? ' e ' : ' '}${fim}`;
  }
  return partes[0];
}

/** Valor em reais por extenso. Ex.: 13000 → "treze mil reais". */
export function valorPorExtenso(valor: number): string {
  const total = Math.round(Math.abs(valor || 0) * 100);
  const reais = Math.floor(total / 100);
  const centavos = total % 100;
  const partes: string[] = [];
  if (reais) {
    const milhaoRedondo = reais >= 1_000_000 && reais % 1_000_000 === 0;
    partes.push(`${inteiroExtenso(reais)}${milhaoRedondo ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`);
  }
  if (centavos) partes.push(`${inteiroExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  return partes.length ? partes.join(' e ') : 'zero reais';
}
