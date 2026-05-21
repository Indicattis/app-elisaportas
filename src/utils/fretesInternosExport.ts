import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { FreteCidade } from "@/hooks/useFretesCidades";

const fileDate = () => format(new Date(), "yyyy-MM-dd");

const sortFretes = (fretes: FreteCidade[]) =>
  [...fretes].sort((a, b) =>
    a.estado === b.estado
      ? a.cidade.localeCompare(b.cidade, "pt-BR")
      : a.estado.localeCompare(b.estado, "pt-BR"),
  );

export function exportarFretesPDF(fretes: FreteCidade[]) {
  const doc = new jsPDF({ orientation: "portrait", format: "a4" });
  const dados = sortFretes(fretes);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Frete por Cidade — Valores Internos", 105, 18, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    105,
    24,
    { align: "center" },
  );
  doc.text(`Total de registros: ${dados.length}`, 14, 32);

  autoTable(doc, {
    startY: 36,
    head: [["Estado", "Cidade", "Valor (R$)", "Km", "Observações", "Ativo"]],
    body: dados.map((f) => [
      f.estado,
      f.cidade,
      f.valor_frete.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      f.quilometragem != null ? String(f.quilometragem) : "-",
      f.observacoes || "-",
      f.ativo ? "Sim" : "Não",
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      5: { halign: "center" },
    },
  });

  doc.save(`fretes-internos-${fileDate()}.pdf`);
}

export function exportarFretesExcel(fretes: FreteCidade[]) {
  const dados = sortFretes(fretes);
  const rows = dados.map((f) => ({
    Estado: f.estado,
    Cidade: f.cidade,
    "Valor do Frete (R$)": Number(f.valor_frete) || 0,
    Km: f.quilometragem ?? "",
    Observações: f.observacoes || "",
    Ativo: f.ativo ? "Sim" : "Não",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 18 },
    { wch: 8 },
    { wch: 40 },
    { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fretes Internos");
  XLSX.writeFile(wb, `fretes-internos-${fileDate()}.xlsx`);
}