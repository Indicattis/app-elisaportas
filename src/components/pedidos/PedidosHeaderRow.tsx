interface PedidosHeaderRowProps {
  hideOrdensStatus?: boolean;
  showEtapaBadge?: boolean;
  hideValorAReceber?: boolean;
}

export function PedidosHeaderRow({ hideOrdensStatus = false, showEtapaBadge = false, hideValorAReceber = false }: PedidosHeaderRowProps) {
  const aRec = hideValorAReceber ? '' : ' 65px';
  const gridCols = hideOrdensStatus
    ? (showEtapaBadge
      ? `20px 60px 20px 24px 180px 100px 20px 40px 40px 80px 70px 150px 50px 80px 65px${aRec} 1fr 55px`
      : `20px 20px 24px 180px 100px 20px 40px 40px 80px 70px 150px 50px 80px 65px${aRec} 1fr 55px`)
    : (showEtapaBadge
      ? `20px 60px 20px 24px 180px 100px 20px 40px 40px 80px 70px 150px 50px 80px 65px${aRec} 24px 24px 24px 24px 24px 24px 1fr 55px`
      : `20px 20px 24px 180px 100px 20px 40px 40px 80px 70px 150px 50px 80px 65px${aRec} 24px 24px 24px 24px 24px 24px 1fr 55px`);

  return (
    <div
      className="grid items-center gap-1.5 px-2 h-7 text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider"
      style={{ gridTemplateColumns: gridCols }}
    >
      {/* Drag */}
      <div />
      {/* Etapa badge */}
      {showEtapaBadge && <div className="text-center">Etapa</div>}
      {/* Correção */}
      <div />
      {/* Avatar */}
      <div />
      {/* Cliente */}
      <div>Cliente</div>
      {/* Cidade */}
      <div className="text-center">Cidade</div>
      {/* Terceirização */}
      <div className="text-center">T</div>
      {/* Metragem linear */}
      <div className="text-center">m</div>
      {/* Metragem quadrada */}
      <div className="text-center">m²</div>
      {/* Data carreg */}
      <div className="text-center">Carreg.</div>
      {/* Responsável */}
      <div className="text-center">Resp.</div>
      {/* Portas */}
      <div className="text-center">Portas</div>
      {/* Tipo entrega */}
      <div className="text-center">Tipo</div>
      {/* Cores */}
      <div className="text-center">Cores</div>
      {/* Valor */}
      <div className="text-center">Valor</div>
      {/* A Receber */}
      {!hideValorAReceber && <div className="text-center">A Rec.</div>}
      {/* Ordens */}
      {!hideOrdensStatus && (
        <>
          <div className="text-center text-orange-500">S</div>
          <div className="text-center text-blue-500">P</div>
          <div className="text-center text-purple-500">Se</div>
          <div className="text-center text-green-500">Q</div>
          <div className="text-center text-pink-500">Pi</div>
          <div className="text-center text-cyan-500">E</div>
        </>
      )}
      {/* Tempo */}
      <div className="text-center">Tempo</div>
      {/* Ações */}
      <div className="text-center">Ações</div>
    </div>
  );
}
