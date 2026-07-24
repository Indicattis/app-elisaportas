import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const UFS = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const estado = String(body?.estado ?? '').trim().toUpperCase()

    if (!estado || !UFS.has(estado)) {
      return new Response(
        JSON.stringify({ error: 'UF inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`
    const res = await fetch(url)
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `IBGE respondeu ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const data = await res.json()
    const cidades: string[] = Array.isArray(data)
      ? data.map((m: any) => String(m?.nome ?? '')).filter(Boolean)
      : []

    cidades.sort((a, b) => a.localeCompare(b, 'pt-BR'))

    return new Response(
      JSON.stringify({ estado, total: cidades.length, cidades }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})