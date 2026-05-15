import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface UF { id: number; sigla: string; nome: string; }
interface Municipio { id: number; nome: string; }

let estadosCache: UF[] | null = null;
let estadosPromise: Promise<UF[]> | null = null;
const cidadesCache: Record<string, string[]> = {};
const cidadesPromise: Record<string, Promise<string[]>> = {};

async function fetchEstados(): Promise<UF[]> {
  if (estadosCache) return estadosCache;
  if (!estadosPromise) {
    estadosPromise = fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then(r => r.json())
      .then((data: UF[]) => { estadosCache = data; return data; })
      .catch(() => []);
  }
  return estadosPromise;
}

async function fetchCidades(uf: string): Promise<string[]> {
  if (cidadesCache[uf]) return cidadesCache[uf];
  if (!cidadesPromise[uf]) {
    cidadesPromise[uf] = fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: Municipio[]) => {
        const nomes = data.map(m => m.nome);
        cidadesCache[uf] = nomes;
        return nomes;
      })
      .catch(() => []);
  }
  return cidadesPromise[uf];
}

interface Props {
  cidade: string;
  estado: string;
  onChange: (cidade: string, estado: string) => void;
}

export function EstadoCidadeInline({ cidade, estado, onChange }: Props) {
  const [estados, setEstados] = useState<UF[]>(estadosCache ?? []);
  const [cidades, setCidades] = useState<string[]>(estado ? cidadesCache[estado] ?? [] : []);
  const [openUf, setOpenUf] = useState(false);
  const [openCidade, setOpenCidade] = useState(false);

  useEffect(() => { fetchEstados().then(setEstados); }, []);
  useEffect(() => {
    if (!estado) { setCidades([]); return; }
    fetchCidades(estado).then(setCidades);
  }, [estado]);

  const ufLabel = estado || "UF";
  const cidadeLabel = cidade || "—";

  return (
    <div className="flex items-center gap-1">
      <Popover open={openCidade} onOpenChange={setOpenCidade}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "px-1.5 py-0.5 rounded text-left text-sm hover:bg-white/10 transition truncate min-w-[80px] max-w-[180px]",
              !cidade && "text-white/40"
            )}
            disabled={!estado}
            title={!estado ? "Selecione a UF primeiro" : undefined}
          >
            {cidadeLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0 bg-zinc-900 border-white/10" align="start">
          <Command className="bg-transparent">
            <CommandInput placeholder="Buscar cidade..." className="text-white" />
            <CommandList>
              <CommandEmpty className="text-white/50 text-sm p-2">Nenhuma cidade.</CommandEmpty>
              <CommandGroup>
                {cidades.map((c) => (
                  <CommandItem
                    key={c}
                    value={c}
                    onSelect={() => {
                      onChange(c, estado);
                      setOpenCidade(false);
                    }}
                    className="text-white aria-selected:bg-white/10"
                  >
                    <Check className={cn("mr-2 h-3 w-3", cidade === c ? "opacity-100" : "opacity-0")} />
                    {c}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <span className="text-white/40">-</span>
      <Popover open={openUf} onOpenChange={setOpenUf}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "px-1.5 py-0.5 rounded text-left text-sm hover:bg-white/10 transition w-12 flex items-center justify-between gap-1",
              !estado && "text-white/40"
            )}
          >
            <span>{ufLabel}</span>
            <ChevronsUpDown className="h-3 w-3 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0 bg-zinc-900 border-white/10" align="start">
          <Command className="bg-transparent">
            <CommandInput placeholder="Buscar estado..." className="text-white" />
            <CommandList>
              <CommandEmpty className="text-white/50 text-sm p-2">Nenhum estado.</CommandEmpty>
              <CommandGroup>
                {estados.map((e) => (
                  <CommandItem
                    key={e.sigla}
                    value={`${e.sigla} ${e.nome}`}
                    onSelect={() => {
                      const novaUf = e.sigla;
                      const novaCidade = novaUf === estado ? cidade : "";
                      onChange(novaCidade, novaUf);
                      setOpenUf(false);
                    }}
                    className="text-white aria-selected:bg-white/10"
                  >
                    <Check className={cn("mr-2 h-3 w-3", estado === e.sigla ? "opacity-100" : "opacity-0")} />
                    <span className="font-medium mr-2">{e.sigla}</span>
                    <span className="text-white/60 text-xs">{e.nome}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}