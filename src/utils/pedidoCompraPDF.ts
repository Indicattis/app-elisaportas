import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import logoElisa from "@/assets/logo-elisa.png";

export interface PedidoCompraItemPDF {
  descricao: string;
  codigo?: string | null;
  codigo_fornecedor?: string | null;
  localizacao?: string | null;
  unidade?: string | null;
  quantidade: number;
  valor_unitario: number;
  ipi_percent: number;
}

export interface PedidoCompraDataPDF {
  numero: string;
  data_emissao: string; // ISO
  data_prevista?: string | null; // ISO
  observacoes?: string | null;
  itens: PedidoCompraItemPDF[];
  fornecedor: {
    nome: string;
    cnpj?: string | null;
    cidade?: string | null;
    estado?: string | null;
  };
  empresa: {
    nome: string;
    cnpj?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    cep?: string | null;
    telefone?: string | null;
  };
}

const fmtNum = (n: number, decimals = 10) =>
  Number(n || 0)
    .toFixed(decimals)
    .replace(".", ",");

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  try {
    const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
    return format(d, "dd/MM/yyyy");
  } catch {
    return "";
  }
};

async function loadImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function gerarPedidoCompraPDF(data: PedidoCompraDataPDF) {
  const doc = new jsPDF({ orientation: "portrait", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = 12;

  // Logo (canto superior esquerdo) — proporção ~3.3:1
  try {
    const logoData = await loadImageAsDataUrl(logoElisa);
    doc.addImage(logoData, "PNG", margin, y, 46, 14);
  } catch {
    // segue sem logo se falhar o carregamento
  }

  // Top-right timestamp
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(format(new Date(), "dd/MM/yy, HH:mm"), pageWidth - margin, y, { align: "right" });
  doc.text("Pedido de Compra", pageWidth - margin, y + 4, { align: "right" });

  // Empurra o conteúdo abaixo da logo
  y += 18;

  // Title
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Pedido de compra Nº ${data.numero}`, margin, y + 4);
  y += 14;

  // Empresa block
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const empLinha1 = `${data.empresa.nome}${data.empresa.telefone ? " - " + data.empresa.telefone : ""}`;
  doc.text(empLinha1, margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  if (data.empresa.endereco) {
    doc.text(data.empresa.endereco, margin, y);
    y += 4;
  }
  const cepCidade = [data.empresa.cep, data.empresa.cidade].filter(Boolean).join(" - ");
  if (cepCidade) {
    doc.text(cepCidade, margin, y);
    y += 4;
  }
  if (data.empresa.cnpj) {
    doc.text(`CNPJ: ${data.empresa.cnpj}`, margin, y);
    y += 4;
  }
  doc.text(
    `${data.empresa.cidade ?? ""}${data.empresa.cidade ? ", " : ""}${fmtDate(data.data_emissao)}`,
    margin,
    y,
  );
  y += 8;

  // Fornecedor block
  doc.setFont("helvetica", "bold");
  doc.text("Fornecedor", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(data.fornecedor.nome || "-", margin, y);
  y += 4;
  const fornLinha = [
    data.fornecedor.cnpj ? `CNPJ: ${data.fornecedor.cnpj}` : null,
    data.fornecedor.cidade,
    data.fornecedor.estado,
  ]
    .filter(Boolean)
    .join(", ");
  if (fornLinha) {
    doc.text(fornLinha, margin, y);
    y += 4;
  }
  y += 4;

  // Mini info table
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { cellWidth: 50 },
    },
    body: [
      ["Número do pedido", data.numero],
      ["Data", fmtDate(data.data_emissao)],
      ["Data prevista", fmtDate(data.data_prevista)],
    ],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Itens header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Itens do pedido de compra", margin, y);
  y += 2;

  const itens = data.itens || [];
  const totals = itens.reduce(
    (acc, it) => {
      const qtd = Number(it.quantidade) || 0;
      const vu = Number(it.valor_unitario) || 0;
      const ipiPct = Number(it.ipi_percent) || 0;
      const subtotal = qtd * vu;
      const ipi = subtotal * (ipiPct / 100);
      acc.qtd += qtd;
      acc.produtos += subtotal;
      acc.ipi += ipi;
      acc.total += subtotal + ipi;
      return acc;
    },
    { qtd: 0, produtos: 0, ipi: 0, total: 0 },
  );

  autoTable(doc, {
    startY: y + 2,
    theme: "grid",
    headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
    columnStyles: {
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
    },
    head: [
      [
        "Descrição do produto/serviço",
        "Código",
        "Cód. fornecedor",
        "Localização",
        "Un",
        "Qtde",
        "Valor unitário",
        "IPI %",
        "Valor total",
      ],
    ],
    body: itens.map((it) => {
      const qtd = Number(it.quantidade) || 0;
      const vu = Number(it.valor_unitario) || 0;
      const ipiPct = Number(it.ipi_percent) || 0;
      const total = qtd * vu * (1 + ipiPct / 100);
      return [
        it.descricao,
        it.codigo ?? "",
        it.codigo_fornecedor ?? "",
        it.localizacao ?? "",
        it.unidade ?? "",
        fmtNum(qtd),
        fmtNum(vu),
        ipiPct.toFixed(2).replace(".", ","),
        fmtNum(total),
      ];
    }),
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Totals
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1 },
    columnStyles: {
      0: { halign: "right", fontStyle: "bold", cellWidth: pageWidth - margin * 2 - 50 },
      1: { halign: "right", cellWidth: 50 },
    },
    body: [
      ["N° de itens", fmtNum(itens.length)],
      ["Soma das Qtdes", fmtNum(totals.qtd)],
      ["Total de produtos", fmtNum(totals.produtos)],
      ["Total do IPI", fmtNum(totals.ipi)],
      ["Total do pedido", fmtNum(totals.total)],
    ],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Observações
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Observações", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const obs = data.observacoes?.trim() || "—";
  const wrapped = doc.splitTextToSize(obs, pageWidth - margin * 2);
  doc.text(wrapped, margin, y);

  doc.save(`pedido-compra-${data.numero}.pdf`);
}