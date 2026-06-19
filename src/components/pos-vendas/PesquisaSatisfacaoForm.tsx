import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Upload, X, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface ItemAvulso {
  custo_item_id: string;
  descricao: string;
  quantidade: number;
  preco_venda: number;
}

interface AnexoUpload {
  path: string;
  nome: string;
  tipo: string;
}

interface Props {
  pedido: { id: string; numero_pedido: string; cliente_nome: string };
  open: boolean;
  onClose: () => void;
  onFinalizado: () => void;
}

const MAX_MB = 10;

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-6 h-6 ${
              n <= value ? 'fill-amber-400 text-amber-400' : 'text-white/30'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function PesquisaSatisfacaoForm({ pedido, open, onClose, onFinalizado }: Props) {
  const [notaAtendimento, setNotaAtendimento] = useState(0);
  const [notaProduto, setNotaProduto] = useState(0);
  const [notaInstalacao, setNotaInstalacao] = useState(0);
  const [recomendaria, setRecomendaria] = useState(true);
  const [comentario, setComentario] = useState('');
  const [quisAvulsos, setQuisAvulsos] = useState(false);
  const [itens, setItens] = useState<ItemAvulso[]>([]);
  const [novoItemId, setNovoItemId] = useState<string>('');
  const [avaliouGoogle, setAvaliouGoogle] = useState(false);
  const [anexos, setAnexos] = useState<AnexoUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) {
      setNotaAtendimento(0);
      setNotaProduto(0);
      setNotaInstalacao(0);
      setRecomendaria(true);
      setComentario('');
      setQuisAvulsos(false);
      setItens([]);
      setNovoItemId('');
      setAvaliouGoogle(false);
      setAnexos([]);
    }
  }, [open]);

  const { data: itensCatalogo = [] } = useQuery({
    queryKey: ['custos-itens-avulsos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custos_itens')
        .select('id, descricao, preco_venda, unidade, categoria')
        .eq('vendavel_avulso', true)
        .order('descricao');
      if (error) throw error;
      return data || [];
    },
  });

  const itensDisponiveis = useMemo(
    () => itensCatalogo.filter((c: any) => !itens.some((i) => i.custo_item_id === c.id)),
    [itensCatalogo, itens],
  );

  const handleAddItem = () => {
    const found = itensCatalogo.find((c: any) => c.id === novoItemId);
    if (!found) return;
    setItens([
      ...itens,
      {
        custo_item_id: found.id,
        descricao: found.descricao,
        quantidade: 1,
        preco_venda: Number(found.preco_venda) || 0,
      },
    ]);
    setNovoItemId('');
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const novos: AnexoUpload[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_MB * 1024 * 1024) {
          toast.error(`${file.name} excede ${MAX_MB} MB`);
          continue;
        }
        const path = `${pedido.id}/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage
          .from('pesquisas-satisfacao')
          .upload(path, file, { contentType: file.type });
        if (error) {
          toast.error(`Falha ao enviar ${file.name}: ${error.message}`);
          continue;
        }
        novos.push({ path, nome: file.name, tipo: file.type });
      }
      setAnexos((prev) => [...prev, ...novos]);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoverAnexo = async (anexo: AnexoUpload) => {
    await supabase.storage.from('pesquisas-satisfacao').remove([anexo.path]).catch(() => {});
    setAnexos((prev) => prev.filter((a) => a.path !== anexo.path));
  };

  const handleSalvar = async () => {
    if (!notaAtendimento || !notaProduto || !notaInstalacao) {
      toast.error('Preencha todas as notas');
      return;
    }
    if (quisAvulsos && itens.length === 0) {
      toast.error('Adicione pelo menos um item avulso');
      return;
    }

    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from('pesquisas_satisfacao').insert({
        pedido_id: pedido.id,
        respondido_por: user?.id ?? null,
        nota_atendimento: notaAtendimento,
        nota_produto: notaProduto,
        nota_instalacao: notaInstalacao,
        recomendaria,
        comentario: comentario.trim() || null,
        quis_comprar_avulsos: quisAvulsos,
        itens_avulsos: (quisAvulsos ? itens : []) as any,
        avaliou_no_google: avaliouGoogle,
        anexos: anexos as any,
      });
      if (insertError) throw insertError;

      // Arquivar pedido
      const { error: updateError } = await supabase
        .from('pedidos_producao')
        .update({
          arquivado: true,
          data_arquivamento: new Date().toISOString(),
          arquivado_por: user?.id ?? null,
        })
        .eq('id', pedido.id);
      if (updateError) throw updateError;

      await supabase.from('pedidos_movimentacoes').insert({
        pedido_id: pedido.id,
        user_id: user?.id ?? null,
        etapa_origem: 'pos_vendas',
        etapa_destino: 'pos_vendas',
        teor: 'avanco',
        descricao: 'Pesquisa de satisfação preenchida — pedido arquivado',
      });

      toast.success('Pesquisa enviada e pedido arquivado');
      onFinalizado();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar pesquisa');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pesquisa de satisfação</DialogTitle>
          <DialogDescription>
            Pedido #{pedido.numero_pedido} — {pedido.cliente_nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Atendimento</Label>
              <StarRating value={notaAtendimento} onChange={setNotaAtendimento} />
            </div>
            <div>
              <Label>Produto</Label>
              <StarRating value={notaProduto} onChange={setNotaProduto} />
            </div>
            <div>
              <Label>Instalação</Label>
              <StarRating value={notaInstalacao} onChange={setNotaInstalacao} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label>Recomendaria a empresa?</Label>
            <Switch checked={recomendaria} onCheckedChange={setRecomendaria} />
          </div>

          <div>
            <Label>Comentário do cliente</Label>
            <Textarea
              rows={3}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Observações livres..."
              maxLength={1000}
            />
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Cliente quis comprar itens avulsos?</Label>
              <Switch checked={quisAvulsos} onCheckedChange={setQuisAvulsos} />
            </div>

            {quisAvulsos && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Select value={novoItemId} onValueChange={setNovoItemId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um item" />
                    </SelectTrigger>
                    <SelectContent>
                      {itensDisponiveis.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.descricao}
                          {c.unidade ? ` (${c.unidade})` : ''} — R${' '}
                          {Number(c.preco_venda || 0).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={handleAddItem} disabled={!novoItemId}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {itens.length > 0 && (
                  <div className="space-y-2">
                    {itens.map((item, idx) => (
                      <div
                        key={item.custo_item_id}
                        className="flex items-center gap-2 p-2 border rounded"
                      >
                        <span className="flex-1 text-sm">{item.descricao}</span>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantidade}
                          onChange={(e) => {
                            const novo = [...itens];
                            novo[idx] = { ...item, quantidade: Number(e.target.value) || 1 };
                            setItens(novo);
                          }}
                          className="w-20"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={item.preco_venda}
                          onChange={(e) => {
                            const novo = [...itens];
                            novo[idx] = {
                              ...item,
                              preco_venda: Number(e.target.value) || 0,
                            };
                            setItens(novo);
                          }}
                          className="w-28"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setItens(itens.filter((i) => i.custo_item_id !== item.custo_item_id))
                          }
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-right text-sm font-medium">
                      Total: R${' '}
                      {itens
                        .reduce((sum, i) => sum + i.quantidade * i.preco_venda, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label>Cliente avaliou a empresa no Google?</Label>
            <Switch checked={avaliouGoogle} onCheckedChange={setAvaliouGoogle} />
          </div>

          <div className="space-y-2">
            <Label>Anexos (máx. {MAX_MB} MB por arquivo)</Label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="text-sm">
                {uploading ? 'Enviando...' : 'Clique para selecionar arquivos'}
              </span>
              <input
                type="file"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleUpload(e.target.files)}
              />
            </label>
            {anexos.length > 0 && (
              <ul className="space-y-1">
                {anexos.map((a) => (
                  <li
                    key={a.path}
                    className="flex items-center gap-2 text-sm p-2 border rounded"
                  >
                    <span className="flex-1 truncate">{a.nome}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoverAnexo(a)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando || uploading}>
            {salvando && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Enviar e arquivar pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}