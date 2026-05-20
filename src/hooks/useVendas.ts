import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addDays } from 'date-fns';
import { PagamentoData } from '@/components/vendas/PagamentoSection';
import { MetodoPagamento } from '@/components/vendas/MetodoPagamentoCard';

export interface ProdutoVenda {
  id?: string;
  tipo_produto: 'porta_enrolar' | 'porta_social' | 'pintura_epoxi' | 'acessorio' | 'adicional' | 'porta' | 'manutencao' | 'instalacao';
  tamanho?: string;
  largura?: number;
  altura?: number;
  cor_id?: string;
  acessorio_id?: string;
  adicional_id?: string;
  vendas_catalogo_id?: string;
  tipo_pintura?: string;
  tipo_servico?: string;
  valor_produto: number;
  valor_pintura: number;
  valor_instalacao: number;
  valor_frete: number;
  tipo_desconto: 'percentual' | 'valor';
  desconto_percentual: number;
  desconto_valor: number;
  quantidade: number;
  descricao?: string;
  valor_credito?: number;
  percentual_credito?: number;
  unidade?: string;
  observacao_item?: string | null;
}

// Manter compatibilidade com código existente
export type PortaVenda = ProdutoVenda;

export interface VendaFormData {
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email?: string;
  cpf_cliente?: string;
  estado: string;
  cidade: string;
  cep?: string;
  bairro?: string;
  endereco?: string;
  publico_alvo: string;
  forma_pagamento: string;
  observacoes_venda?: string;
  data_venda?: string;
  valor_frete?: number;
  valor_entrada?: number;
  valor_a_receber?: number;
  canal_aquisicao_id?: string;
  data_prevista_entrega?: string;
  tipo_entrega?: string;
  venda_presencial?: boolean;
  cliente_id?: string; // ID do cliente existente selecionado
  orcamento_id?: string; // ID do orçamento se for conversão
}

export interface AutorizacaoDesconto {
  autorizado_por: string;
  solicitado_por: string;
  percentual_desconto: number;
  senha_usada: string;
  tipo_autorizacao: 'responsavel_setor' | 'master';
  observacoes?: string;
}

export interface CreditoVenda {
  valorCredito: number;
  percentualCredito: number;
}

