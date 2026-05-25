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
    head: [["Nº", "Cidade", "Km (ida)", "Ida e volta", "Valor (R$)"]],
    body: dados.map((f, i) => {
      const km = f.quilometragem ?? 0;
      return [
        String(i + 1),
        `${f.cidade} - ${f.estado}`,
        f.quilometragem != null ? String(km) : "-",
        f.quilometragem != null ? String(km * 2) : "-",
        f.quilometragem != null
          ? (km * 6).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "-",
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: {
      0: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  doc.save(`fretes-internos-${fileDate()}.pdf`);
}

export function exportarFretesExcel(fretes: FreteCidade[]) {
  const dados = sortFretes(fretes);
  const rows = dados.map((f, i) => {
    const km = f.quilometragem ?? 0;
    return {
      "Nº": i + 1,
      Cidade: `${f.cidade} - ${f.estado}`,
      "Km (ida)": f.quilometragem != null ? km : "",
      "Ida e volta": f.quilometragem != null ? km * 2 : "",
      "Valor (R$)": f.quilometragem != null ? km * 6 : 0,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fretes Internos");
  XLSX.writeFile(wb, `fretes-internos-${fileDate()}.xlsx`);
}