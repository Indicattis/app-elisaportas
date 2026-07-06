import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import logoEmpresa from '@/assets/logo-empresa.png';

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function fmtNum(n: any) {
  const v = typeof n === 'number' ? n : parseFloat(n);
  if (!isFinite(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDataBR(ymd?: string | null) {
  if (!ymd) return '—';
  const s = ymd.slice(0, 10);
  const [y, m, d] = s.split('-');
  return d && m && y ? `${d}/${m}/${y}` : s;
}

/**
 * Desenha um vão com a porta dentro, escalando para caber na área.
 * larguras/alturas em cm.
 */
function desenharVaoPorta(
  doc: jsPDF,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  vaoL: number,
  vaoA: number,
  portaL: number,
  portaA: number,
) {
  const refL = Math.max(vaoL, portaL, 1);
  const refA = Math.max(vaoA, portaA, 1);
  const scale = Math.min(maxW / refL, maxH / refA);
  const vw = vaoL * scale;
  const vh = vaoA * scale;
  const pw = portaL * scale;
  const ph = portaA * scale;
  // Centralizar
  const cx = x + (maxW - vw) / 2;
  const cy = y + (maxH - vh) / 2;

  // Vão (tracejado)
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.rect(cx, cy, vw, vh);

  // Porta (sólido) centralizada no vão
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.6);
  doc.setFillColor(41, 128, 185);
  const px = cx + (vw - pw) / 2;
  const py = cy + (vh - ph) / 2;
  // preenchimento leve
  const gState = (doc as any).GState ? new (doc as any).GState({ opacity: 0.12 }) : null;
  if (gState) (doc as any).setGState(gState);
  doc.rect(px, py, pw, ph, 'F');
  if (gState) (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
  doc.rect(px, py, pw, ph, 'S');

  // Cotas
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  // Largura do vão (topo)
  doc.text(`Vão: ${fmtNum(vaoL)} cm`, cx + vw / 2, cy - 1.5, { align: 'center' });
  // Altura do vão (direita)
  doc.text(`${fmtNum(vaoA)} cm`, cx + vw + 1.5, cy + vh / 2, { angle: 90 });
  // Largura porta (baixo)
  doc.setTextColor(41, 128, 185);
  doc.text(`Porta: ${fmtNum(portaL)} cm`, cx + vw / 2, cy + vh + 4, { align: 'center' });
  // Altura porta (esquerda)
  doc.text(`${fmtNum(portaA)} cm`, cx - 1.5, cy + vh / 2, { angle: 90, align: 'right' });
  doc.setTextColor(0, 0, 0);

  return { bottomY: cy + vh + 6 };
}

export async function gerarPDFVisitaTecnica(visitaId: string) {
  // 1) Buscar visita
  const { data: visita, error: e1 } = await supabase
    .from('visitas_tecnicas_agendadas')
    .select('*')
    .eq('id', visitaId)
    .maybeSingle();
  if (e1) throw e1;
  if (!visita) throw new Error('Visita não encontrada');

  // 2) Responsável
  let responsavelNome = '—';
  if (visita.responsavel_id) {
    const { data: resp } = await supabase
      .from('admin_users').select('nome').eq('id', visita.responsavel_id).maybeSingle();
    if (resp?.nome) responsavelNome = resp.nome;
  }

  // 3) Conclusão + portas
  const { data: conclusao } = await supabase
    .from('visitas_tecnicas_conclusoes')
    .select('*')
    .eq('visita_id', visitaId)
    .maybeSingle();

  let portas: any[] = [];
  if (conclusao?.id) {
    const { data: p } = await supabase
      .from('visitas_tecnicas_portas')
      .select('*')
      .eq('conclusao_id', conclusao.id)
      .order('ordem', { ascending: true });
    portas = p || [];
  }

  // 4) Montar PDF
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  // Header
  const logoData = await loadImageDataUrl(logoEmpresa);
  if (logoData) {
    try { doc.addImage(logoData, 'PNG', margin, 10, 32, 14); } catch { /* ignore */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text('Relatório de Visita Técnica', pageW - margin, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, pageW - margin, 20, { align: 'right' });

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, 27, pageW - margin, 27);

  // Bloco cliente
  let y = 33;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(visita.titulo || 'Visita técnica', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  const endereco = [
    [visita.endereco, visita.numero].filter(Boolean).join(', '),
    visita.complemento,
    visita.bairro,
    [visita.cidade, visita.estado].filter(Boolean).join('/'),
    visita.cep,
  ].filter(Boolean).join(' · ');

  const info: string[] = [
    `Data: ${fmtDataBR(visita.data_visita)}   Hora: ${(visita.hora_inicio || '').slice(0,5) || '—'}`,
    `Responsável: ${responsavelNome}`,
    visita.telefone_contato ? `Telefone: ${visita.telefone_contato}` : '',
    endereco ? `Endereço: ${endereco}` : '',
    visita.observacoes ? `Observações: ${visita.observacoes}` : '',
  ].filter(Boolean);

  info.forEach(line => {
    const wrapped = doc.splitTextToSize(line, pageW - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4.2;
  });

  y += 2;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // Portas
  if (portas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Nenhuma medida registrada para esta visita.', margin, y);
  } else {
    for (let i = 0; i < portas.length; i++) {
      const p = portas[i];
      // quebra de página se necessário
      if (y > pageH - 90) {
        doc.addPage();
        y = margin + 5;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      const sub = `Vão ${i + 1}${p.tipo_servico ? ` — ${p.tipo_servico}` : ''}${p.posicao_porta ? ` (${p.posicao_porta})` : ''}`;
      doc.text(sub, margin, y);
      y += 4;

      // Tabela de medidas
      const diffL = (p.largura_total ?? 0) - (p.largura_vao ?? 0);
      const diffA = (p.altura_total ?? 0) - (p.altura_vao ?? 0);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: pageW - margin - 90 },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5, textColor: [40, 40, 40] },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        head: [['Medida', 'Vão (cm)', 'Porta (cm)', 'Δ (cm)']],
        body: [
          ['Largura', fmtNum(p.largura_vao), fmtNum(p.largura_total), fmtNum(diffL)],
          ['Altura', fmtNum(p.altura_vao), fmtNum(p.altura_total), fmtNum(diffA)],
        ],
      });
      const afterTableY = (doc as any).lastAutoTable?.finalY ?? y + 20;

      // Ilustração ao lado direito
      const drawX = pageW - margin - 80;
      const drawY = y;
      const drawW = 80;
      const drawH = 55;
      desenharVaoPorta(
        doc, drawX, drawY, drawW, drawH,
        Number(p.largura_vao) || 0,
        Number(p.altura_vao) || 0,
        Number(p.largura_total) || 0,
        Number(p.altura_total) || 0,
      );

      y = Math.max(afterTableY, drawY + drawH) + 3;

      // Extras
      const extras: string[] = [];
      if (p.caixa_motor) extras.push(`Caixa motor: ${p.caixa_motor}`);
      if (p.guia_tamanho) extras.push(`Guia: ${p.guia_tamanho}`);
      if (p.meia_cana_tipo) extras.push(`Meia-cana: ${p.meia_cana_tipo}`);
      if (Array.isArray(p.cores) && p.cores.length) {
        const nomes = p.cores.map((c: any) => c?.nome || c?.codigo_hex || '').filter(Boolean).join(', ');
        if (nomes) extras.push(`Cores: ${nomes}`);
      }
      if (p.observacoes) extras.push(`Obs.: ${p.observacoes}`);
      if (extras.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        const wrapped = doc.splitTextToSize(extras.join('  ·  '), pageW - margin * 2);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 3.6;
      }

      y += 4;
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    }
  }

  // Rodapé
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Legenda: tracejado = vão · sólido = porta', margin, pageH - 8);
    doc.text(`Página ${i} de ${pages}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  const safe = (visita.titulo || 'visita').replace(/[^\w\-]+/g, '_').slice(0, 40);
  doc.save(`visita-tecnica-${safe}-${(visita.data_visita || '').slice(0,10)}.pdf`);
}