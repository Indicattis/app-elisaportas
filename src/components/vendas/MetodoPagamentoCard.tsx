import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CreditCard, Banknote, QrCode, Wallet, CalendarIcon, CheckCircle2, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getJanelaDataPagamento } from "@/utils/dataPagamentoRegra";

export interface MetodoPagamento {
  tipo: 'boleto' | 'a_vista' | 'cartao_credito' | '';
  valor: number;
  data_pagamento: Date | undefined;
  empresa_receptora_id: string;
  parcelas_cartao: number;
  parcelas_boleto: number;
  intervalo_boletos: number;
  /** @deprecated Comprovantes agora são anexados uma única vez na venda em `ComprovantesUploadBlock`. */
  comprovante_file?: File | null;
  ja_pago: boolean;
}

export const createEmptyMetodo = (): MetodoPagamento => ({
  tipo: '',
  valor: 0,
  data_pagamento: undefined,
  empresa_receptora_id: '',
  parcelas_cartao: 1,
  parcelas_boleto: 1,
  intervalo_boletos: 21,
  ja_pago: false
});

interface MetodoPagamentoCardProps {
  metodo: MetodoPagamento;
  onChange: (metodo: MetodoPagamento) => void;
  empresas: Array<{ id: string; nome: string }>;
  isLoadingEmpresas: boolean;
  titulo: string;
  valorFixo?: boolean;
  valorLabel?: string;
  tipoTravado?: MetodoPagamento['tipo'];
  intervaloBoletoTravado?: number;
  /**
   * Quando definido, restringe o select de intervalo de boletos a esses valores.
   * Se contiver 1 item, o select fica travado nesse valor.
   */
  intervalosBoletoPermitidos?: number[];
  hideEmpresaReceptora?: boolean;
  /** Máximo de parcelas de boleto permitidas. Default 12. */
  parcelasBoletoMax?: number;
  /** Janela ± dias permitidos para a data de pagamento. Default 5. */
  dataPagamentoJanelaDias?: number;
  /** Quando true, libera qualquer data e oculta a mensagem de janela. */
  dataPagamentoLiberada?: boolean;
  /** Sinaliza que a entrada informada está abaixo do mínimo (requer autorização do Diretor). */
  entradaViolada?: boolean;
  /** Sinaliza que a data de pagamento está fora da janela permitida (requer autorização do Diretor). */
  dataForaJanela?: boolean;
}

