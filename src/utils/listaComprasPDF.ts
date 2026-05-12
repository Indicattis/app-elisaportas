import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarQuantidadeUnidade, getUnidadeAbreviacao } from "./unidadesMedida";

export interface ItemListaCompras {
  estoque_id: string;
  nome_produto: string;
  categoria: string;
  unidade: string;
  quantidade_padrao: number | null;
  necessario: number;
  materia_prima_id?: string | null;
  materia_prima_nome?: string | null;
  materia_prima_unidade?: string | null;
  materia_prima_conversao?: number | null;
}

export function gerarListaComprasPDF(etapaLabel: string, itens: ItemListaCompras[]) {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Lista de Compras", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Cálculo de Materiais por Categoria", pageWidth / 2, 25, { align: "center" });

  // Agrupar por categoria
  const porCategoria = new Map<string, ItemListaCompras[]>();
  itens.forEach((it) => {
    const cat = it.categoria?.trim() || "Sem categoria";
    if (!porCategoria.has(cat)) porCategoria.set(cat, []);
    porCategoria.get(cat)!.push(it);
  });
  const categoriasOrdenadas = Array.from(porCategoria.keys()).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  doc.setFontSize(9);
  doc.setTextColor(80);
  const meta = `Gerado em: ${format(new Date(), "dd/MM/yyyy, HH:mm", { locale: ptBR })}    |    Categorias: ${categoriasOrdenadas.length}    |    Materiais: ${itens.length}`;
  doc.text(meta, pageWidth / 2, 32, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(`Etapa: ${etapaLabel}`, pageWidth / 2, 38, { align: "center" });
  doc.setFont("helvetica", "normal");

  let cursorY = 44;

  categoriasOrdenadas.forEach((categoria) => {
    const lista = porCategoria.get(categoria)!.sort((a, b) =>
      a.nome_produto.localeCompare(b.nome_produto, "pt-BR")
    );

    // Cabeçalho da categoria
    doc.setFillColor(37, 99, 235);
    doc.rect(14, cursorY, pageWidth - 28, 8, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(categoria, 18, cursorY + 5.5);
    doc.setFontSize(9);
    doc.text(`${lista.length} ${lista.length === 1 ? "item" : "itens"}`, pageWidth - 18, cursorY + 5.5, { align: "right" });
    cursorY += 8;

    const rows = lista.map((m, idx) => {
      const padrao = m.quantidade_padrao && m.quantidade_padrao > 0 ? m.quantidade_padrao : null;
      const comprarQtd = padrao ? Math.ceil(m.necessario / padrao) : null;
      const unidadeAbrev = getUnidadeAbreviacao(m.unidade);
      const padraoStr = padrao
        ? `Padrão: ${padrao.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${unidadeAbrev}`
        : "Sem padrão definido";
      const necessarioStr = formatarQuantidadeUnidade(m.necessario, m.unidade);
      const comprarStr =
        comprarQtd !== null ? formatarQuantidadeUnidade(comprarQtd, m.unidade) : "—";

      // Matéria-prima
      const mpNome = m.materia_prima_nome || "—";
      const mpUnidade = m.materia_prima_unidade || m.unidade;
      const conv = m.materia_prima_conversao && m.materia_prima_conversao > 0
        ? Number(m.materia_prima_conversao)
        : null;
      const comprarMpStr =
        m.materia_prima_id && conv
          ? formatarQuantidadeUnidade(Math.ceil(m.necessario / conv), mpUnidade)
          : "—";

      return [
        String(idx + 1),
        `${m.nome_produto}\n${padraoStr}`,
        necessarioStr,
        comprarStr,
        mpNome,
        comprarMpStr,
      ];
    });

    autoTable(doc, {
      head: [["#", "MATERIAL", "NECESSÁRIO", "COMPRAR (MATERIAL)", "MATÉRIA-PRIMA", "COMPRAR (MATÉRIA-PRIMA)"]],
      body: rows,
      startY: cursorY,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2.5, textColor: 40 },
      headStyles: { fillColor: [240, 240, 240], textColor: 60, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        2: { halign: "right", cellWidth: 38 },
        3: { halign: "right", cellWidth: 42, fontStyle: "bold", textColor: [37, 99, 235] },
        4: { cellWidth: 60 },
        5: { halign: "right", cellWidth: 48, fontStyle: "bold", textColor: [37, 99, 235] },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          "Sistema Azul • Compras • Cálculo de Materiais",
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" }
        );
      },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 6;

    if (cursorY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      cursorY = 20;
    }
  });

  doc.save(`lista-compras-${etapaLabel.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}