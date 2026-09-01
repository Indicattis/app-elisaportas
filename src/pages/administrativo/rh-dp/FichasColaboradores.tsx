import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, FileText, ClipboardList, Check, Clock } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useColaboradorFichas,
  type ColaboradorBasico,
  type ColaboradorFicha,
} from "@/hooks/useColaboradorFichas";

interface FormState {
  comida_favorita: string;
  bebida_favorita: string;
  preferencia_bebida: string;
  preferencia_bebida_outra: string;
  doce_favorito: string;
  doce_ou_salgado: string;
  cor_favorita: string;
  data_nascimento: string;
  sexo: string;
  estado_civil: string;
  nacionalidade: string;
}

const emptyForm: FormState = {
  comida_favorita: "",
  bebida_favorita: "",
  preferencia_bebida: "",
  preferencia_bebida_outra: "",
  doce_favorito: "",
  doce_ou_salgado: "",
  cor_favorita: "",
  data_nascimento: "",
  sexo: "",
  estado_civil: "",
  nacionalidade: "",
};

const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"];
const SEXOS = ["Masculino", "Feminino", "Outro", "Prefiro não informar"];

export default function FichasColaboradores() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<ColaboradorBasico | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { colaboradores, fichas, isLoading, salvar } = useColaboradorFichas();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const fichaPorUsuario = useMemo(() => {
    const map = new Map<string, ColaboradorFicha>();
    fichas.forEach((f) => map.set(f.admin_user_id, f));
    return map;
  }, [fichas]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return colaboradores;
    return colaboradores.filter((c) => c.nome?.toLowerCase().includes(termo));
  }, [colaboradores, busca]);

  const preenchidas = useMemo(
    () => colaboradores.filter((c) => fichaPorUsuario.has(c.id)).length,
    [colaboradores, fichaPorUsuario],
  );

  const abrirFicha = (colaborador: ColaboradorBasico) => {
    const ficha = fichaPorUsuario.get(colaborador.id);
    setForm({
      comida_favorita: ficha?.comida_favorita || "",
      bebida_favorita: ficha?.bebida_favorita || "",
      preferencia_bebida: ficha?.preferencia_bebida || "",
      preferencia_bebida_outra: ficha?.preferencia_bebida_outra || "",
      doce_favorito: ficha?.doce_favorito || "",
      doce_ou_salgado: ficha?.doce_ou_salgado || "",
      cor_favorita: ficha?.cor_favorita || "",
      data_nascimento: colaborador.data_nascimento || "",
      sexo: ficha?.sexo || "",
      estado_civil: ficha?.estado_civil || "",
      nacionalidade: ficha?.nacionalidade || "",
    });
    setSelecionado(colaborador);
  };

  const handleSalvar = () => {
    if (!selecionado) return;
    salvar.mutate(
      {
        admin_user_id: selecionado.id,
        comida_favorita: form.comida_favorita,
        bebida_favorita: form.bebida_favorita,
        preferencia_bebida: form.preferencia_bebida,
        preferencia_bebida_outra:
          form.preferencia_bebida === "Outra" ? form.preferencia_bebida_outra : "",
        doce_favorito: form.doce_favorito,
        doce_ou_salgado: form.doce_ou_salgado,
        cor_favorita: form.cor_favorita,
        sexo: form.sexo,
        estado_civil: form.estado_civil,
        nacionalidade: form.nacionalidade,
        data_nascimento: form.data_nascimento || null,
      },
      { onSuccess: () => setSelecionado(null) },
    );
  };

  const exportarPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(14);
    doc.setTextColor(29, 118, 207);
    doc.text("FICHA DE COLABORADORES", 10, 14);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 10, 20);

    const body = colaboradores
      .filter((c) => fichaPorUsuario.has(c.id))
      .map((c) => {
        const f = fichaPorUsuario.get(c.id)!;
        const bebidaPref =
          f.preferencia_bebida === "Outra"
            ? f.preferencia_bebida_outra || "Outra"
            : f.preferencia_bebida;
        return [
          c.nome,
          c.data_nascimento ? format(new Date(`${c.data_nascimento}T12:00:00`), "dd/MM/yyyy") : "-",
          f.sexo || "-",
          f.estado_civil || "-",
          f.nacionalidade || "-",
          f.comida_favorita || "-",
          f.bebida_favorita || "-",
          bebidaPref || "-",
          f.doce_favorito || "-",
          f.doce_ou_salgado || "-",
          f.cor_favorita || "-",
        ];
      });

    autoTable(doc, {
      startY: 25,
      head: [[
        "Colaborador",
        "Nascimento",
        "Sexo",
        "Estado civil",
        "Nacionalidade",
        "Comida",
        "Bebida",
        "Café/Chá",
        "Doce",
        "Doce/Salgado",
        "Cor",
      ]],
      body,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [29, 118, 207], textColor: 255, fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 10, right: 10 },
    });

    doc.save(`fichas-colaboradores-${format(new Date(), "dd-MM-yyyy")}.pdf`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatedBreadcrumb
        items={[
          { label: "Home", path: "/home" },
          { label: "Administrativo", path: "/administrativo" },
          { label: "RH/DP", path: "/administrativo/rh-dp" },
          { label: "Ficha de Colaboradores" },
        ]}
        mounted={mounted}
      />

      <button
        onClick={() => navigate("/administrativo/rh-dp")}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
              <ClipboardList className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Ficha de Colaboradores</h1>
              <p className="text-xs text-white/50">
                {preenchidas} de {colaboradores.length} fichas preenchidas
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={exportarPDF}
            disabled={preenchidas === 0}
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
          >
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar colaborador..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          {isLoading && (
            <div className="p-6 text-sm text-white/50">Carregando colaboradores...</div>
          )}
          {!isLoading && listaFiltrada.length === 0 && (
            <div className="p-6 text-sm text-white/50">Nenhum colaborador encontrado.</div>
          )}
          {listaFiltrada.map((c) => {
            const temFicha = fichaPorUsuario.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => abrirFicha(c)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                  {c.foto_perfil_url ? (
                    <img src={c.foto_perfil_url} alt={c.nome} className="w-full h-full object-cover" />
                  ) : (
                    c.nome?.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.nome}</p>
                  <p className="text-xs text-white/40 truncate">{c.setor || "-"}</p>
                </div>
                <span
                  className={`text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 ${
                    temFicha
                      ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
                      : "bg-amber-500/10 border-amber-400/30 text-amber-300"
                  }`}
                >
                  {temFicha ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {temFicha ? "Preenchida" : "Pendente"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selecionado} onOpenChange={(open) => !open && setSelecionado(null)}>
        <DialogContent className="max-w-2xl bg-neutral-950 border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ficha de {selecionado?.nome}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/40 mb-3">Preferências</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-white/70">Comida favorita</Label>
                  <Input
                    value={form.comida_favorita}
                    onChange={(e) => setForm({ ...form, comida_favorita: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Bebida favorita</Label>
                  <Input
                    value={form.bebida_favorita}
                    onChange={(e) => setForm({ ...form, bebida_favorita: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Prefere café, chá ou outra bebida?</Label>
                  <Select
                    value={form.preferencia_bebida}
                    onValueChange={(v) => setForm({ ...form, preferencia_bebida: v })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Café">Café</SelectItem>
                      <SelectItem value="Chá">Chá</SelectItem>
                      <SelectItem value="Outra">Outra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.preferencia_bebida === "Outra" && (
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Qual outra bebida?</Label>
                    <Input
                      value={form.preferencia_bebida_outra}
                      onChange={(e) =>
                        setForm({ ...form, preferencia_bebida_outra: e.target.value })
                      }
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-white/70">Doce favorito</Label>
                  <Input
                    value={form.doce_favorito}
                    onChange={(e) => setForm({ ...form, doce_favorito: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Prefere doce ou salgado?</Label>
                  <Select
                    value={form.doce_ou_salgado}
                    onValueChange={(v) => setForm({ ...form, doce_ou_salgado: v })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Doce">Doce</SelectItem>
                      <SelectItem value="Salgado">Salgado</SelectItem>
                      <SelectItem value="Ambos">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Cor favorita</Label>
                  <Input
                    value={form.cor_favorita}
                    onChange={(e) => setForm({ ...form, cor_favorita: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-white/40 mb-3">Dados pessoais</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-white/70">Data de nascimento</Label>
                  <Input
                    type="date"
                    value={form.data_nascimento}
                    onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Sexo</Label>
                  <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEXOS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Estado civil</Label>
                  <Select
                    value={form.estado_civil}
                    onValueChange={(v) => setForm({ ...form, estado_civil: v })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_CIVIS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Nacionalidade</Label>
                  <Input
                    value={form.nacionalidade}
                    onChange={(e) => setForm({ ...form, nacionalidade: e.target.value })}
                    placeholder="Ex.: Brasileira"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelecionado(null)}
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={salvar.isPending}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white"
            >
              {salvar.isPending ? "Salvando..." : "Salvar ficha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
