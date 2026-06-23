import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Upload, User, Plus, X } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getEtapasByTipo } from "@/utils/parceiros";
import { ESTADOS_BRASIL, getCidadesPorEstado } from "@/utils/estadosCidades";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";

interface ParceiroForm {
  nome: string;
  email: string;
  telefone: string;
  whatsapp: string;
  responsavel: string;
  cidade: string;
  estado: string;
  cep: string;
  ativo: boolean;
  logo_url: string;
  vendedor_id: string;
  vendedor_responsavel_id: string;
  etapa: string;
  chave_pix: string;
}

interface CidadeSecundaria {
  estado: string;
  cidade: string;
}

interface Vendedor {
  id: string;
  nome: string;
  foto_perfil_url?: string;
}

export default function NovoAutorizadoDirecao() {
  const { estadoId } = useParams<{ estadoId?: string }>();
  const { etapas, order } = getEtapasByTipo('autorizado');
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState<ParceiroForm>({
    nome: "", email: "", telefone: "", whatsapp: "",
    responsavel: "", cidade: "", estado: "", cep: "",
    ativo: true, logo_url: "", vendedor_id: "",
    vendedor_responsavel_id: "",
    etapa: order[0],
    chave_pix: "",
  });

  const [cidadesDisponiveis, setCidadesDisponiveis] = useState<string[]>([]);
  const [cidadesSecundarias, setCidadesSecundarias] = useState<CidadeSecundaria[]>([]);
  const [novaCidadeSec, setNovaCidadeSec] = useState<CidadeSecundaria>({ estado: '', cidade: '' });
  const [cidadesSecDisponiveis, setCidadesSecDisponiveis] = useState<string[]>([]);

  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [estadoInfo, setEstadoInfo] = useState<{ id: string; nome: string; sigla: string } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const contexto = pathname.startsWith('/logistica') ? 'logistica' : pathname.startsWith('/autorizados') ? 'home' : 'direcao';
  const basePath = contexto === 'home' ? '/autorizados' : `/${contexto}/autorizados`;

  // Fetch estado info if coming from estado page
  useEffect(() => {
    if (estadoId) {
      supabase
        .from('estados_autorizados')
        .select('id, nome, sigla')
        .eq('id', estadoId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setEstadoInfo(data);
            setForm(prev => ({ ...prev, estado: data.sigla }));
            setCidadesDisponiveis(getCidadesPorEstado(data.sigla));
          }
        });
    }
  }, [estadoId]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchVendedores();
  }, []);

  const fetchVendedores = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, nome, foto_perfil_url')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      setVendedores(data || []);
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (!form.cidade.trim()) newErrors.cidade = "Cidade é obrigatória";
    if (!form.estado.trim()) newErrors.estado = "Estado é obrigatório";
    if (!form.cep.trim()) newErrors.cep = "CEP é obrigatório";
    if (!form.whatsapp.trim()) newErrors.whatsapp = "WhatsApp é obrigatório";
    if (!form.responsavel.trim()) newErrors.responsavel = "Responsável é obrigatório";
    if (!form.telefone.trim()) newErrors.telefone = "Telefone é obrigatório";
    if (!form.vendedor_id) newErrors.vendedor_id = "Atendente é obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEstadoChange = (estadoSigla: string) => {
    setForm({ ...form, estado: estadoSigla, cidade: '' });
    setCidadesDisponiveis(getCidadesPorEstado(estadoSigla));
  };

  const handleEstadoSecChange = (estadoSigla: string) => {
    setNovaCidadeSec({ estado: estadoSigla, cidade: '' });
    setCidadesSecDisponiveis(getCidadesPorEstado(estadoSigla));
  };

  const handleAdicionarCidadeSec = () => {
    if (!novaCidadeSec.estado || !novaCidadeSec.cidade) return;
    const exists = cidadesSecundarias.some(
      c => c.estado === novaCidadeSec.estado && c.cidade === novaCidadeSec.cidade
    );
    if (exists) {
      toast({ variant: 'destructive', title: 'Cidade já adicionada' });
      return;
    }
    setCidadesSecundarias([...cidadesSecundarias, { ...novaCidadeSec }]);
    setNovaCidadeSec({ estado: '', cidade: '' });
    setCidadesSecDisponiveis([]);
  };

  const handleRemoverCidadeSec = (index: number) => {
    setCidadesSecundarias(cidadesSecundarias.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({ variant: 'destructive', title: 'Erro de validação', description: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    try {
      setSaving(true);

      const { data: insertedData, error } = await supabase
        .from('autorizados')
        .insert([{
          nome: form.nome,
          email: form.email || null,
          telefone: form.telefone,
          whatsapp: form.whatsapp,
          responsavel: form.responsavel,
          endereco: null,
          cidade: form.cidade,
          estado: form.estado,
          cep: form.cep,
          regiao: null,
          ativo: form.ativo,
          logo_url: form.logo_url || null,
          vendedor_id: form.vendedor_id,
          vendedor_responsavel_id: form.vendedor_responsavel_id || null,
          tipo_parceiro: 'autorizado' as const,
          etapa: form.etapa as 'ativo' | 'perdido' | 'premium',
          chave_pix: form.chave_pix || null,
          created_by: user?.id ?? null,
        }])
        .select('id')
        .single();

      if (error) throw error;

      // Salvar cidades secundárias
      if (insertedData?.id && cidadesSecundarias.length > 0) {
        const { error: secError } = await supabase
          .from('autorizado_cidades_secundarias')
          .insert(cidadesSecundarias.map(c => ({
            autorizado_id: insertedData.id,
            cidade: c.cidade,
            estado: c.estado,
          })));
        if (secError) console.error('Erro ao salvar cidades secundárias:', secError);
      }

      // Geocodificar
      if (insertedData?.id && form.cidade && form.estado) {
        try {
          await supabase.functions.invoke('geocode-nominatim', {
            body: { id: insertedData.id, cidade: form.cidade, estado: form.estado }
          });
        } catch (geocodeError) {
          console.warn('Erro na geocodificação automática:', geocodeError);
        }
      }

      toast({ title: 'Sucesso', description: 'Autorizado criado com sucesso.' });
      navigate(basePath);
    } catch (error) {
      console.error('Erro ao criar autorizado:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao criar autorizado.' });
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbItems = [
    { label: "Home", path: "/home" },
    ...(contexto !== 'home' ? [{ label: contexto === 'logistica' ? "Logística" : "Direção", path: contexto === 'logistica' ? '/logistica' : '/direcao' }] : []),
    { label: "Autorizados", path: basePath },
    ...(estadoInfo ? [{ label: estadoInfo.nome, path: `${basePath}/estado/${estadoInfo.id}` }] : []),
    { label: "Novo" }
  ];

  const backPath = estadoInfo ? `${basePath}/estado/${estadoInfo.id}` : basePath;

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <AnimatedBreadcrumb
        items={breadcrumbItems}
        mounted={mounted}
      />

      <div className="pt-12">
        <header className="sticky top-0 z-20 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-primary/10">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button
              onClick={() => navigate(backPath)}
              className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white/80" />
            </button>
            <h1 className="text-lg font-semibold text-white">Novo Autorizado</h1>
          </div>
        </header>

        <div className="px-4 py-6 max-w-4xl mx-auto">
          <Card className="bg-white/5 border-primary/10">
            <CardHeader>
              <CardTitle className="text-white">Informações do Autorizado</CardTitle>
              <CardDescription className="text-white/60">
                Campos marcados com * são obrigatórios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Coluna Esquerda */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white/80">Nome *</Label>
                      <Input placeholder="Nome do autorizado" value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        className={`bg-white/5 border-white/10 text-white ${errors.nome ? "border-red-500" : ""}`} />
                      {errors.nome && <p className="text-sm text-red-500">{errors.nome}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Email</Label>
                      <Input type="email" placeholder="email@exemplo.com" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Telefone *</Label>
                      <Input placeholder="(00) 00000-0000" value={form.telefone}
                        onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                        className={`bg-white/5 border-white/10 text-white ${errors.telefone ? "border-red-500" : ""}`} />
                      {errors.telefone && <p className="text-sm text-red-500">{errors.telefone}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">WhatsApp *</Label>
                      <Input placeholder="(00) 00000-0000" value={form.whatsapp}
                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                        className={`bg-white/5 border-white/10 text-white ${errors.whatsapp ? "border-red-500" : ""}`} />
                      {errors.whatsapp && <p className="text-sm text-red-500">{errors.whatsapp}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Chave Pix</Label>
                      <Input placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória" value={form.chave_pix}
                        onChange={(e) => setForm({ ...form, chave_pix: e.target.value })}
                        className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Responsável *</Label>
                      <Input placeholder="Nome do responsável" value={form.responsavel}
                        onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                        className={`bg-white/5 border-white/10 text-white ${errors.responsavel ? "border-red-500" : ""}`} />
                      {errors.responsavel && <p className="text-sm text-red-500">{errors.responsavel}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Atendente *</Label>
                      <Select value={form.vendedor_id} onValueChange={(value) => setForm({ ...form, vendedor_id: value })}>
                        <SelectTrigger className={`bg-white/5 border-white/10 text-white ${errors.vendedor_id ? "border-red-500" : ""}`}>
                          <SelectValue placeholder="Selecione um atendente" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendedores.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.vendedor_id && <p className="text-sm text-red-500">{errors.vendedor_id}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Vendedor Responsável</Label>
                      <Select value={form.vendedor_responsavel_id} onValueChange={(value) => setForm({ ...form, vendedor_responsavel_id: value })}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Selecione o vendedor responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendedores.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Coluna Direita */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white/80">Estado *</Label>
                        <Select value={form.estado} onValueChange={handleEstadoChange}>
                          <SelectTrigger className={`bg-white/5 border-white/10 text-white ${errors.estado ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {ESTADOS_BRASIL.map((e) => (
                              <SelectItem key={e.sigla} value={e.sigla}>{e.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.estado && <p className="text-sm text-red-500">{errors.estado}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/80">Cidade *</Label>
                        <Select value={form.cidade} onValueChange={(v) => setForm({ ...form, cidade: v })} disabled={!form.estado}>
                          <SelectTrigger className={`bg-white/5 border-white/10 text-white ${errors.cidade ? "border-red-500" : ""}`}>
                            <SelectValue placeholder={form.estado ? "Cidade" : "Selecione o estado"} />
                          </SelectTrigger>
                          <SelectContent>
                            {cidadesDisponiveis.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.cidade && <p className="text-sm text-red-500">{errors.cidade}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/80">CEP *</Label>
                      <Input placeholder="00000-000" value={form.cep}
                        onChange={(e) => setForm({ ...form, cep: e.target.value })}
                        className={`bg-white/5 border-white/10 text-white ${errors.cep ? "border-red-500" : ""}`} />
                      {errors.cep && <p className="text-sm text-red-500">{errors.cep}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/80">Etapa</Label>
                      <Select value={form.etapa} onValueChange={(v) => setForm({ ...form, etapa: v })}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Selecione uma etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          {order.map((key) => (
                            <SelectItem key={key} value={key}>{etapas[key as keyof typeof etapas]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="ativo" checked={form.ativo} onCheckedChange={(checked) => setForm({ ...form, ativo: checked })} />
                      <Label htmlFor="ativo" className="text-white/80">Ativo</Label>
                    </div>

                    {/* Logo */}
                    <div className="space-y-2">
                      <Label className="text-white/80">Logo</Label>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-white/5 rounded-full">
                          {form.logo_url ? (
                            <img src={form.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <User className="h-6 w-6 text-white/40" />
                          )}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="bg-white/5 border-white/10 text-white" asChild>
                          <label className="cursor-pointer">
                            <Upload className="w-4 h-4 mr-2" />
                            Enviar Logo
                            <input type="file" className="hidden" accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => setForm({ ...form, logo_url: ev.target?.result as string });
                                  reader.readAsDataURL(file);
                                }
                              }} />
                          </label>
                        </Button>
                        {form.logo_url && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, logo_url: "" })} className="text-white/60">
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cidades Secundárias */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <Label className="text-white/80 text-base font-medium">Cidades Secundárias (atendidas)</Label>
                  <p className="text-xs text-white/50">Cidades adicionais onde este autorizado presta serviço além da cidade principal.</p>

                  {cidadesSecundarias.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {cidadesSecundarias.map((cs, i) => (
                        <Badge key={i} variant="secondary" className="bg-primary/20 text-primary gap-1 pr-1">
                          {cs.cidade} - {cs.estado}
                          <button type="button" onClick={() => handleRemoverCidadeSec(i)} className="ml-1 hover:bg-white/10 rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <div className="space-y-1 flex-1">
                      <Label className="text-white/60 text-xs">Estado</Label>
                      <Select value={novaCidadeSec.estado} onValueChange={handleEstadoSecChange}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS_BRASIL.map((e) => (
                            <SelectItem key={e.sigla} value={e.sigla}>{e.sigla}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 flex-[2]">
                      <Label className="text-white/60 text-xs">Cidade</Label>
                      <Select value={novaCidadeSec.cidade} onValueChange={(v) => setNovaCidadeSec({ ...novaCidadeSec, cidade: v })} disabled={!novaCidadeSec.estado}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
                          <SelectValue placeholder={novaCidadeSec.estado ? "Cidade" : "Estado primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                          {cidadesSecDisponiveis.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" size="sm" variant="outline"
                      className="bg-primary/20 border-primary/30 text-white h-9"
                      onClick={handleAdicionarCidadeSec}
                      disabled={!novaCidadeSec.estado || !novaCidadeSec.cidade}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6">
                  <Button type="button" variant="outline" onClick={() => navigate('/direcao/autorizados')}
                    className="bg-white/5 border-white/10 text-white">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Criando..." : "Criar Autorizado"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
