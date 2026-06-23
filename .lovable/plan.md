## Geração de Contrato do Autorizado

Adicionar funcionalidade para gerar PDF do "Termo de Parceria com Instalador Autorizado" preenchido com os dados do autorizado selecionado.

### 1. Banco de dados
- Migration: adicionar coluna `cpf_cnpj text` na tabela `autorizados` (nullable).

### 2. Cadastro do Autorizado
- Adicionar campo "CPF/CNPJ" no formulário de criação/edição de autorizado (telas: `NovoAutorizadoDirecao`, `EditarAutorizadoDirecao` e qualquer dialog usado em `/autorizados`). Campo opcional, com máscara automática (CPF se ≤11 dígitos, CNPJ se 14).

### 3. Geração do PDF
- Novo util `src/utils/contratoAutorizadoPDFGenerator.ts` usando `jsPDF` (já no projeto), no mesmo padrão do `contratoPDFGenerator.ts`:
  - Cabeçalho com logo Elisa + dados da empresa (`company_settings`).
  - Título: "TERMO DE PARCERIA COM INSTALADOR AUTORIZADO".
  - Corpo fixo do contrato (texto enviado no .docx), com substituição de:
    - `{{parceiro_nome}}` → nome do autorizado
    - `{{parceiro_cpf_cnpj}}` → CPF/CNPJ (ou linhas em branco se vazio)
    - `{{cidade_data}}` → "Caxias do Sul/RS, DD de Mês de AAAA" (data atual)
  - Seções numeradas 1 a 5 (Objeto, Responsabilidades, Autonomia, Identificação, Vigência).
  - Bloco de assinaturas: Grupo Elisa (esquerda) + Parceiro Autorizado com nome + CPF/CNPJ (direita).
  - Footer com site/email/telefone e paginação.
  - Nome do arquivo: `contrato_parceria_{nome_slug}_{timestamp}.pdf`.

### 4. Botões de ação
- **Card do autorizado** (`AutorizadosGrid.tsx`, `AutorizadosList.tsx`, `AutorizadosKanban.tsx`): novo ícone `FileSignature` ao lado de visualizar/editar, com tooltip "Gerar Contrato de Parceria".
- **Página de detalhes** (`AutorizadoNegociacao.tsx`): botão "Gerar Contrato" no header.
- Ao clicar: busca dados completos do autorizado + `company_settings` e chama o gerador. Se `cpf_cnpj` estiver vazio, exibe `toast.warning` informando que o PDF será gerado com campo em branco mas permite seguir.

### 5. Detalhes técnicos
- Sem alterações em storage ou tabela de contratos — apenas download direto.
- Reaproveitar `useCompanySettings` para puxar dados da empresa.
- Datas formatadas em pt-BR.
- Sem mudanças em RLS (apenas nova coluna).
