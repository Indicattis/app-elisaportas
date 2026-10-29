# Registro de KM de Fretes (motorista Rheno)

## O que o usuário vai ver
- Novo botão **"Registro de KM"** em /logistica, abrindo /logistica/registro-km.
- Página com 3 cartões no topo: **Total de viagens**, **Total de adiantamentos**, **Saldo** (verde = empresa deve pagar o motorista; vermelho = motorista em débito), com a mesma explicação da planilha.
- Seletor de motorista (Rheno Pescador já cadastrado, com chave Pix 200.451.740-91; Diogo Pescador 021.680.360-80 como Pix secundária).
- Duas tabelas lado a lado:
  - **Viagens**: Cidade, Data, Quilometragem, Valor por KM, Valor da viagem (calculado = KM x valor/KM, editável), Status do valor (pendente/pago).
  - **Adiantamentos**: Data, Valor.
- Botões para adicionar, editar e excluir linhas; filtro por período.
- Exportar em PDF/Excel no mesmo formato da planilha.

## Dados já cadastrados
- Todas as linhas das duas abas da planilha: "Registro de Fretes" (fev/2026 em diante) e "Registro de KM (Fase de Teste)" (jan/2026), viagens e adiantamentos, preservando os valores da planilha (inclusive viagens com KM vazio ou 0).

## Permissões
- Rota adicionada em /admin/permissions no grupo Logística, liberada para quem já acessa /logistica.

## Detalhes técnicos
- Tabelas: `motoristas_frete` (nome, pix, pix_secundario_nome/pix), `registro_km_viagens` (motorista_id, cidade, data, km, valor_km, valor_viagem, status, origem_aba), `registro_km_adiantamentos` (motorista_id, data, valor). GRANTs + RLS para authenticated, trigger updated_at.
- Importação via script lendo o xlsx e gerando INSERTs (datas com T12:00:00).
- Página `src/pages/logistica/RegistroKmPage.tsx` em MinimalistLayout, estética glass; rota em App.tsx com ProtectedRoute; item em LogisticaHub.tsx; registro em app_routes + user_route_access.
