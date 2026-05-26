## Centralizar tabs na tela /admin/users

Atualmente o componente `TabsList` em `AdminUsersMinimalista.tsx` (linha 448) não possui centralização. Para alinhar as abas ao centro da tela, adicionar classes utilitárias ao `TabsList`:

- `mx-auto w-fit` — centraliza horizontalmente o contêiner de tabs dentro do layout
- `flex` + `justify-center` — caso necessário para garantir alinhamento interno

Aplicar diretamente na linha do `TabsList` sem alterar o conteúdo das abas ou o indicador animado.