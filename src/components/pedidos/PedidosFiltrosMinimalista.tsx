import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Truck, Palette } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PedidosFiltrosMinimalistaProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  tipoEntrega: string;
  onTipoEntregaChange: (value: string) => void;
  corPintura: string;
  onCorPinturaChange: (value: string) => void;
  mostrarProntos: boolean;
  onMostrarProntosToggle: () => void;
}

export function PedidosFiltrosMinimalista({
  searchTerm,
  onSearchChange,
  tipoEntrega,
  onTipoEntregaChange,
  corPintura,
  onCorPinturaChange,
  mostrarProntos,
  onMostrarProntosToggle
}: PedidosFiltrosMinimalistaProps) {

  const { data: cores = [] } = useQuery({
    queryKey: ['cores-filtro'],
    queryFn: async () => {
      const { data, error } = await supabase.
      from('catalogo_cores').
      select('id, nome, codigo_hex').
      eq('ativa', true).
      order('nome');

      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="flex items-center gap-2 flex-wrap w-full">
      {/* Pesquisa */}
      <div className="relative flex-1 min-w-[200px] sm:max-w-xs group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60 group-focus-within:text-blue-300 transition-colors" />
        <Input
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10 text-sm bg-white/5 border-white/10 hover:bg-white/[0.07] focus:bg-white/[0.08] focus:border-blue-400/40 focus-visible:ring-1 focus-visible:ring-blue-400/30 backdrop-blur-xl text-white placeholder:text-white/40 rounded-lg transition-all"
        />
      </div>

      {/* Tipo de Entrega */}
      <Select value={tipoEntrega} onValueChange={onTipoEntregaChange}>
        <SelectTrigger className="w-full sm:w-40 h-10 text-sm bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-blue-400/30 backdrop-blur-xl text-white rounded-lg transition-all gap-2">
          <Truck className="h-4 w-4 text-blue-300/70 shrink-0" />
          <SelectValue placeholder="Entrega" />
        </SelectTrigger>
        <SelectContent className="bg-slate-950/95 border-white/10 backdrop-blur-xl text-white">
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="instalacao">Instalação</SelectItem>
          <SelectItem value="entrega">Entrega</SelectItem>
        </SelectContent>
      </Select>

      {/* Cor da Pintura */}
      <Select value={corPintura} onValueChange={onCorPinturaChange}>
        <SelectTrigger className="w-full sm:w-40 h-10 text-sm bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-blue-400/30 backdrop-blur-xl text-white rounded-lg transition-all gap-2">
          <Palette className="h-4 w-4 text-blue-300/70 shrink-0" />
          <SelectValue placeholder="Cor" />
        </SelectTrigger>
        <SelectContent className="max-h-80 bg-slate-950/95 border-white/10 backdrop-blur-xl text-white z-50">
          <SelectItem value="todas">Todas</SelectItem>
          {cores.map((cor) => (
            <SelectItem key={cor.id} value={cor.nome}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: cor.codigo_hex }}
                />
                {cor.nome}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

}