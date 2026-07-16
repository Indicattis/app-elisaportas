import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogoUpload } from "@/components/LogoUpload";
import { ContratoUpload } from "@/components/ContratoUpload";
import { ArrowLeft, MapPin, Loader2, RotateCcw, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  TipoParceiro, 
  TIPO_PARCEIRO_LABELS, 
  getEtapasByTipo 
} from "@/utils/parceiros";
import { ESTADOS_BRASIL, getCidadesPorEstado } from "@/utils/estadosCidades";

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
  etapa?: string;
  representante_etapa?: string;
  franqueado_etapa?: string;
  tipo_parceiro: TipoParceiro;
}

interface Vendedor {
  id: string;
  nome: string;
  foto_perfil_url?: string;
}

export default function ParceiroEdit() {
  const { id, tipoParceiro } = useParams<{ id: string; tipoParceiro?: TipoParceiro }>();
  const [tipoParceiroAtual, setTipoParceiroAtual] = useState<TipoParceiro>('autorizado');
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState<ParceiroForm>({
    nome: "",
    email: "",
    telefone: "",
    whatsapp: "",
    responsavel: "",
    cidade: "",
    estado: "",
    cep: "",
    ativo: true,
    logo_url: "",
    vendedor_id: "",
    tipo_parceiro: 'autorizado'
  });
  
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState<string[]>([]);
  
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [resettingTime, setResettingTime] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contratoUrl, setContratoUrl] = useState<string | null>(null);
  const [contratoNome, setContratoNome] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (id) {
      fetchParceiro();
      fetchVendedores();
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
        setTipoParceiroAtual(data.tipo_parceiro || 'autorizado');
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
          etapa: data.etapa,
          representante_etapa: data.representante_etapa,
          franqueado_etapa: data.franqueado_etapa,
          tipo_parceiro: data.tipo_parceiro || 'autorizado'
        });

        // Load cities for the current state
        if (data.estado) {
          setCidadesDisponiveis(getCidadesPorEstado(data.estado));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar parceiro:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar dados do parceiro.'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVendedores = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_users_basic');
      if (error) throw error;
      setVendedores(data || []);
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Campos obrigatórios
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

  const handleLogoUpdate = (logoUrl: string | null) => {
    setForm({ ...form, logo_url: logoUrl || "" });
  };

  const handleEstadoChange = (estadoSigla: string) => {
    setForm({ ...form, estado: estadoSigla, cidade: '' });
    setCidadesDisponiveis(getCidadesPorEstado(estadoSigla));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: 'Por favor, preencha todos os campos obrigatórios.'
      });
      return;
    }

    try {
      setSaving(true);

      const updateData: any = {
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
        tipo_parceiro: form.tipo_parceiro,
        contrato_url: contratoUrl,
        contrato_nome_arquivo: contratoNome,
        updated_at: new Date().toISOString()
      };

      // Atualizar campos específicos por tipo
      if (tipoParceiroAtual === 'autorizado') {
        updateData.etapa = form.etapa;
        updateData.representante_etapa = null;
        updateData.franqueado_etapa = null;
      } else if (tipoParceiroAtual === 'representante') {
        updateData.representante_etapa = form.representante_etapa;
        updateData.etapa = null;
        updateData.franqueado_etapa = null;
      } else if (tipoParceiroAtual === 'franqueado') {
        updateData.franqueado_etapa = form.franqueado_etapa;
        updateData.etapa = null;
        updateData.representante_etapa = null;
      }

      const { error } = await supabase
        .from('autorizados')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Geocodificar automaticamente se cidade e estado estiverem presentes e mudaram
      if (id && form.cidade && form.estado) {
        try {
          await supabase.functions.invoke('geocode-nominatim', {
            body: {
              id,
              cidade: form.cidade,
              estado: form.estado
            }
          });
        } catch (geocodeError) {
          console.warn('Erro na geocodificação automática:', geocodeError);
          // Não falha o processo principal se a geocodificação falhar
        }
      }

      toast({
        title: 'Sucesso',
        description: `${TIPO_PARCEIRO_LABELS[tipoParceiroAtual]} atualizado com sucesso.`
      });

      // Invalidar cache para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ['autorizados-performance'] });

      navigate('/dashboard/parceiros');
    } catch (error) {
      console.error('Erro ao atualizar parceiro:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao atualizar parceiro.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGeocode = async () => {
    if (!form.cidade || !form.estado) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Cidade e estado são obrigatórios para geocodificação.'
      });
      return;
    }

    try {
      setGeocoding(true);
      
      const { data, error } = await supabase.functions.invoke('geocode-nominatim', {
        body: {
          id,
          cidade: form.cidade,
          estado: form.estado
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: `Coordenadas obtidas: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
        });
        
        // Invalidar cache para atualizar a interface
        queryClient.invalidateQueries({ queryKey: ['autorizados-performance'] });
      } else {
        throw new Error(data.error || 'Erro ao geocodificar endereço');
      }
    } catch (error: any) {
      console.error('Erro na geocodificação:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na geocodificação',
        description: error.message || 'Não foi possível geocodificar o endereço.'
      });
    } finally {
      setGeocoding(false);
    }
  };

  const handleResetTime = async () => {
    if (!isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Apenas administradores podem resetar o tempo de inativação.'
      });
      return;
    }

    try {
      setResettingTime(true);
      
      const { error } = await supabase
        .from('autorizados')
        .update({ 
          data_inicio_contagem_inativacao: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Tempo de inativação resetado com sucesso.'
      });

      // Invalidar cache para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ['autorizados-performance'] });
    } catch (error: any) {
      console.error('Erro ao resetar tempo:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível resetar o tempo de inativação.'
      });
    } finally {
      setResettingTime(false);
    }
  };

  const { etapas, order } = getEtapasByTipo(tipoParceiroAtual);

  const getEtapaValue = () => {
    switch (tipoParceiroAtual) {
      case 'representante':
        return form.representante_etapa;
      case 'franqueado':
        return form.franqueado_etapa;
      default:
        return form.etapa;
    }
  };

  const setEtapaValue = (value: string) => {
    const updates: Partial<ParceiroForm> = {};
    switch (tipoParceiroAtual) {
      case 'representante':
        updates.representante_etapa = value;
        break;
      case 'franqueado':
        updates.franqueado_etapa = value;
        break;
      default:
        updates.etapa = value;
        break;
    }
    setForm({ ...form, ...updates });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/dashboard/parceiros')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Editar {TIPO_PARCEIRO_LABELS[tipoParceiroAtual]}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do {TIPO_PARCEIRO_LABELS[tipoParceiroAtual]}</CardTitle>
          <CardDescription>
            Edite as informações do {TIPO_PARCEIRO_LABELS[tipoParceiroAtual].toLowerCase()}.
            Campos marcados com * são obrigatórios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    placeholder="Nome do parceiro"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className={errors.nome ? "border-red-500" : ""}
                  />
                  {errors.nome && <p className="text-sm text-red-500">{errors.nome}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    placeholder="(00) 00000-0000"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    className={errors.telefone ? "border-red-500" : ""}
                  />
                  {errors.telefone && <p className="text-sm text-red-500">{errors.telefone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp *</Label>
                  <Input
                    id="whatsapp"
                    placeholder="(00) 00000-0000"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className={errors.whatsapp ? "border-red-500" : ""}
                  />
                  {errors.whatsapp && <p className="text-sm text-red-500">{errors.whatsapp}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel">Responsável *</Label>
                  <Input
                    id="responsavel"
                    placeholder="Nome do responsável"
                    value={form.responsavel}
                    onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                    className={errors.responsavel ? "border-red-500" : ""}
                  />
                  {errors.responsavel && <p className="text-sm text-red-500">{errors.responsavel}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendedor_id">Atendente *</Label>
                  <Select 
                    value={form.vendedor_id} 
                    onValueChange={(value) => setForm({ ...form, vendedor_id: value })}
                  >
                    <SelectTrigger className={errors.vendedor_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Selecione um atendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((vendedor) => (
                        <SelectItem key={vendedor.id} value={vendedor.id}>
                          {vendedor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vendedor_id && <p className="text-sm text-red-500">{errors.vendedor_id}</p>}
                </div>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado *</Label>
                    <Select value={form.estado} onValueChange={handleEstadoChange}>
                      <SelectTrigger className={errors.estado ? "border-red-500" : ""}>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_BRASIL.map((estado) => (
                          <SelectItem key={estado.sigla} value={estado.sigla}>
                            {estado.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.estado && <p className="text-sm text-red-500">{errors.estado}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Select 
                      value={form.cidade} 
                      onValueChange={(value) => setForm({ ...form, cidade: value })}
                      disabled={!form.estado}
                    >
                      <SelectTrigger className={errors.cidade ? "border-red-500" : ""}>
                        <SelectValue placeholder={form.estado ? "Selecione a cidade" : "Selecione o estado primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {cidadesDisponiveis.map((cidade) => (
                          <SelectItem key={cidade} value={cidade}>
                            {cidade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.cidade && <p className="text-sm text-red-500">{errors.cidade}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep">CEP *</Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: e.target.value })}
                    className={errors.cep ? "border-red-500" : ""}
                  />
                  {errors.cep && <p className="text-sm text-red-500">{errors.cep}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Etapa</Label>
                  <Select 
                    value={getEtapaValue()} 
                    onValueChange={setEtapaValue}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {order.map((etapaKey) => (
                        <SelectItem key={etapaKey} value={etapaKey}>
                          {etapas[etapaKey as keyof typeof etapas]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={form.ativo}
                    onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
              </div>
            </div>

            {/* Upload de Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <LogoUpload 
                autorizadoId={id!}
                currentLogoUrl={form.logo_url}
                autorizadoName={form.nome}
                onLogoUpdate={handleLogoUpdate}
              />
            </div>

            {/* Upload de Contrato - Apenas para autorizados */}
            {tipoParceiroAtual === 'autorizado' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contrato
                </Label>
                <ContratoUpload 
                  contratoUrl={contratoUrl}
                  contratoNome={contratoNome}
                  onContratoChange={(url, nome, tamanho) => {
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

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t">
              <div className="flex gap-2">
                {form.cidade && form.estado && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGeocode}
                    disabled={geocoding}
                  >
                    {geocoding ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-2" />
                    )}
                    Obter coordenadas
                  </Button>
                )}
                
                {isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetTime}
                    disabled={resettingTime}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    {resettingTime ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Resetar tempo
                  </Button>
                )}
              </div>
              
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard/parceiros')}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}