export function useVendas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendas, isLoading, refetch } = useQuery({
    queryKey: ['vendas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select(`
          *,
          produtos:produtos_vendas(
            *,
            cor:catalogo_cores(nome, codigo_hex)
          ),
          atendente:admin_users!atendente_id(nome, foto_perfil_url),
          notas_fiscais(id, status, tipo),
          autorizacao_desconto:vendas_autorizacoes_desconto(
            id,
            percentual_desconto,
            tipo_autorizacao,
            autorizado_por,
            autorizador:admin_users!vendas_autorizacoes_desconto_autorizado_por_fkey(
              nome,
              foto_perfil_url
            )
          )
        `)
        .order('data_venda', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createVendaMutation = useMutation({
    mutationFn: async ({ 
      vendaData, 
      portas, 
      pagamentoData,
      autorizacaoDesconto,
      creditoVenda
    }: { 
      vendaData: VendaFormData; 
      portas: ProdutoVenda[];
      pagamentoData?: PagamentoData;
      autorizacaoDesconto?: AutorizacaoDesconto;
      creditoVenda?: CreditoVenda;
    }) => {
      if (portas.length === 0) {
        throw new Error('É necessário adicionar pelo menos um produto');
      }

      // Validar localização obrigatória para emissão de NF-e
      if (!vendaData.estado || !vendaData.cidade || !vendaData.cep || !vendaData.bairro || !vendaData.endereco) {
        throw new Error('Todos os campos de localização são obrigatórios (Estado, Cidade, CEP, Bairro e Endereço)');
      }

      // Validar comprovante obrigatório quando marcado como "já pago"
      if (pagamentoData) {
        const metodosAtivos = pagamentoData.usar_dois_metodos 
          ? pagamentoData.metodos.filter(m => m.tipo)
          : [pagamentoData.metodos[0]].filter(m => m.tipo);
        
        for (const metodo of metodosAtivos) {
          if (metodo.ja_pago && !metodo.comprovante_file) {
            throw new Error('É obrigatório anexar o comprovante de pagamento quando o método está marcado como "Já pago".');
          }
        }
      }

      // Validar tamanho mínimo de endereço e bairro (requisito SEFAZ)
      if (vendaData.endereco && vendaData.endereco.length < 2) {
        throw new Error('O endereço deve ter no mínimo 2 caracteres');
      }

      if (vendaData.bairro && vendaData.bairro.length < 2) {
        throw new Error('O bairro deve ter no mínimo 2 caracteres');
      }

      // 1. Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log('🔍 User ID from auth:', user.id);

      // 2. Buscar admin_user correspondente
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, user_id, nome, email')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('✅ Admin user found:', adminUser, 'Error:', adminError);
      
      if (adminError) {
        throw new Error(`Erro ao buscar usuário: ${adminError.message}`);
      }
      
      if (!adminUser) {
        throw new Error('Usuário não encontrado no sistema. Por favor, entre em contato com o administrador.');
      }

      // 3. Calcular totais dos produtos (sem crédito por produto - agora é a nível de venda)
      const totais = portas.reduce((acc, produto) => {
        const valorBase = (
          produto.valor_produto + 
          produto.valor_pintura + 
          produto.valor_instalacao
        ) * (produto.quantidade || 1);
        
        const descontoAplicado = produto.tipo_desconto === 'valor' 
          ? (produto.desconto_valor || 0)
          : valorBase * ((produto.desconto_percentual || 0) / 100);
        
        const valorComDesconto = valorBase - descontoAplicado;
        
        return {
          valor_produto: acc.valor_produto + (produto.valor_produto * (produto.quantidade || 1)),
          valor_pintura: acc.valor_pintura + (produto.valor_pintura * (produto.quantidade || 1)),
          valor_instalacao: acc.valor_instalacao + (produto.valor_instalacao * (produto.quantidade || 1)),
          valor_total: acc.valor_total + valorComDesconto
        };
      }, {
        valor_produto: 0,
        valor_pintura: 0,
        valor_instalacao: 0,
        valor_total: 0
      });

      // Crédito a nível de venda
      const valorCreditoVenda = creditoVenda?.valorCredito || 0;
      const percentualCreditoVenda = creditoVenda?.percentualCredito || 0;

      const valor_frete = vendaData.valor_frete || 0;
      const valor_total_venda = totais.valor_total + valorCreditoVenda + valor_frete;
      const valor_entrada = vendaData.valor_entrada || 0;
      const valor_a_receber = valor_total_venda - valor_entrada;

      // 4. Criar ou vincular cliente
      let clienteId: string | null = null;

      if (vendaData.cliente_id) {
        // Cliente existente selecionado
        clienteId = vendaData.cliente_id;
      } else if (vendaData.cpf_cliente) {
        // Verificar se cliente já existe por CPF/CNPJ
        const cpfNormalizado = vendaData.cpf_cliente.replace(/\D/g, '');
        if (cpfNormalizado.length >= 11) {
          const { data: clienteExistente } = await supabase
            .from('clientes')
            .select('id')
            .eq('ativo', true)
            .ilike('cpf_cnpj', `%${cpfNormalizado}%`)
            .maybeSingle();
          
          if (clienteExistente) {
            clienteId = clienteExistente.id;
          } else {
            // Criar novo cliente
            const { data: novoCliente, error: clienteError } = await supabase
              .from('clientes')
              .insert({
                nome: vendaData.cliente_nome,
                telefone: vendaData.cliente_telefone || null,
                email: vendaData.cliente_email || null,
                cpf_cnpj: vendaData.cpf_cliente,
                estado: vendaData.estado || null,
                cidade: vendaData.cidade || null,
                cep: vendaData.cep || null,
                endereco: vendaData.endereco || null,
                bairro: vendaData.bairro || null,
                canal_aquisicao_id: vendaData.canal_aquisicao_id || null,
                created_by: user.id
              })
              .select()
              .single();
            
            if (!clienteError && novoCliente) {
              clienteId = novoCliente.id;
              console.log('✅ Novo cliente criado:', novoCliente.id);
            } else if (clienteError) {
              console.error('Erro ao criar cliente:', clienteError);
            }
          }
        }
      } else if (vendaData.cliente_nome) {
        // Cliente sem CPF - criar mesmo assim
        const { data: novoCliente, error: clienteError } = await supabase
          .from('clientes')
          .insert({
            nome: vendaData.cliente_nome,
            telefone: vendaData.cliente_telefone || null,
            email: vendaData.cliente_email || null,
            estado: vendaData.estado || null,
            cidade: vendaData.cidade || null,
            cep: vendaData.cep || null,
            endereco: vendaData.endereco || null,
            bairro: vendaData.bairro || null,
            canal_aquisicao_id: vendaData.canal_aquisicao_id || null,
            created_by: user.id
          })
          .select()
          .single();
        
        if (!clienteError && novoCliente) {
          clienteId = novoCliente.id;
          console.log('✅ Novo cliente (sem CPF) criado:', novoCliente.id);
        } else if (clienteError) {
          console.error('Erro ao criar cliente:', clienteError);
        }
      }

      // 5. Criar venda com valores calculados
      const { endereco, venda_presencial, cliente_id: _, ...vendaDataLimpo } = vendaData;
      
      // Extrair o método de pagamento principal (primeiro método válido)
      const metodoPrincipal = pagamentoData?.metodos?.[0]?.tipo || vendaData.forma_pagamento;
      const empresaReceptoraPrincipal = pagamentoData?.metodos?.[0]?.empresa_receptora_id || null;
      
      const vendaPayload = {
        ...vendaDataLimpo,
        cliente_id: clienteId,
        cpf_cliente: vendaData.cpf_cliente || null,
        atendente_id: adminUser.user_id,
        data_venda: vendaData.data_venda || new Date().toISOString(),
        valor_venda: valor_total_venda,
        lucro_total: 0,
        valor_frete: valor_frete,
        valor_instalacao: totais.valor_instalacao,
        valor_entrada: valor_entrada,
        valor_a_receber: valor_a_receber,
        // Crédito a nível de venda
        valor_credito: valorCreditoVenda,
        percentual_credito: percentualCreditoVenda,
        // Campos de pagamento
        metodo_pagamento: metodoPrincipal,
        empresa_receptora_id: empresaReceptoraPrincipal,
        quantidade_parcelas: pagamentoData?.metodos?.[0]?.parcelas_boleto || pagamentoData?.metodos?.[0]?.parcelas_cartao || 1,
        pago_na_instalacao: false,
        pagamento_na_entrega: pagamentoData?.pagamento_na_entrega || false
      };

      console.log('📦 Venda payload:', vendaPayload);

      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert([vendaPayload])
        .select()
        .single();
      
      if (vendaError) throw vendaError;

      // 6. Criar produtos da venda (separando instalação como produto independente)
      const produtosComVendaId = portas.flatMap(produto => {
        const qty = produto.quantidade || 1;
        const valorInstalacao = produto.valor_instalacao || 0;
        const isPorta = produto.tipo_produto === 'porta_enrolar' || produto.tipo_produto === 'porta_social';
        // Apenas portas são divididas em N linhas (uma por porta) para permitir
        // medidas individuais. Demais tipos ficam em 1 linha com quantidade real.
        const baseSplit = {
          venda_id: venda.id,
          tipo_produto: produto.tipo_produto,
          tamanho: produto.tamanho || '',
          cor_id: produto.cor_id || null,
          acessorio_id: produto.acessorio_id || null,
          adicional_id: produto.adicional_id || null,
          valor_produto: produto.valor_produto,
          valor_pintura: produto.valor_pintura,
          valor_instalacao: isPorta ? 0 : produto.valor_instalacao,
          valor_frete: produto.valor_frete,
          tipo_desconto: produto.tipo_desconto,
          desconto_percentual: produto.desconto_percentual,
          descricao: produto.tipo_produto === 'porta_enrolar' ? 'Porta de Enrolar' : (produto.descricao || null),
          valor_credito: produto.valor_credito || 0,
          percentual_credito: produto.percentual_credito || 0,
        };
        const items = isPorta
          ? Array.from({ length: qty }, () => ({
              ...baseSplit,
              quantidade: 1,
              desconto_valor: produto.tipo_desconto === 'valor'
                ? (produto.desconto_valor || 0) / qty
                : produto.desconto_valor,
              observacao_item: produto.observacao_item || null,
            }))
          : [{
              ...baseSplit,
              quantidade: qty,
              desconto_valor: produto.desconto_valor,
              observacao_item: produto.observacao_item || null,
            }];
        
        // Se é porta com instalação, criar produto separado de instalação
        if (isPorta && valorInstalacao > 0) {
          const instalacaoItems = Array.from({ length: qty }, () => ({
            venda_id: venda.id,
            tipo_produto: 'instalacao' as const,
            tamanho: produto.tamanho || '',
            cor_id: null,
            acessorio_id: null,
            adicional_id: null,
            valor_produto: valorInstalacao,
            valor_pintura: 0,
            valor_instalacao: 0,
            valor_frete: 0,
            tipo_desconto: 'percentual' as const,
            desconto_percentual: 0,
            desconto_valor: 0,
            quantidade: 1,
            descricao: 'Instalação',
            valor_credito: 0,
            percentual_credito: 0,
            observacao_item: produto.observacao_item || null,
          }));
          items.push(...instalacaoItems);
        }
        
        return items;
      });
      
      const { error: produtosError } = await supabase
        .from('produtos_vendas')
        .insert(produtosComVendaId);
      
      if (produtosError) throw produtosError;

      // 7. GERAR CONTAS A RECEBER baseado nos métodos de pagamento
      if (pagamentoData) {
        const metodosParaProcessar = pagamentoData.usar_dois_metodos 
          ? pagamentoData.metodos.filter(m => m.tipo)
          : [pagamentoData.metodos[0]].filter(m => m.tipo);
        
        // Offset acumulado de numero_parcela para que múltiplos métodos não gerem
        // parcelas com numero_parcela repetido (ex.: entrada à vista = 1, restante = 2,3,...).
        let offsetParcela = 0;
        for (const metodo of metodosParaProcessar) {
          if (!metodo.tipo || metodo.valor <= 0) continue;
          
          const dataBase = metodo.data_pagamento || new Date(vendaData.data_venda || new Date().toISOString());
          
          const qtdGerada = await gerarContasReceberPorMetodo(venda.id, metodo, dataBase, offsetParcela);
          offsetParcela += qtdGerada;
        }
        
        // Upload de comprovantes (para à vista ou qualquer método marcado como já pago)
        for (const metodo of metodosParaProcessar) {
          if ((metodo.tipo === 'a_vista' || metodo.ja_pago) && metodo.comprovante_file) {
            const fileName = `${venda.id}/${Date.now()}_${metodo.comprovante_file.name}`;
            
            const { error: uploadError } = await supabase.storage
              .from('comprovantes-pagamento')
              .upload(fileName, metodo.comprovante_file);
            
            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('comprovantes-pagamento')
                .getPublicUrl(fileName);
              
              await supabase
                .from('vendas')
                .update({ 
                  comprovante_url: urlData.publicUrl,
                  comprovante_nome: metodo.comprovante_file.name 
                })
                .eq('id', venda.id);
            } else {
              console.error('Erro ao fazer upload do comprovante:', uploadError);
            }
          }
        }
      }

      // 8. Atualizar instalação criada automaticamente pelo trigger
      const tamanhosConcatenados = portas.map(p => p.tamanho).join(', ');
      
      const updateData: any = { 
        tamanho: tamanhosConcatenados,
        saldo: valor_a_receber
      };
      if (vendaData.data_prevista_entrega) {
        updateData.data_instalacao = vendaData.data_prevista_entrega;
      }
      if (vendaData.tipo_entrega) {
        updateData.categoria = vendaData.tipo_entrega.toLowerCase();
      }
      
      const { error: instalacaoError } = await supabase
        .from('instalacoes')
        .update(updateData)
        .eq('venda_id', venda.id);

      if (instalacaoError) {
        console.error('Erro ao atualizar instalação:', instalacaoError);
      }

      // 9. Salvar autorização de desconto, se houver
      if (autorizacaoDesconto) {
        const { error: autorizacaoError } = await supabase
          .from('vendas_autorizacoes_desconto')
          .insert([{
            venda_id: venda.id,
            percentual_desconto: autorizacaoDesconto.percentual_desconto,
            autorizado_por: autorizacaoDesconto.autorizado_por,
            solicitado_por: autorizacaoDesconto.solicitado_por,
            senha_usada: autorizacaoDesconto.senha_usada,
            tipo_autorizacao: autorizacaoDesconto.tipo_autorizacao,
            observacoes: autorizacaoDesconto.observacoes || null
          }]);

        if (autorizacaoError) {
          console.error('Erro ao salvar autorização:', autorizacaoError);
        }
      }

      // 10. Buscar a instalação para geocodificar
      const { data: instalacao } = await supabase
        .from('instalacoes')
        .select('id')
        .eq('venda_id', venda.id)
        .single();

      // 11. Chamar geocodificação
      if (instalacao && venda.cidade && venda.estado) {
        try {
          await supabase.functions.invoke('geocode-instalacao', {
            body: {
              id: instalacao.id,
              cidade: venda.cidade,
              estado: venda.estado
            }
          });
        } catch (geoError) {
          console.error('Erro na geocodificação:', geoError);
        }
      }

      return venda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['contador-vendas'] });
      queryClient.invalidateQueries({ queryKey: ['instalacoes'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: 'Sucesso',
        description: 'Venda criada com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar venda',
        description: error.message,
      });
    }
  });

  const deleteVendaMutation = useMutation({
    mutationFn: async (vendaId: string) => {
      // Usar a função RPC que exclui em cascata
      const { error } = await supabase.rpc('delete_venda_completa', {
        p_venda_id: vendaId
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['instalacoes'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['ordens'] });
      toast({
        title: 'Sucesso',
        description: 'Venda e todos os itens vinculados excluídos com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir venda',
        description: error.message,
      });
    }
  });

  const createRascunhoMutation = useMutation({
    mutationFn: async ({ 
      vendaData, 
      portas, 
      pagamentoData,
      creditoVenda
    }: { 
      vendaData: VendaFormData; 
      portas: ProdutoVenda[];
      pagamentoData?: PagamentoData;
      creditoVenda?: CreditoVenda;
    }) => {
      // 1. Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 2. Buscar admin_user correspondente
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, user_id, nome, email')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (adminError) throw new Error(`Erro ao buscar usuário: ${adminError.message}`);
      if (!adminUser) throw new Error('Usuário não encontrado no sistema.');

      // 3. Calcular totais
      const totais = portas.reduce((acc, produto) => {
        const valorBase = (produto.valor_produto + produto.valor_pintura + produto.valor_instalacao) * (produto.quantidade || 1);
        const descontoAplicado = produto.tipo_desconto === 'valor' 
          ? (produto.desconto_valor || 0)
          : valorBase * ((produto.desconto_percentual || 0) / 100);
        return {
          valor_produto: acc.valor_produto + (produto.valor_produto * (produto.quantidade || 1)),
          valor_pintura: acc.valor_pintura + (produto.valor_pintura * (produto.quantidade || 1)),
          valor_instalacao: acc.valor_instalacao + (produto.valor_instalacao * (produto.quantidade || 1)),
          valor_total: acc.valor_total + (valorBase - descontoAplicado)
        };
      }, { valor_produto: 0, valor_pintura: 0, valor_instalacao: 0, valor_total: 0 });

      const valorCreditoVenda = creditoVenda?.valorCredito || 0;
      const valor_frete = vendaData.valor_frete || 0;
      const valor_total_venda = totais.valor_total + valorCreditoVenda + valor_frete;
      const valor_entrada = vendaData.valor_entrada || 0;
      const valor_a_receber = valor_total_venda - valor_entrada;

      // 4. Criar venda como rascunho (sem validações obrigatórias)
      const { endereco, venda_presencial, cliente_id: _, ...vendaDataLimpo } = vendaData;
      const metodoPrincipal = pagamentoData?.metodos?.[0]?.tipo || vendaData.forma_pagamento;

      const vendaPayload = {
        ...vendaDataLimpo,
        is_rascunho: true,
        cpf_cliente: vendaData.cpf_cliente || null,
        atendente_id: adminUser.user_id,
        data_venda: vendaData.data_venda || new Date().toISOString(),
        valor_venda: valor_total_venda,
        lucro_total: 0,
        valor_frete: valor_frete,
        valor_instalacao: totais.valor_instalacao,
        valor_entrada: valor_entrada,
        valor_a_receber: valor_a_receber,
        valor_credito: valorCreditoVenda,
        percentual_credito: creditoVenda?.percentualCredito || 0,
        metodo_pagamento: metodoPrincipal,
        empresa_receptora_id: pagamentoData?.metodos?.[0]?.empresa_receptora_id || null,
        quantidade_parcelas: pagamentoData?.metodos?.[0]?.parcelas_boleto || pagamentoData?.metodos?.[0]?.parcelas_cartao || 1,
        pago_na_instalacao: false,
        pagamento_na_entrega: pagamentoData?.pagamento_na_entrega || false
      };

      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert([vendaPayload])
        .select()
        .single();
      
      if (vendaError) throw vendaError;

      // 5. Salvar produtos (se houver)
      if (portas.length > 0) {
        const produtosComVendaId = portas.flatMap(produto => {
          const qty = produto.quantidade || 1;
          const valorInstalacao = produto.valor_instalacao || 0;
          const isPorta = produto.tipo_produto === 'porta_enrolar' || produto.tipo_produto === 'porta_social';
          // Apenas portas são divididas em N linhas (uma por porta) para permitir
          // medidas individuais. Demais tipos ficam em 1 linha com quantidade real.
          const baseSplit = {
            venda_id: venda.id,
            tipo_produto: produto.tipo_produto,
            tamanho: produto.tamanho || '',
            cor_id: produto.cor_id || null,
            acessorio_id: produto.acessorio_id || null,
            adicional_id: produto.adicional_id || null,
            valor_produto: produto.valor_produto,
            valor_pintura: produto.valor_pintura,
            valor_instalacao: isPorta ? 0 : produto.valor_instalacao,
            valor_frete: produto.valor_frete,
            tipo_desconto: produto.tipo_desconto,
            desconto_percentual: produto.desconto_percentual,
            descricao: produto.tipo_produto === 'porta_enrolar' ? 'Porta de Enrolar' : (produto.descricao || null),
            valor_credito: produto.valor_credito || 0,
            percentual_credito: produto.percentual_credito || 0,
          };
          const items = isPorta
            ? Array.from({ length: qty }, () => ({
                ...baseSplit,
                quantidade: 1,
                desconto_valor: produto.tipo_desconto === 'valor'
                  ? (produto.desconto_valor || 0) / qty
                  : produto.desconto_valor,
              observacao_item: produto.observacao_item || null,
              }))
            : [{
                ...baseSplit,
                quantidade: qty,
                desconto_valor: produto.desconto_valor,
              observacao_item: produto.observacao_item || null,
              }];
          
          // Se é porta com instalação, criar produto separado de instalação
          if (isPorta && valorInstalacao > 0) {
            const instalacaoItems = Array.from({ length: qty }, () => ({
              venda_id: venda.id,
              tipo_produto: 'instalacao' as const,
              tamanho: produto.tamanho || '',
              cor_id: null,
              acessorio_id: null,
              adicional_id: null,
              valor_produto: valorInstalacao,
              valor_pintura: 0,
              valor_instalacao: 0,
              valor_frete: 0,
              tipo_desconto: 'percentual' as const,
              desconto_percentual: 0,
              desconto_valor: 0,
              quantidade: 1,
              descricao: 'Instalação',
              valor_credito: 0,
              percentual_credito: 0,
              observacao_item: produto.observacao_item || null,
            }));
            items.push(...instalacaoItems);
          }
          
          return items;
        });
        
        const { error: produtosError } = await supabase
          .from('produtos_vendas')
          .insert(produtosComVendaId);
        
        if (produtosError) throw produtosError;
      }

      return venda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['rascunhos-vendas'] });
      toast({
        title: 'Rascunho salvo',
        description: 'A venda foi salva como rascunho.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar rascunho',
        description: error.message,
      });
    }
  });

  return {
    vendas,
    isLoading,
    refetch,
    createVenda: createVendaMutation.mutateAsync,
    createRascunho: createRascunhoMutation.mutateAsync,
    deleteVenda: deleteVendaMutation.mutateAsync,
    isCreating: createVendaMutation.isPending,
    isCreatingRascunho: createRascunhoMutation.isPending,
    isDeleting: deleteVendaMutation.isPending
  };
}

// Função auxiliar para gerar contas a receber por método
async function gerarContasReceberPorMetodo(
  vendaId: string, 
  metodo: MetodoPagamento, 
  dataBase: Date,
  offset: number = 0
): Promise<number> {
  const parcelas: any[] = [];
  
  switch (metodo.tipo) {
    case 'boleto': {
      const valorParcela = metodo.valor / metodo.parcelas_boleto;
      for (let i = 0; i < metodo.parcelas_boleto; i++) {
        const dataVencimento = addDays(dataBase, metodo.intervalo_boletos * i);
        const dataVenc = dataVencimento.toISOString().split('T')[0];
        parcelas.push({
          venda_id: vendaId,
          numero_parcela: offset + i + 1,
          valor_parcela: valorParcela,
          data_vencimento: dataVenc,
          metodo_pagamento: 'boleto',
          empresa_receptora_id: metodo.empresa_receptora_id || null,
          status: metodo.ja_pago ? 'pago' : 'pendente',
          ...(metodo.ja_pago ? { data_pagamento: dataVenc, valor_pago: valorParcela } : {})
        });
      }
      break;
    }
    
    case 'cartao_credito': {
      const valorParcela = metodo.valor / metodo.parcelas_cartao;
      for (let i = 0; i < metodo.parcelas_cartao; i++) {
        const dataVencimento = addDays(dataBase, 30 * i);
        const dataVenc = dataVencimento.toISOString().split('T')[0];
        parcelas.push({
          venda_id: vendaId,
          numero_parcela: offset + i + 1,
          valor_parcela: valorParcela,
          data_vencimento: dataVenc,
          metodo_pagamento: 'cartao_credito',
          empresa_receptora_id: metodo.empresa_receptora_id || null,
          status: metodo.ja_pago ? 'pago' : 'pendente',
          ...(metodo.ja_pago ? { data_pagamento: dataVenc, valor_pago: valorParcela } : {})
        });
      }
      break;
    }
    
    case 'dinheiro': {
      const dataVenc = dataBase.toISOString().split('T')[0];
      parcelas.push({
        venda_id: vendaId,
        numero_parcela: offset + 1,
        valor_parcela: metodo.valor,
        data_vencimento: dataVenc,
        metodo_pagamento: 'dinheiro',
        empresa_receptora_id: metodo.empresa_receptora_id || null,
        status: metodo.ja_pago ? 'pago' : 'pendente',
        ...(metodo.ja_pago ? { data_pagamento: dataVenc, valor_pago: metodo.valor } : {})
      });
      break;
    }
    
    case 'a_vista': {
      // À vista gera 1 conta já paga
      parcelas.push({
        venda_id: vendaId,
        numero_parcela: offset + 1,
        valor_parcela: metodo.valor,
        data_vencimento: dataBase.toISOString().split('T')[0],
        data_pagamento: dataBase.toISOString().split('T')[0],
        valor_pago: metodo.valor,
        metodo_pagamento: 'a_vista',
        empresa_receptora_id: metodo.empresa_receptora_id || null,
        status: 'pago'
      });
      break;
    }
  }
  
  if (parcelas.length > 0) {
    const { error } = await supabase
      .from('contas_receber')
      .insert(parcelas);
    
    if (error) {
      console.error('Erro ao criar contas a receber:', error);
    }
  }
  
  return parcelas.length;
}
