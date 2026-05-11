export interface UnidadeMedida {
  value: string;
  label: string;
  labelPlural: string;
  abreviacao: string;
  discreta: boolean; // true = inteiros (un, rolo, cx...), false = aceita decimais (kg, m, l...)
}

export const UNIDADES_MATERIA_PRIMA: UnidadeMedida[] = [
  { value: "un", label: "Unidade", labelPlural: "Unidades", abreviacao: "un", discreta: true },
  { value: "rolo", label: "Rolo", labelPlural: "Rolos", abreviacao: "rolo", discreta: true },
  { value: "bobina", label: "Bobina", labelPlural: "Bobinas", abreviacao: "bobina", discreta: true },
  { value: "cx", label: "Caixa", labelPlural: "Caixas", abreviacao: "cx", discreta: true },
  { value: "pc", label: "Peça", labelPlural: "Peças", abreviacao: "pç", discreta: true },
  { value: "kg", label: "Quilo", labelPlural: "Quilos", abreviacao: "kg", discreta: false },
  { value: "g", label: "Grama", labelPlural: "Gramas", abreviacao: "g", discreta: false },
  { value: "m", label: "Metro", labelPlural: "Metros", abreviacao: "m", discreta: false },
  { value: "cm", label: "Centímetro", labelPlural: "Centímetros", abreviacao: "cm", discreta: false },
  { value: "m2", label: "Metro²", labelPlural: "Metros²", abreviacao: "m²", discreta: false },
  { value: "l", label: "Litro", labelPlural: "Litros", abreviacao: "l", discreta: false },
  { value: "ml", label: "Mililitro", labelPlural: "Mililitros", abreviacao: "ml", discreta: false },
];

const LEGADO_MAP: Record<string, string> = {
  "m²": "m2",
  "pç": "pc",
  "pç.": "pc",
  unidade: "un",
  rolos: "rolo",
  metro: "m",
  metros: "m",
  quilo: "kg",
  quilos: "kg",
  litro: "l",
  litros: "l",
};

export function normalizarUnidade(unidade: string | null | undefined): string {
  if (!unidade) return "un";
  const u = String(unidade).trim().toLowerCase();
  if (LEGADO_MAP[u]) return LEGADO_MAP[u];
  return u;
}

export function getUnidade(unidade: string | null | undefined): UnidadeMedida {
  const v = normalizarUnidade(unidade);
  return (
    UNIDADES_MATERIA_PRIMA.find((u) => u.value === v) || {
      value: v,
      label: v,
      labelPlural: v,
      abreviacao: v,
      discreta: false,
    }
  );
}

export function getUnidadeLabel(unidade: string | null | undefined): string {
  return getUnidade(unidade).label;
}

export function getUnidadeAbreviacao(unidade: string | null | undefined): string {
  return getUnidade(unidade).abreviacao;
}

export function formatarQuantidadeUnidade(
  qtd: number | string | null | undefined,
  unidade: string | null | undefined
): string {
  const n = Number(qtd ?? 0);
  const u = getUnidade(unidade);
  const valor = n.toLocaleString("pt-BR", {
    minimumFractionDigits: u.discreta ? 0 : 0,
    maximumFractionDigits: u.discreta ? 0 : 2,
  });
  const sufixo = Math.abs(n) === 1 ? u.label.toLowerCase() : u.labelPlural.toLowerCase();
  return `${valor} ${sufixo}`;
}
