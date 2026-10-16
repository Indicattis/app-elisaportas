import { exportEstrategiaPrecosPDF, exportEstrategiaPrecosExcel, PDF_CORES, type ExportColuna } from "./src/utils/estrategiaPrecosExport";

const kits: any[] = [
  { descricao: "Porta de Enrolar 2,50 x 2,20", largura: 2.5, altura: 2.2, valor_porta: 1800, valor_instalacao: 350, valor_pintura: 120 },
  { descricao: "Porta de Enrolar 3,20 x 2,80", largura: 3.2, altura: 2.8, valor_porta: 2600, valor_instalacao: 420, valor_pintura: 0 },
  { descricao: "Porta de Enrolar 1,80 x 2,00", largura: 1.8, altura: 2.0, valor_porta: 1250, valor_instalacao: 0, valor_pintura: 90 },
];
const colunas: ExportColuna[] = [
  { label: "L (m)", pdf: (k) => String(k.largura), excel: (k) => k.largura, alinhar: "center" },
  { label: "A (m)", pdf: (k) => String(k.altura), excel: (k) => k.altura, alinhar: "center" },
  { label: "Porta", pdf: (k) => `R$ ${k.valor_porta}`, excel: (k) => k.valor_porta, cor: () => PDF_CORES.claro },
  { label: "Custo Porta", pdf: (k) => `R$ ${k.valor_porta - 400}`, excel: (k) => k.valor_porta - 400, cor: () => PDF_CORES.rosa },
  { label: "Lucro", pdf: (k) => `R$ 400`, excel: (k) => 400, cor: () => PDF_CORES.verde },
  { label: "Total", pdf: (k) => `R$ ${k.valor_porta + k.valor_instalacao + k.valor_pintura}`, excel: (k) => k.valor_porta + k.valor_instalacao + k.valor_pintura, cor: () => PDF_CORES.branco },
];
exportEstrategiaPrecosPDF(kits, colunas);
exportEstrategiaPrecosExcel(kits, colunas);
console.log("gerado");
