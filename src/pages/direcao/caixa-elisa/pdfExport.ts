import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// A4 @ 96dpi
const A4_W = 794;
const A4_H = 1123;

const COLORS = {
  bg: '#ffffff',
  surface: '#ffffff',
  border: '#e5e7eb',
  borderSoft: '#f1f5f9',
  text: '#111827',
  muted: '#6b7280',
  faint: '#9ca3af',
  emerald: '#059669',
  emeraldSoft: '#ecfdf5',
  emeraldBorder: '#a7f3d0',
  rose: '#e11d48',
};

const checkboxHTML = (checked: boolean) =>
  checked
    ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:4px;background:${COLORS.emerald};border:1px solid ${COLORS.emerald};color:#fff;font-size:11px;line-height:1;">✓</span>`
    : `<span style="display:inline-block;width:16px;height:16px;border-radius:4px;border:1.5px solid ${COLORS.border};background:#fff;"></span>`;

async function renderAndSave(html: string, filename: string) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-100000px';
  container.style.top = '0';
  container.style.width = `${A4_W}px`;
  container.style.background = COLORS.bg;
  container.style.fontFamily =
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  container.style.color = COLORS.text;
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      windowWidth: A4_W,
    });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [A4_W, A4_H] });

    const totalHeightPx = canvas.height;
    const pageHeightPx = Math.floor((A4_H / A4_W) * canvas.width); // slice size in source-canvas px

    let rendered = 0;
    let pageIndex = 0;
    while (rendered < totalHeightPx) {
      const sliceHeight = Math.min(pageHeightPx, totalHeightPx - rendered);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0, rendered, canvas.width, sliceHeight,
        0, 0, canvas.width, sliceHeight,
      );
      const img = pageCanvas.toDataURL('image/jpeg', 0.95);
      if (pageIndex > 0) doc.addPage([A4_W, A4_H], 'portrait');
      const drawHeight = (sliceHeight * A4_W) / canvas.width;
      doc.addImage(img, 'JPEG', 0, 0, A4_W, drawHeight);

      // Rodapé de paginação
      // (adiciona ao final, depois de saber o total)
      rendered += sliceHeight;
      pageIndex += 1;
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      doc.text(`Página ${i} de ${totalPages}`, A4_W - 24, A4_H - 14, { align: 'right' });
    }

    doc.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

// ---------- Capital de Giro ----------

export interface CapitalGiroPDFData {
  capitalGiro: number;
  totalPendente: number;
  saldoDisponivel: number;
  obrigacoes: { id: string; nome: string; data: string; valor: number; pago: boolean }[];
}

