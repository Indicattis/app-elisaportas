import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarQuantidadeUnidade, getUnidadeAbreviacao } from "./unidadesMedida";
import logoUrl from "@/assets/logo-lista-material.png";

let logoDataUrlCache: string | null = null;
async function getLogoDataUrl(): Promise<string | null> {
  if (logoDataUrlCache) return logoDataUrlCache;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    logoDataUrlCache = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
}

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

export async function gerarListaComprasPDF(etapaLabel: string, itens: ItemListaCompras[]) {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Logo no canto superior esquerdo
  const logoData = await getLogoDataUrl();
  if (logoData) {
    // Proporção da logo ≈ 3.4:1 (largura:altura)
    doc.addImage(logoData, "PNG", 14, 8, 40, 12);
  }

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
      const necessarioStr = formatarQuantidadeUnidade(m.necessario, m.unidade);

      // Matéria-prima: se houver vínculo, mostra qtd da MP necessária; senão, repete o necessário do material
      const mpUnidade = m.materia_prima_unidade || m.unidade;
      const conv = m.materia_prima_conversao && m.materia_prima_conversao > 0
        ? Number(m.materia_prima_conversao)
        : null;
      let materiaPrimaStr: string;
      if (m.materia_prima_id && conv) {
        const qtdMp = Math.ceil(m.necessario / conv);
        const nome = m.materia_prima_nome ? ` (${m.materia_prima_nome})` : "";
        materiaPrimaStr = `${formatarQuantidadeUnidade(qtdMp, mpUnidade)}${nome}`;
      } else if (m.materia_prima_id) {
        const nome = m.materia_prima_nome ? ` (${m.materia_prima_nome})` : "";
        materiaPrimaStr = `${necessarioStr}${nome}`;
      } else {
        materiaPrimaStr = necessarioStr;
      }

      return [
        String(idx + 1),
        m.nome_produto,
        necessarioStr,
        materiaPrimaStr,
      ];
    });

    autoTable(doc, {
      head: [["#", "MATERIAL", "NECESSÁRIO", "MATÉRIA-PRIMA"]],
      body: rows,
      startY: cursorY,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2.5, textColor: 40 },
      headStyles: { fillColor: [240, 240, 240], textColor: 60, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        2: { halign: "right", cellWidth: 60, fontStyle: "bold" },
        3: { halign: "right", cellWidth: 80, fontStyle: "bold", textColor: [37, 99, 235] },
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