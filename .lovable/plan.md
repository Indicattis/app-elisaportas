## Objetivo
Em `/logistica/frete/internos`, adicionar em cada linha um botão para **recalcular o Km automaticamente** como a distância rodoviária da **capital do estado até a cidade** do frete.

## Escopo

### 1. Edge function `recalcular-km-frete`
Nova função Supabase que, dado `{ cidade, estado }`, retorna a distância (km) da capital do estado até a cidade.
- **Capital do estado**: hardcoded — mapa `UF → { capital, lat, lon }` para as 27 UFs (evita geocodar duas vezes).
- **Geocodificação da cidade destino**: Nominatim (OpenStreetMap) via `https://nominatim.openstreetmap.org/search?city=...&state=...&country=Brasil&format=json&limit=1` com `User-Agent` identificando o app.
- **Distância rodoviária**: OSRM público `https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false` — usa `routes[0].distance` (metros) → `km = round(distance / 1000)`.
- Fallback: se OSRM falhar, calcular Haversine (linha reta) e retornar com flag `aproximado: true`.
- Validação Zod da entrada; CORS habilitado; retorna `{ km, capital, aproximado }`.
- Sem segredos necessários (APIs públicas).

### 2. UI em `FreteMinimalista.tsx`
- Adicionar botão **↻ (RefreshCw)** nas ações da linha, ao lado dos botões Editar/Excluir.
- Ao clicar:
  1. Mostra spinner na linha.
  2. Chama a edge function.
  3. Faz `updateFrete({ id, quilometragem: km })` (usa mutação já existente).
  4. Toast: "Km recalculado: {capital} → {cidade} = {km} km" (ou aviso se aproximado).
- Botão desabilitado enquanto a chamada está em andamento; erros exibidos via toast.

### 3. Ação em lote (opcional, incluída)
Botão no header **"Recalcular todos os Km"** que percorre as cidades filtradas (com throttle de ~1 req/s para respeitar Nominatim), útil quando o usuário quer padronizar a base. Mostra progresso via toast.

## Fora do escopo
- Não altera a fórmula do valor (segue `km × 6`).
- Não muda o schema — apenas atualiza `quilometragem` da linha.