export async function exportCapitalGiroPDF(data: CapitalGiroPDFData) {
  const geradoEm = format(new Date(), 'dd/MM/yyyy HH:mm');
  const totalPago = data.obrigacoes.filter(o => o.pago).reduce((s, o) => s + Number(o.valor || 0), 0);
  const totalGeral = data.obrigacoes.reduce((s, o) => s + Number(o.valor || 0), 0);
  const saldoColor = data.saldoDisponivel < 0 ? COLORS.rose : COLORS.emerald;

  const walletIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${COLORS.emerald}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/>
      <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
    </svg>`;

  const linhas = data.obrigacoes.map(o => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid ${COLORS.border};border-radius:12px;background:#fff;margin-bottom:8px;">
      ${checkboxHTML(o.pago)}
      <div style="display:flex;flex-direction:column;min-width:0;flex:1;">
        <span style="font-weight:600;font-size:14px;color:${o.pago ? COLORS.faint : COLORS.text};${o.pago ? 'text-decoration:line-through;' : ''}">${esc(o.nome)}</span>
        <span style="font-size:11px;color:${COLORS.muted};margin-top:2px;">${format(new Date(o.data + 'T12:00:00'), 'dd/MM/yyyy')}</span>
      </div>
      <div style="font-weight:600;font-size:14px;white-space:nowrap;color:${o.pago ? COLORS.faint : COLORS.text};">${formatBRL(Number(o.valor))}</div>
    </div>
  `).join('');

  const html = `
    <div style="padding:32px 28px;">
      <div style="border:1px solid ${COLORS.border};border-radius:16px;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;background:#fff;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="padding:10px;border-radius:12px;background:${COLORS.emeraldSoft};border:1px solid ${COLORS.emeraldBorder};display:flex;">${walletIcon}</div>
          <div>
            <div style="font-size:18px;font-weight:600;color:${COLORS.text};">2 Milhões Capital de Giro</div>
            <div style="font-size:12px;color:${COLORS.muted};margin-top:2px;">Acompanhe o saldo disponível conforme as obrigações</div>
          </div>
        </div>
        <div style="text-align:right;font-size:11px;color:${COLORS.muted};">Gerado em<br/><span style="color:${COLORS.text};font-weight:500;">${geradoEm}</span></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px;">
        <div style="border:1px solid ${COLORS.border};border-radius:16px;padding:26px;text-align:center;background:#fff;">
          <div style="font-size:10px;letter-spacing:2px;color:${COLORS.muted};text-transform:uppercase;">Capital de Giro</div>
          <div style="margin-top:10px;font-size:36px;font-weight:700;color:${COLORS.text};letter-spacing:-0.5px;">${formatBRL(data.capitalGiro)}</div>
        </div>
        <div style="border:1px solid ${COLORS.border};border-radius:16px;padding:26px;text-align:center;background:#fff;">
          <div style="font-size:10px;letter-spacing:2px;color:${COLORS.muted};text-transform:uppercase;">Saldo Disponível</div>
          <div style="margin-top:10px;font-size:36px;font-weight:700;color:${saldoColor};letter-spacing:-0.5px;">${formatBRL(data.saldoDisponivel)}</div>
          <div style="margin-top:6px;font-size:11px;color:${COLORS.muted};">${formatBRL(data.totalPendente)} pendentes</div>
        </div>
      </div>

      <div style="margin-top:20px;border:1px solid ${COLORS.border};border-radius:16px;padding:12px;background:#fff;">
        ${data.obrigacoes.length === 0
          ? `<div style="padding:32px;text-align:center;font-size:13px;color:${COLORS.muted};">Nenhuma obrigação cadastrada.</div>`
          : linhas}
      </div>

      <div style="margin-top:18px;display:flex;justify-content:space-between;font-size:12px;color:${COLORS.muted};padding:0 4px;">
        <span>Total: <strong style="color:${COLORS.text};">${formatBRL(totalGeral)}</strong></span>
        <span>Pago: <strong style="color:${COLORS.emerald};">${formatBRL(totalPago)}</strong></span>
        <span>Pendente: <strong style="color:${COLORS.text};">${formatBRL(data.totalPendente)}</strong></span>
      </div>
    </div>
  `;

  await renderAndSave(html, `capital-giro-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ---------- Planejamento ----------

export interface PlanejamentoPDFData {
  totalAcumulado: number;
  totalPago: number;
  grupos: {
    label: string;
    subtotal: number;
    items: { id: string; nome: string; valor: number; data: string | null; pago: boolean }[];
  }[];
}

export async function exportPlanejamentoPDF(data: PlanejamentoPDFData) {
  const geradoEm = format(new Date(), 'dd/MM/yyyy HH:mm');
  const totalPendente = data.totalAcumulado - data.totalPago;

  const calIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${COLORS.emerald}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01"/>
    </svg>`;

  const gruposHTML = data.grupos.map(g => {
    const itens = g.items.length === 0
      ? `<div style="padding:12px 6px;font-size:11px;color:${COLORS.faint};">Nenhum item neste mês.</div>`
      : g.items.map(it => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid ${COLORS.border};border-radius:12px;background:#fff;margin-bottom:8px;">
            ${checkboxHTML(it.pago)}
            <div style="display:flex;flex-direction:column;min-width:0;flex:1;">
              <span style="font-weight:600;font-size:14px;color:${it.pago ? COLORS.faint : COLORS.text};${it.pago ? 'text-decoration:line-through;' : ''}">${esc(it.nome)}</span>
              ${it.data ? `<span style="font-size:11px;color:${COLORS.muted};margin-top:2px;">${format(new Date(it.data + 'T12:00:00'), 'dd/MM/yyyy')}</span>` : ''}
            </div>
            <div style="font-weight:600;font-size:14px;white-space:nowrap;color:${it.pago ? COLORS.faint : COLORS.text};">${formatBRL(Number(it.valor))}</div>
          </div>
        `).join('');

    return `
      <div style="border:1px solid ${COLORS.border};border-radius:16px;padding:16px;background:#fff;margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 6px;">
          <div style="font-size:12px;font-weight:600;color:${COLORS.text};text-transform:uppercase;letter-spacing:1.5px;">${esc(g.label)}</div>
          <div style="font-size:11px;color:${COLORS.muted};">Subtotal: <strong style="color:${COLORS.text};">${formatBRL(g.subtotal)}</strong></div>
        </div>
        ${itens}
      </div>
    `;
  }).join('');

  const html = `
    <div style="padding:32px 28px;">
      <div style="border:1px solid ${COLORS.border};border-radius:16px;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;background:#fff;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="padding:10px;border-radius:12px;background:${COLORS.emeraldSoft};border:1px solid ${COLORS.emeraldBorder};display:flex;">${calIcon}</div>
          <div>
            <div style="font-size:18px;font-weight:600;color:${COLORS.text};">Planejamento 2 Milhões de Giro</div>
            <div style="font-size:12px;color:${COLORS.muted};margin-top:2px;">Adicione meses e seus respectivos itens</div>
          </div>
        </div>
        <div style="text-align:right;font-size:11px;color:${COLORS.muted};">Gerado em<br/><span style="color:${COLORS.text};font-weight:500;">${geradoEm}</span></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:20px;margin-bottom:22px;">
        <div style="border:1px solid ${COLORS.border};border-radius:16px;padding:20px;text-align:center;background:#fff;">
          <div style="font-size:10px;letter-spacing:2px;color:${COLORS.muted};text-transform:uppercase;">Total Acumulado</div>
          <div style="margin-top:8px;font-size:24px;font-weight:700;color:${COLORS.text};">${formatBRL(data.totalAcumulado)}</div>
        </div>
        <div style="border:1px solid ${COLORS.border};border-radius:16px;padding:20px;text-align:center;background:#fff;">
          <div style="font-size:10px;letter-spacing:2px;color:${COLORS.muted};text-transform:uppercase;">Total Pago</div>
          <div style="margin-top:8px;font-size:24px;font-weight:700;color:${COLORS.emerald};">${formatBRL(data.totalPago)}</div>
        </div>
        <div style="border:1px solid ${COLORS.border};border-radius:16px;padding:20px;text-align:center;background:#fff;">
          <div style="font-size:10px;letter-spacing:2px;color:${COLORS.muted};text-transform:uppercase;">Total Pendente</div>
          <div style="margin-top:8px;font-size:24px;font-weight:700;color:${COLORS.text};">${formatBRL(totalPendente)}</div>
        </div>
      </div>

      ${data.grupos.length === 0
        ? `<div style="border:1px solid ${COLORS.border};border-radius:16px;padding:32px;text-align:center;font-size:13px;color:${COLORS.muted};background:#fff;">Nenhum mês adicionado.</div>`
        : gruposHTML}
    </div>
  `;

  // Suppress unused import warning for ptBR (labels vêm prontas de fora)
  void ptBR;

  await renderAndSave(html, `planejamento-caixa-elisa-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}