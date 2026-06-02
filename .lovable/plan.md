## Objetivo

Adicionar um botão **"Contratos"** no hub `/vendas` que abra uma página onde o usuário escolhe uma venda existente, revisa/edita os campos amarelos do modelo "CONTRATO GRUPO ELISA" e gera um PDF. Cada PDF gerado fica salvo no histórico vinculado à venda.

## Mudanças

### 1. Hub `/vendas` (`src/pages/vendas/VendasHub.tsx`)
- Acrescenta item de menu **Contratos** (ícone `FileSignature`) apontando para `/vendas/contratos`.

### 2. Nova rota `/vendas/contratos` (`src/pages/vendas/ContratosVendas.tsx`)
Lista as vendas do atendente logado com busca por cliente/CPF. Cada linha tem:
- Botão **Gerar Contrato** → abre modal de edição.
- Lista expansível com contratos já gerados para a venda (download / excluir), reutilizando a tabela `contratos_vendas` existente.

Registrar a rota em `src/App.tsx` (lazy import, dentro do mesmo guard de `/vendas`).

### 3. Modal de edição (`src/components/contratos/GerarContratoElisaModal.tsx`)
Pré-preenche os campos a partir da venda (cliente, endereço, CPF/CNPJ, valor total, forma de pagamento, lista de produtos) e mostra um formulário com os blocos amarelos editáveis:

- Comprador (nome, CPF/CNPJ, endereço completo) — pré-preenchidos
- Quantidade de portas e descrição do material — pré-preenchidos da venda
- Quantidade de motores e detalhes (kg, RPM)
- Cor da pintura (ou "GALVANIZADA")
- Dimensões da porta
- Valor total (pré-preenchido)
- Condições de pagamento (texto livre, pré-preenchido com forma/parcelas da venda)
- Cidade/data do fechamento

Botão **Gerar e Salvar Contrato** → gera PDF, faz upload no bucket `contratos-vendas` e insere registro em `contratos_vendas` (reusa `useContratosVendas.uploadContrato`).

### 4. Gerador de PDF (`src/utils/contratoElisaPDFGenerator.ts`)
Função nova `generateContratoElisaPDF(dados)` usando jsPDF com o texto fixo das 13 cláusulas do modelo anexado. As lacunas amarelas são injetadas a partir do formulário. Inclui:
- Header com logo + dados do GRUPO ELISA (CNPJ 20.462.028/0001-58, endereço fixo do contrato).
- Cláusulas 1 a 13 (texto literal do anexo).
- Bloco final com cidade, data, assinaturas de VENDEDOR / COMPRADOR e duas testemunhas.
- Footer com numeração de páginas.

Retorna `Blob` (para subir no storage) e também aciona download local.

### 5. Sem mudanças de banco
Aproveita a tabela `contratos_vendas` e o bucket `contratos-vendas` que já existem (memória `assinatura-contrato`). O `template_id` fica nulo (contrato gerado de modelo fixo, não da tabela `contratos_templates`).

## Detalhes técnicos

- Mapeamento dos campos amarelos:
  | Amarelo do modelo | Origem |
  |---|---|
  | Nome + CPF/CNPJ + endereço comprador | `vendas.cliente_nome`, `cpf_cliente`, `endereco/bairro/cidade/cep` |
  | Qtd. de portas | soma de `produtos_vendas.quantidade` onde `tipo_produto='porta'` |
  | Material detalhado | descrição dos itens da venda |
  | Qtd. de motores | input manual (pré: nº de portas) |
  | Cor | `produtos_vendas.cor` (via `catalogo_cores`) ou "GALVANIZADA" |
  | Dimensões | concat de `largura x altura` dos itens porta |
  | Valor total | `vendas.valor_venda` |
  | Condição de pagamento | texto livre, pré-preenchido com `forma_pagamento` + `numero_parcelas` |

- Tipografia/estilo: helvetica 10pt corpo, 14pt títulos de cláusula, margens 20mm, A4. Texto justificado via `splitTextToSize`.
- Aestética visual da página (lista/modal): glassmorphism padrão do projeto (`bg-white/5`, `backdrop-blur-xl`, `border-white/10`, gradiente azul).
- Nome do arquivo: `contrato-elisa-{venda_id8}-{timestamp}.pdf`.

## Fora do escopo
- Não mexer no fluxo de "Assinatura Contrato" existente (`vendas.contrato_url`). Esse continua sendo upload manual do contrato assinado.
- Não criar editor de template (modelo é fixo neste contrato).
- Não criar nova tabela nem alterar schema.
