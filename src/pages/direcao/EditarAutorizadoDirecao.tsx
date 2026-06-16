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
import { LogoUpload } from "@/components/LogoUpload";
import { ContratoUpload } from "@/components/ContratoUpload";
import { ArrowLeft, MapPin, Loader2, RotateCcw, Plus, X, User, Upload } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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

export default function EditarAutorizadoDirecao() {
  const { id } = useParams<{ id: string }>();
  const { etapas, order } = getEtapasByTipo('autorizado');
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [resettingTime, setResettingTime] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contratoUrl, setContratoUrl] = useState<string | null>(null);
  const [contratoNome, setContratoNome] = useState<string | null>(null);
  const [precos, setPrecos] = useState<{ P: number; G: number; GG: number }>({ P: 0, G: 0, GG: 0 });
  const [estadoInfo, setEstadoInfo] = useState<{ id: string; nome: string } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const contexto = pathname.startsWith('/logistica') ? 'logistica' : pathname.startsWith('/autorizados') ? 'home' : 'direcao';
  const basePath = contexto === 'home' ? '/autorizados' : `/${contexto}/autorizados`;

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (id) {
      fetchParceiro();
      fetchVendedores();
      fetchCidadesSecundarias();
    }
  }, [id]);

  const fetchParceiro = async () => {
    try {
      const { data, error } = await supabase
        .from('autorizados')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setContratoUrl(data.contrato_url);
        setContratoNome(data.contrato_nome_arquivo);
        setForm({
          nome: data.nome || "",
          email: data.email || "",
          telefone: data.telefone || "",
          whatsapp: data.whatsapp || "",
          responsavel: data.responsavel || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          cep: data.cep || "",
          ativo: data.ativo,
          logo_url: data.logo_url || "",
          vendedor_id: data.vendedor_id || "",
          vendedor_responsavel_id: (data as any).vendedor_responsavel_id || "",
          etapa: data.etapa || order[0],
          chave_pix: (data as any).chave_pix || "",
        });

        if (data.estado) {
          setCidadesDisponiveis(getCidadesPorEstado(data.estado));
        }

        // Fetch preços de instalação
        const { data: precosData } = await supabase
          .from('autorizado_precos_portas')
          .select('tamanho, valor')
          .eq('autorizado_id', id!);

        if (precosData) {
          const p = { P: 0, G: 0, GG: 0 };
          precosData.forEach((r) => {
            if (r.tamanho === 'P' || r.tamanho === 'G' || r.tamanho === 'GG') {
              p[r.tamanho] = Number(r.valor);
            }
          });
          setPrecos(p);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar autorizado:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar dados do autorizado.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCidadesSecundarias = async () => {
    try {
      const { data, error } = await supabase
        .from('autorizado_cidades_secundarias')
        .select('cidade, estado')
        .eq('autorizado_id', id);

      if (error) throw error;
      setCidadesSecundarias((data || []).map(d => ({ cidade: d.cidade, estado: d.estado })));
    } catch (error) {
      console.error('Erro ao buscar cidades secundárias:', error);
    }
  };

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

  const handleLogoUpdate = (logoUrl: string | null) => {
    setForm({ ...form, logo_url: logoUrl || "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({ variant: 'destructive', title: 'Erro de validação', description: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('autorizados')
        .update({
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
          etapa: form.etapa as 'ativo' | 'perdido' | 'premium',
          contrato_url: contratoUrl,
          contrato_nome_arquivo: contratoNome,
          chave_pix: form.chave_pix || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Sincronizar cidades secundárias (deletar todas e reinserir)
      await supabase
        .from('autorizado_cidades_secundarias')
        .delete()
        .eq('autorizado_id', id!);

      if (cidadesSecundarias.length > 0) {
        const { error: secError } = await supabase
          .from('autorizado_cidades_secundarias')
          .insert(cidadesSecundarias.map(c => ({
            autorizado_id: id!,
            cidade: c.cidade,
            estado: c.estado,
          })));
        if (secError) console.error('Erro ao salvar cidades secundárias:', secError);
      }

      // Salvar preços de instalação
      const { data: { user } } = await supabase.auth.getUser();
      const tamanhos: ('P' | 'G' | 'GG')[] = ['P', 'G', 'GG'];
      for (const tamanho of tamanhos) {
        await supabase
          .from('autorizado_precos_portas')
          .upsert({
            autorizado_id: id!,
            tamanho,
            valor: precos[tamanho],
            created_by: user?.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'autorizado_id,tamanho' });
      }

      // Geocodificar
      if (id && form.cidade && form.estado) {
        try {
          await supabase.functions.invoke('geocode-nominatim', {
            body: { id, cidade: form.cidade, estado: form.estado }
          });
        } catch (geocodeError) {
          console.warn('Erro na geocodificação automática:', geocodeError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['autorizados-performance'] });

      toast({ title: 'Sucesso', description: 'Autorizado atualizado com sucesso.' });
      navigate(basePath);
    } catch (error) {
      console.error('Erro ao atualizar autorizado:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar autorizado.' });
    } finally {
      setSaving(false);
    }
  };

  const handleGeocode = async () => {
    if (!form.cidade || !form.estado) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Cidade e estado são obrigatórios para geocodificação.' });
      return;
    }
    try {
      setGeocoding(true);
      const { data, error } = await supabase.functions.invoke('geocode-nominatim', {
        body: { id, cidade: form.cidade, estado: form.estado }
      });
      if (error) throw error;
      if (data.success) {
        toast({ title: 'Sucesso', description: `Coordenadas: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}` });
        queryClient.invalidateQueries({ queryKey: ['autorizados-performance'] });
      } else {
        throw new Error(data.error || 'Erro ao geocodificar');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na geocodificação', description: error.message || 'Não foi possível geocodificar.' });
    } finally {
      setGeocoding(false);
    }
  };

  const handleResetTime = async () => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Apenas administradores podem resetar o tempo.' });
      return;
    }
    try {
      setResettingTime(true);
      const { error } = await supabase
        .from('autorizados')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Tempo resetado com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['autorizados-performance'] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Não foi possível resetar.' });
    } finally {
      setResettingTime(false);
    }
  };

  // Fetch estado info for breadcrumb
  useEffect(() => {
    if (form.estado) {
      supabase
        .from('estados_autorizados')
        .select('id, nome')
        .ilike('sigla', form.estado)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setEstadoInfo(data);
        });
    }
  }, [form.estado]);

  const breadcrumbItems = [
    { label: "Home", path: "/home" },
    ...(contexto !== 'home' ? [{ label: contexto === 'logistica' ? "Logística" : "Direção", path: contexto === 'logistica' ? '/logistica' : '/direcao' }] : []),
    { label: "Autorizados", path: basePath },
    ...(estadoInfo ? [{ label: estadoInfo.nome, path: `${basePath}/estado/${estadoInfo.id}` }] : []),
    { label: "Editar" }
  ];

  const backPath = estadoInfo ? `${basePath}/estado/${estadoInfo.id}` : basePath;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <AnimatedBreadcrumb
        items={breadcrumbItems}
        mounted={mounted}
      />

      <div className="pt-12">
        <header className="sticky top-0 z-20 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-primary/10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(backPath)}
                className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/80" />
              </button>
              <h1 className="text-lg font-semibold text-white">Editar Autorizado</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 text-white"
                onClick={handleGeocode}
                disabled={geocoding}
              >
                {geocoding ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MapPin className="w-4 h-4 mr-1" />}
                Geocodificar
              </Button>
              {isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white/5 border-white/10 text-white"
                  onClick={handleResetTime}
                  disabled={resettingTime}
                >
                  {resettingTime ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                  Reset Tempo
                </Button>
              )}
            </div>
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
                      {id && (
                        <LogoUpload
                          autorizadoId={id}
                          currentLogoUrl={form.logo_url || null}
                          autorizadoName={form.nome}
                          onLogoUpdate={handleLogoUpdate}
                        />
                      )}
                    </div>

                    {/* Contrato */}
                    {id && (
                      <div className="space-y-2">
                        <Label className="text-white/80">Contrato</Label>
                        <ContratoUpload
                          contratoUrl={contratoUrl}
                          contratoNome={contratoNome}
                          onContratoChange={(url, nome) => {
                            setContratoUrl(url);
                            setContratoNome(nome);
                          }}
                          onContratoRemove={() => {
                            setContratoUrl(null);
                            setContratoNome(null);
                          }}
                        />
                      </div>
                    )}
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

                {/* Preços de Instalação */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <Label className="text-white/80 text-base font-medium">Preços de Instalação</Label>
                  <p className="text-xs text-white/50">Valores cobrados por tamanho de porta.</p>
                  <div className="grid grid-cols-3 gap-4">
                    {([
                      { key: 'P' as const, label: 'P', desc: '< 25m²' },
                      { key: 'G' as const, label: 'G', desc: '25 - 50m²' },
                      { key: 'GG' as const, label: 'GG', desc: '> 50m²' },
                    ]).map(({ key, label, desc }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-white/60 text-xs">{label} <span className="text-white/40">({desc})</span></Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={precos[key] || ''}
                            onChange={(e) => setPrecos({ ...precos, [key]: parseFloat(e.target.value) || 0 })}
                            className="pl-10 bg-white/5 border-white/10 text-white"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6">
                  <Button type="button" variant="outline" onClick={() => navigate('/direcao/autorizados')}
                    className="bg-white/5 border-white/10 text-white">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar Alterações"}
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
