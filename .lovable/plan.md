## Objetivo

Permitir que o vendedor clique em um Autorizado em **Meus Parceiros** e abra uma nova página para editar o cadastro básico desse parceiro.

## Escopo

- Apenas parceiros do tipo **autorizado** abrem a página de edição. Representante e Franqueado continuam sem ação ao clicar (ou navegam para visualização atual, sem alteração).
- A página reaproveita `EditarAutorizadoDirecao.tsx` numa nova rota acessível ao vendedor, com modo "vendedor" que oculta campos sensíveis.
- Vendedor só consegue abrir/editar autorizados onde ele é o `vendedor_id`.

## Mudanças

### 1. Nova rota em `src/App.tsx`
```
/vendas/meus-parceiros/:id/editar  →  EditarAutorizadoDirecao (modo vendedor)
```
Protegida por `ProtectedRoute` com a mesma `routeKey` usada por Meus Parceiros (ex.: `vendas_meus_parceiros`). Sem exigir `logistica_autorizados`.

### 2. `EditarAutorizadoDirecao.tsx` — modo vendedor
- Detectar contexto via `useLocation().pathname.startsWith('/vendas/meus-parceiros')` → `isVendedorMode = true`.
- Quando `isVendedorMode`:
  - Ao carregar o autorizado, verificar se `vendedor_id` corresponde ao `admin_users.id` do usuário logado. Se não, redirecionar para `/vendas/meus-parceiros` com toast "Sem permissão".
  - Ocultar/desabilitar campos sensíveis:
    - Etapa (Select)
    - Vendedor Responsável
    - Vendedor (dono)
    - Status Ativo (Switch)
    - Chave PIX
    - Seção de Contrato (`ContratoUpload`)
    - Seção de cidades secundárias / preços (se existirem na página)
  - Mostrar apenas: Logo, Nome, Responsável, E-mail, Telefone, WhatsApp, CEP, Estado, Cidade.
  - Breadcrumb e botão "Voltar" apontam para `/vendas/meus-parceiros`.
  - Header/título: "Editar Meu Autorizado".
- No `update` do submit, enviar apenas os campos permitidos quando `isVendedorMode`.

### 3. `src/pages/vendas/MeusParceiros.tsx`
- Trocar o `navigate` da linha:
  - Se `tipo === 'autorizado'` → `/vendas/meus-parceiros/${id}/editar`.
  - Caso contrário, manter comportamento atual (ou remover cursor-pointer/ArrowRight para outros tipos — manter por ora).
- Botão de transferência (UserCheck) continua funcionando via `stopPropagation`.

## Detalhes técnicos

- A checagem de propriedade usa: `admin_users` → `id` via `user_id = auth.uid()`, comparando com `autorizado.vendedor_id`. Mesmo padrão já usado na query de Meus Parceiros.
- RLS de `autorizados`: validar que policies de UPDATE permitem o vendedor atualizar o próprio autorizado. Caso negue, criar policy:
  ```sql
  CREATE POLICY "Vendedor edita seu autorizado"
  ON public.autorizados FOR UPDATE TO authenticated
  USING (vendedor_id = (SELECT id FROM admin_users WHERE user_id = auth.uid()))
  WITH CHECK (vendedor_id = (SELECT id FROM admin_users WHERE user_id = auth.uid()));
  ```
  Confirmar policies atuais antes de criar nova (somente se faltar).

## Fora de escopo

- Mudar etapa/vendedor/contrato/preços pelo vendedor.
- Criar novo autorizado pelo vendedor.
- Edição de representantes e franqueados.
