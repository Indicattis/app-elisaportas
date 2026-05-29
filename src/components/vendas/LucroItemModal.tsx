import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HandHeart, Sparkles } from "lucide-react";

interface LucroItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: {
    id: string;
    descricao: string;
    valor_total: number;
    lucro_item?: number;
    quantidade: number;
    custos_itens_id?: string | null;
  };
  onSave: (produtoId: string, lucro: number) => Promise<void>;
  isSaving: boolean;
}

export function LucroItemModal({
  isOpen,
  onClose,
  produto,
  onSave,
  isSaving,
}: LucroItemModalProps) {
  const [lucro, setLucro] = useState<number>(0);

  // Usar produto.id como dependência para garantir reset quando trocar de produto
  useEffect(() => {
    if (isOpen && produto) {
      setLucro(produto.lucro_item ?? 0);
    }
  }, [isOpen, produto?.id, produto?.lucro_item]);

  // Garantir valores numéricos válidos
  const valorTotal = Number(produto.valor_total) || 0;
  const lucroValido = Number.isFinite(lucro) ? lucro : 0;
  const valorUnitario = produto.quantidade > 0 ? valorTotal / produto.quantidade : 0;

  const custoCalculado = valorTotal - lucroValido;
  const margem = valorTotal > 0 ? (lucroValido / valorTotal) * 100 : 0;
  const isLucroInvalido = lucroValido > valorTotal || lucroValido < 0;
  const calculadoDoCatalogo = !!produto.custos_itens_id && (produto.lucro_item ?? 0) > 0;

  const handleSave = async () => {
    if (isLucroInvalido) return;
    await onSave(produto.id, lucro);
    onClose();
  };

  const handleLuva = async () => {
    await onSave(produto.id, 0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Faturar Produto</DialogTitle>
          <DialogDescription>
            {produto.descricao}
          </DialogDescription>
        </DialogHeader>

        {calculadoDoCatalogo && (
          <div className="flex">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Calculado do catálogo
            </Badge>
          </div>
        )}

        <div className="space-y-4 py-4">
          {/* Input de Lucro */}
          <div className="space-y-2">
            <Label htmlFor="lucro">Lucro Real (R$)</Label>
            <Input
              id="lucro"
              type="number"
              min="0"
              max={produto.valor_total}
              step="0.01"
              value={lucro}
              onChange={(e) => {
                const valor = parseFloat(e.target.value);
                setLucro(Number.isFinite(valor) ? valor : 0);
              }}
              className={isLucroInvalido ? "border-destructive" : ""}
            />
            {isLucroInvalido && (
              <p className="text-sm text-destructive">
                Lucro não pode ser maior que o valor total ou negativo
              </p>
            )}
          </div>

          {/* Valores Calculados */}
          <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valor Unitário:</span>
              <span className="text-sm">
                R$ {valorUnitario.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valor Total (linha):</span>
              <span className="font-semibold">
                R$ {valorTotal.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lucro Informado:</span>
              <span className="font-semibold text-green-600">
                R$ {lucroValido.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Custo Calculado:</span>
              <span className="font-semibold text-orange-600">
                R$ {custoCalculado.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">Margem:</span>
              <span className="font-semibold text-blue-600">
                {margem.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Informação de Quantidade */}
          {produto.quantidade > 1 && (
            <p className="text-sm text-muted-foreground">
              Quantidade: {produto.quantidade} unidade(s)
            </p>
          )}
        </div>

        {/* Botões */}
        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleLuva}
            disabled={isSaving}
            className="gap-2"
          >
            <HandHeart className="h-4 w-4" />
            Luva (R$ 0)
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLucroInvalido || isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar Lucro"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
