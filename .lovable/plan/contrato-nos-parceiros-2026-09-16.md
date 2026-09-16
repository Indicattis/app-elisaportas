# Contrato nos parceiros

## Objetivo
Permitir anexar e administrar um contrato atual para cada **Autorizado, Representante e Franqueado** em `/direcao/vendas/parceiros`.

## Implementação
- Exibir em cada parceiro um indicador claro de contrato anexado ou pendente.
- Incluir, nos formulários rápidos de edição das três abas, uma área de contrato com estas ações:
  - anexar arquivo PDF;
  - visualizar o contrato atual;
  - substituir por outro PDF;
  - remover o contrato, com confirmação.
- Manter somente um contrato atual por parceiro e mostrar nome e tamanho do arquivo durante a gestão.
- Reaproveitar o fluxo existente dos Autorizados e Franqueados, que já possuem campos de contrato.
- Adicionar aos Representantes os mesmos dados de contrato: arquivo, nome, tamanho e data de envio.
- Atualizar imediatamente a linha e o formulário após anexar, substituir ou remover, com mensagens de sucesso e erro.

## Dados e segurança
- Armazenar os arquivos no espaço de contratos de parceiros já adotado pelo sistema, com caminho separado por tipo e identificador do parceiro para evitar colisões.
- Restringir upload, leitura, substituição e remoção a usuários autenticados com acesso à gestão de parceiros.
- Ao substituir ou remover, apagar também o arquivo anterior para evitar documentos órfãos.
- Validar PDF e limite de 20 MB antes do envio.

## Verificação
- Testar o ciclo completo nas três abas: anexar, visualizar, substituir e remover.
- Confirmar que o estado do contrato permanece correto após fechar e reabrir o formulário.
- Conferir permissões, mensagens de erro e visualização em telas menores.
