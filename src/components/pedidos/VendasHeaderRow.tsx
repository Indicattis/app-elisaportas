export function VendasHeaderRow({ mode = 'pedido' }: { mode?: 'pedido' | 'faturamento' | 'contrato' }) {
  const isFaturamentoLayout = mode === 'faturamento' || mode === 'contrato';
  return (
    <div
      className="grid items-center gap-1.5 px-2 h-7 text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider"
      style={{
        gridTemplateColumns: isFaturamentoLayout
          ? '24px 1fr 100px 60px 75px 50px 60px 65px 80px 35px 35px 55px 45px 70px 60px 70px 60px 70px 30px 30px'
          : '20px 24px 1fr 100px 60px 75px 50px 60px 65px 80px 35px 35px 55px 70px 60px 70px 60px 30px 30px 30px 20px'
      }}
    >
      {mode === 'pedido' && <div />}
      <div />
      <div>Cliente</div>
      <div className="text-center">Cidade</div>
      <div className="text-center">Data</div>
      <div className="text-center">Tempo</div>
      <div className="text-center">Tipo</div>
      <div className="text-center">Portas</div>
      <div className="text-center">Cores</div>
      <div className="text-center">Pgto</div>
      <div className="text-center">Parc.</div>
      <div className="text-center">Ent.</div>
      <div className="text-center">Desc.</div>
      {isFaturamentoLayout && <div className="text-center">% Desc</div>}
      <div className="text-center">Total</div>
      <div className="text-center">Frete</div>
      <div className="text-center">Tabela</div>
      <div className="text-center">Lucro</div>
      {isFaturamentoLayout ? (
        <>
          <div className="text-center">{mode === 'contrato' ? 'Cont.' : 'Fat.'}</div>
          <div />
          <div />
        </>
      ) : (
        <>
          <div />
          <div />
          <div />
          <div />
        </>
      )}
    </div>
  );
}
