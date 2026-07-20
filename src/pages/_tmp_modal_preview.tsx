import { AutorizacaoDescontoModal } from '@/components/vendas/AutorizacaoDescontoModal';

export default function TmpModalPreview() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <AutorizacaoDescontoModal
        open={true}
        onOpenChange={() => {}}
        onAutorizado={() => {}}
        percentualDesconto={10.0}
        tipoAutorizacao="responsavel_setor"
        limitePermitido={3}
      />
    </div>
  );
}