export function MetodoPagamentoCard({
  metodo,
  onChange,
  empresas,
  isLoadingEmpresas,
  titulo,
  valorFixo = false,
  valorLabel = "Valor *",
  tipoTravado,
  intervaloBoletoTravado,
  intervalosBoletoPermitidos,
  hideEmpresaReceptora = false,
  parcelasBoletoMax = 12,
  dataPagamentoJanelaDias = 5,
  dataPagamentoLiberada = false,
  entradaViolada = false,
  dataForaJanela = false,
}: MetodoPagamentoCardProps) {
  const metodos = [
    { value: 'boleto', label: 'Boleto', icon: QrCode },
    { value: 'a_vista', label: 'À Vista', icon: Banknote },
    { value: 'cartao_credito', label: 'Cartão', icon: CreditCard },
  ];

  const inputClass = "bg-white/5 border-white/10 text-white placeholder:text-white/40";
  const labelClass = "text-xs font-medium text-white/70";
  const { min: dataMin, max: dataMax } = getJanelaDataPagamento(dataPagamentoJanelaDias);
  const formatBR = (d: Date) => d.toLocaleDateString("pt-BR");

  const AuthWarning = ({ text = "Requer autorização do Diretor" }: { text?: string }) => (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-100"
      title={text}
    >
      <AlertTriangle className="h-3 w-3" />
      {text}
    </span>
  );

  const intervaloAtualViolado =
    metodo.tipo === 'boleto' &&
    !!intervalosBoletoPermitidos &&
    intervalosBoletoPermitidos.length > 0 &&
    !intervalosBoletoPermitidos.includes(metodo.intervalo_boletos);

  return (
    <div className="border rounded-lg p-4 space-y-4 border-white/10 bg-white/5">
      <h4 className="font-medium text-xs text-white/50">{titulo}</h4>
      
      {/* Seleção do tipo de pagamento */}
      <div className="grid grid-cols-3 gap-2">
        {metodos.map((m) => {
          const Icon = m.icon;
          const travado = !!tipoTravado;
          const isAtivo = metodo.tipo === m.value;
          const desabilitado = travado && !isAtivo;
          return (
            <Button
              key={m.value}
              type="button"
              variant="outline"
              disabled={desabilitado}
              className={cn(
                "flex flex-col h-auto py-3 gap-1 border-white/20",
                metodo.tipo === m.value 
                  ? "bg-white/20 border-white/40 text-white" 
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                desabilitado && "opacity-40 cursor-not-allowed"
              )}
              onClick={() => {
                if (travado) return;
                onChange({ ...metodo, tipo: m.value as MetodoPagamento['tipo'] });
              }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{m.label}</span>
            </Button>
          );
        })}
      </div>

      {metodo.tipo && (
        <div className="space-y-4">
          {/* Linha com Valor, Data e Empresa */}
          <div className={cn("grid grid-cols-1 gap-3", hideEmpresaReceptora ? "md:grid-cols-2" : "md:grid-cols-3")}>
            <div className="space-y-1">
              <Label className={cn(labelClass, "flex items-center gap-2 flex-wrap")}>
                <span>{valorLabel}</span>
                {entradaViolada && <AuthWarning />}
              </Label>
              {valorFixo ? (
                <div className={cn("h-9 px-3 py-2 border rounded-md text-sm", inputClass)}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metodo.valor)}
                </div>
              ) : (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={metodo.valor || ''}
                  onChange={(e) => onChange({ ...metodo, valor: parseFloat(e.target.value) || 0 })}
                  placeholder="R$ 0,00"
                  className={cn("h-9", inputClass)}
                />
              )}
            </div>

            {metodo.tipo !== "boleto" && (
              <div className="space-y-1">
                <Label className={cn(labelClass, "flex items-center gap-2 flex-wrap")}>
                  <span>Data do Pagamento *</span>
                  {dataForaJanela && !dataPagamentoLiberada && <AuthWarning />}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-9 justify-start text-left font-normal border-white/10 bg-white/5",
                        !metodo.data_pagamento ? "text-white/40" : "text-white"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {metodo.data_pagamento
                        ? format(metodo.data_pagamento, "dd/MM/yyyy", { locale: ptBR })
                        : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={metodo.data_pagamento}
                      onSelect={(date) => onChange({ ...metodo, data_pagamento: date })}
                      initialFocus
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {dataPagamentoLiberada ? (
                  <p className="text-[10px] text-amber-300/80">
                    Janela de datas liberada por autorização do Diretor.
                  </p>
                ) : (
                  <p className="text-[10px] text-white/40">
                    Permitido entre {formatBR(dataMin)} e {formatBR(dataMax)} (±{dataPagamentoJanelaDias} dias).
                  </p>
                )}
              </div>
            )}

            {!hideEmpresaReceptora && (
            <div className="space-y-1">
              <Label className={labelClass}>Empresa Receptora *</Label>
              <Select
                value={metodo.empresa_receptora_id}
                onValueChange={(value) => onChange({ ...metodo, empresa_receptora_id: value })}
              >
                <SelectTrigger className={cn("h-9", inputClass)}>
                  <SelectValue placeholder={isLoadingEmpresas ? "Carregando..." : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
          </div>

          {/* Checkbox "Já foi pago?" */}
          {metodo.tipo !== 'a_vista' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`ja-pago-${titulo}`}
                checked={metodo.ja_pago}
                onCheckedChange={(checked) => onChange({ ...metodo, ja_pago: checked === true })}
                className="border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <label
                htmlFor={`ja-pago-${titulo}`}
                className="text-xs font-medium text-white/70 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Já foi pago?
              </label>
            </div>
          )}

          {/* Campos específicos por tipo */}
          {metodo.tipo === 'cartao_credito' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={labelClass}>Número de Parcelas *</Label>
                <Select
                  value={metodo.parcelas_cartao.toString()}
                  onValueChange={(value) => onChange({ ...metodo, parcelas_cartao: parseInt(value) })}
                >
                  <SelectTrigger className={cn("h-9", inputClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}x {metodo.valor > 0 && `de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metodo.valor / n)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {metodo.tipo === 'boleto' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={labelClass}>Número de Parcelas *</Label>
                <Select
                  value={metodo.parcelas_boleto.toString()}
                  onValueChange={(value) => onChange({ ...metodo, parcelas_boleto: parseInt(value) })}
                >
                  <SelectTrigger className={cn("h-9", inputClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.max(1, parcelasBoletoMax) }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}x {metodo.valor > 0 && `de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metodo.valor / n)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className={cn(labelClass, "flex items-center gap-2 flex-wrap")}>
                  <span>Intervalo entre Boletos *</span>
                  {intervaloAtualViolado && <AuthWarning />}
                </Label>
                <Select
                  value={metodo.intervalo_boletos.toString()}
                  onValueChange={(value) => onChange({ ...metodo, intervalo_boletos: parseInt(value) })}
                  disabled={!!intervaloBoletoTravado}
                >
                  <SelectTrigger className={cn("h-9", inputClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[21, 36, 42].map((dias) => {
                      const requerAuth =
                        !!intervalosBoletoPermitidos &&
                        intervalosBoletoPermitidos.length > 0 &&
                        !intervalosBoletoPermitidos.includes(dias);
                      return (
                        <SelectItem key={dias} value={dias.toString()}>
                          <span className="inline-flex items-center gap-2">
                            {dias} dias
                            {requerAuth && (
                              <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-medium">
                                <AlertTriangle className="h-3 w-3" />
                                requer autorização
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {intervaloBoletoTravado && (
                  <p className="text-[10px] text-blue-300/80 mt-1">
                    Intervalo travado em {intervaloBoletoTravado} dias pela regra de boleto.
                  </p>
                )}
                {!intervaloBoletoTravado && intervalosBoletoPermitidos && intervalosBoletoPermitidos.length > 1 && (
                  <p className="text-[10px] text-blue-300/80 mt-1">
                    Opções permitidas: {intervalosBoletoPermitidos.join(', ')} dias.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
