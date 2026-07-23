import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const CAPITAIS: Record<string, { nome: string; lat: number; lon: number }> = {
  AC: { nome: 'Rio Branco', lat: -9.9747, lon: -67.8100 },
  AL: { nome: 'Maceió', lat: -9.6658, lon: -35.7350 },
  AP: { nome: 'Macapá', lat: 0.0349, lon: -51.0694 },
  AM: { nome: 'Manaus', lat: -3.1190, lon: -60.0217 },
  BA: { nome: 'Salvador', lat: -12.9714, lon: -38.5014 },
  CE: { nome: 'Fortaleza', lat: -3.7319, lon: -38.5267 },
  DF: { nome: 'Brasília', lat: -15.7939, lon: -47.8828 },
  ES: { nome: 'Vitória', lat: -20.3155, lon: -40.3128 },
  GO: { nome: 'Goiânia', lat: -16.6869, lon: -49.2648 },
  MA: { nome: 'São Luís', lat: -2.5307, lon: -44.3068 },
  MT: { nome: 'Cuiabá', lat: -15.6014, lon: -56.0979 },
  MS: { nome: 'Campo Grande', lat: -20.4697, lon: -54.6201 },
  MG: { nome: 'Belo Horizonte', lat: -19.9167, lon: -43.9345 },
  PA: { nome: 'Belém', lat: -1.4558, lon: -48.5039 },
  PB: { nome: 'João Pessoa', lat: -7.1195, lon: -34.8450 },
  PR: { nome: 'Curitiba', lat: -25.4284, lon: -49.2733 },
  PE: { nome: 'Recife', lat: -8.0476, lon: -34.8770 },
  PI: { nome: 'Teresina', lat: -5.0919, lon: -42.8034 },
  RJ: { nome: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
  RN: { nome: 'Natal', lat: -5.7945, lon: -35.2110 },
  RS: { nome: 'Porto Alegre', lat: -30.0346, lon: -51.2177 },
  RO: { nome: 'Porto Velho', lat: -8.7612, lon: -63.9004 },
  RR: { nome: 'Boa Vista', lat: 2.8235, lon: -60.6758 },
  SC: { nome: 'Florianópolis', lat: -27.5949, lon: -48.5482 },
  SP: { nome: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  SE: { nome: 'Aracaju', lat: -10.9472, lon: -37.0731 },
  TO: { nome: 'Palmas', lat: -10.1841, lon: -48.3335 },
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

async function geocode(cidade: string, uf: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(cidade)}&state=${encodeURIComponent(uf)}&country=Brasil&format=json&limit=1`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ElisaPortasApp/1.0 (contato@elisaportas.com.br)' },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return null
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
}

async function osrmDistance(
  lat1: number, lon1: number, lat2: number, lon2: number,
): Promise<number | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const meters = data?.routes?.[0]?.distance
    if (typeof meters !== 'number') return null
    return meters / 1000
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const cidade = String(body?.cidade ?? '').trim()
    const estado = String(body?.estado ?? '').trim().toUpperCase()

    if (!cidade || !estado || !CAPITAIS[estado]) {
      return new Response(
        JSON.stringify({ error: 'cidade e estado (UF válida) são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const capital = CAPITAIS[estado]

    // Se a própria cidade é a capital
    if (cidade.toLowerCase() === capital.nome.toLowerCase()) {
      return new Response(
        JSON.stringify({ km: 0, capital: capital.nome, aproximado: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const dest = await geocode(cidade, estado)
    if (!dest) {
      return new Response(
        JSON.stringify({ error: `Não foi possível localizar ${cidade}/${estado}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let km = await osrmDistance(capital.lat, capital.lon, dest.lat, dest.lon)
    let aproximado = false
    if (km == null) {
      km = haversine(capital.lat, capital.lon, dest.lat, dest.lon) * 1.3 // fator rodoviário
      aproximado = true
    }

    return new Response(
      JSON.stringify({ km: Math.round(km), capital: capital.nome, aproximado }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})