# Autocompletar endereço via CEP no formulário de empresa

## Objetivo
Em `/administrativo/empresas/nova` (e edição), ao digitar o CEP completo, buscar automaticamente o endereço via ViaCEP e preencher os campos Logradouro, Bairro, Cidade e Estado.

## Passos

### `src/components/admin/EmpresaEmissoraForm.tsx`
1. Adicionar função `buscarCep(cep)` que:
   - Remove não-dígitos; só dispara se `length === 8`.
   - Faz `fetch('https://viacep.com.br/ws/{cep}/json/')`.
   - Em sucesso, usa `setValue` para preencher `endereco` (logradouro), `bairro`, `cidade`, `estado` (uppercase) — apenas se o campo estiver vazio (não sobrescreve o que o usuário já digitou).
   - Mostra `toast.error` se CEP não encontrado / falha de rede.
   - Estado `buscandoCep` para feedback visual.
2. Adicionar máscara `formatCep` no `onChange` do input de CEP (formato `00000-000`).
3. Disparar `buscarCep` automaticamente no `onBlur` do input e também quando 8 dígitos forem digitados.
4. Foco depois move para o campo `numero` após sucesso (UX padrão).

## Detalhes técnicos
- Reutiliza o padrão já usado em `src/components/instalacoes/InstalacaoForm.tsx`.
- Sem mudanças de banco, edge function ou tipos.
- ViaCEP é API pública gratuita, sem chave.

## Arquivos alterados
- `src/components/admin/EmpresaEmissoraForm.tsx`
