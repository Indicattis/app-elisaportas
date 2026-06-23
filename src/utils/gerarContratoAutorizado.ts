import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateContratoAutorizadoPDF } from './contratoAutorizadoPDFGenerator';

export async function gerarContratoAutorizado(autorizadoId: string) {
  try {
    const [{ data: aut, error: e1 }, { data: company, error: e2 }] = await Promise.all([
      supabase.from('autorizados').select('nome, cpf_cnpj').eq('id', autorizadoId).maybeSingle(),
      supabase.from('company_settings').select('*').limit(1).maybeSingle(),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    if (!aut) throw new Error('Autorizado não encontrado');

    const companyInfo = {
      nome: company?.nome || 'GRUPO ELISA LTDA',
      cnpj: company?.cnpj || '20.462.028/0001-58',
      endereco: company?.endereco || '',
      cidade: company?.cidade || 'Caxias do Sul/RS',
      cep: company?.cep || '',
      telefone: company?.telefone,
      email: company?.email,
      site: company?.site,
    };

    if (!(aut as any).cpf_cnpj) {
      toast.warning('Autorizado sem CPF/CNPJ cadastrado — o contrato será gerado com o campo em branco.');
    }

    generateContratoAutorizadoPDF(
      { nome: aut.nome, cpf_cnpj: (aut as any).cpf_cnpj ?? null },
      companyInfo,
    );
    toast.success('Contrato gerado!');
  } catch (err: any) {
    console.error('Erro ao gerar contrato:', err);
    toast.error(err?.message || 'Erro ao gerar contrato do autorizado');
  }
}