import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EmpresaEmissora, EmpresaEmissoraFormData } from "@/types/empresaEmissora";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const empresaSchema = z.object({
  titulo: z.string().optional(),
  nome: z.string().min(1, "Nome é obrigatório"),
  razao_social: z.string().min(1, "Razão social é obrigatória"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  endereco: z.string().min(1, "Endereço é obrigatório"),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().length(2, "Estado deve ter 2 caracteres"),
  cep: z.string().min(8, "CEP inválido"),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  inscricao_estadual: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  regime_tributario: z.string().optional(),
  cnae: z.string().optional(),
  codigo_municipio_ibge: z.string().optional(),
  codigo_servico_padrao: z.string().optional(),
  descricao_servico_padrao: z.string().optional(),
  aliquota_iss_padrao: z.number().optional(),
  serie_nfe: z.number().optional(),
  serie_nfse: z.number().optional(),
  focusnfe_token: z.string().optional(),
  ambiente: z.string().optional(),
  email_copia: z.string().email("Email inválido").optional().or(z.literal("")),
  ativo: z.boolean().optional(),
  padrao: z.boolean().optional(),
});

interface EmpresaEmissoraFormProps {
  empresa?: EmpresaEmissora;
  onSubmit: (data: EmpresaEmissoraFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function EmpresaEmissoraForm({
  empresa,
  onSubmit,
  onCancel,
  isSubmitting
}: EmpresaEmissoraFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<EmpresaEmissoraFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: empresa || {
      regime_tributario: 'simples_nacional',
      ambiente: 'sandbox',
      aliquota_iss_padrao: 5,
      serie_nfe: 1,
      serie_nfse: 1,
      ativo: true,
      padrao: false,
    }
  });

  const ativo = watch("ativo");
  const padrao = watch("padrao");
  const [buscandoCep, setBuscandoCep] = useState(false);

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  };

  const buscarCep = async (cepRaw?: string) => {
    const cep = (cepRaw ?? watch("cep") ?? "").replace(/\D/g, "");
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await resp.json();
      if (data?.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      if (data.logradouro && !watch("endereco")) setValue("endereco", data.logradouro, { shouldValidate: true });
      if (data.bairro && !watch("bairro")) setValue("bairro", data.bairro, { shouldValidate: true });
      if (data.localidade && !watch("cidade")) setValue("cidade", data.localidade, { shouldValidate: true });
      if (data.uf && !watch("estado")) setValue("estado", String(data.uf).toUpperCase(), { shouldValidate: true });
      setTimeout(() => document.getElementById("numero")?.focus(), 0);
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setBuscandoCep(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input 
              id="titulo" 
              {...register("titulo")} 
              placeholder="Ex: Empresa Produção, Empresa Homologação"
            />
            <p className="text-xs text-muted-foreground">
              Identificação para diferenciar ambientes (produção/homologação)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Fantasia *</Label>
              <Input id="nome" {...register("nome")} />
              {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="razao_social">Razão Social *</Label>
              <Input id="razao_social" {...register("razao_social")} />
              {errors.razao_social && <p className="text-sm text-destructive">{errors.razao_social.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input id="cnpj" {...register("cnpj")} placeholder="00.000.000/0001-00" />
            {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="endereco">Logradouro *</Label>
              <Input id="endereco" {...register("endereco")} />
              {errors.endereco && <p className="text-sm text-destructive">{errors.endereco.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input id="numero" {...register("numero")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input id="complemento" {...register("complemento")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro *</Label>
              <Input id="bairro" {...register("bairro")} />
              {errors.bairro && <p className="text-sm text-destructive">{errors.bairro.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade *</Label>
              <Input id="cidade" {...register("cidade")} />
              {errors.cidade && <p className="text-sm text-destructive">{errors.cidade.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Input id="estado" {...register("estado")} placeholder="RS" maxLength={2} />
              {errors.estado && <p className="text-sm text-destructive">{errors.estado.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP *</Label>
              <Input id="cep" {...register("cep")} placeholder="00000-000" />
              {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" {...register("telefone")} placeholder="(51) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados Fiscais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
              <Input id="inscricao_estadual" {...register("inscricao_estadual")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
              <Input id="inscricao_municipal" {...register("inscricao_municipal")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regime_tributario">Regime Tributário</Label>
              <Select 
                onValueChange={(value) => setValue("regime_tributario", value)}
                defaultValue={empresa?.regime_tributario || 'simples_nacional'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnae">CNAE</Label>
              <Input id="cnae" {...register("cnae")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="codigo_municipio_ibge">Código Município IBGE</Label>
            <Input id="codigo_municipio_ibge" {...register("codigo_municipio_ibge")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações NFS-e</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo_servico_padrao">Código Serviço Padrão</Label>
              <Input id="codigo_servico_padrao" {...register("codigo_servico_padrao")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aliquota_iss_padrao">Alíquota ISS Padrão (%)</Label>
              <Input 
                id="aliquota_iss_padrao" 
                type="number" 
                step="0.01"
                {...register("aliquota_iss_padrao", { valueAsNumber: true })} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao_servico_padrao">Descrição Serviço Padrão</Label>
            <Input id="descricao_servico_padrao" {...register("descricao_servico_padrao")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Numeração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serie_nfe">Série NF-e</Label>
              <Input 
                id="serie_nfe" 
                type="number" 
                {...register("serie_nfe", { valueAsNumber: true })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serie_nfse">Série NFS-e</Label>
              <Input 
                id="serie_nfse" 
                type="number" 
                {...register("serie_nfse", { valueAsNumber: true })} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Focus NFe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="focusnfe_token">Token Focus NFe</Label>
            <Input 
              id="focusnfe_token" 
              type="password" 
              {...register("focusnfe_token")} 
              placeholder="Token da API Focus NFe"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ambiente">Ambiente</Label>
              <Select 
                onValueChange={(value) => setValue("ambiente", value)}
                defaultValue={empresa?.ambiente || 'sandbox'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Homologação</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_copia">Email para Cópia</Label>
              <Input id="email_copia" type="email" {...register("email_copia")} />
              {errors.email_copia && <p className="text-sm text-destructive">{errors.email_copia.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Controle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Empresa Ativa</Label>
              <p className="text-sm text-muted-foreground">
                Desative para impedir emissão de notas
              </p>
            </div>
            <Switch 
              checked={ativo} 
              onCheckedChange={(checked) => setValue("ativo", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Empresa Padrão</Label>
              <p className="text-sm text-muted-foreground">
                Será usada automaticamente na emissão
              </p>
            </div>
            <Switch 
              checked={padrao} 
              onCheckedChange={(checked) => setValue("padrao", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {empresa ? 'Atualizar' : 'Criar'} Empresa
        </Button>
      </div>
    </form>
  );
}
