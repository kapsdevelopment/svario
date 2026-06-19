import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const productionOrigin = "https://svario.no"
const brregEntityUrl = "https://data.brreg.no/enhetsregisteret/api/enheter"

type BrregEntityResponse = {
  organisasjonsnummer?: unknown
  navn?: unknown
  organisasjonsform?: {
    kode?: unknown
    beskrivelse?: unknown
  }
  forretningsadresse?: {
    kommune?: unknown
    poststed?: unknown
  }
  postadresse?: {
    kommune?: unknown
    poststed?: unknown
  }
  slettedato?: unknown
  konkurs?: unknown
  underAvvikling?: unknown
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ message: "Method not allowed." }, 405, corsHeaders)
  }

  const authError = await requireAuthenticatedUser(req)

  if (authError) {
    return json({ message: authError }, 401, corsHeaders)
  }

  const body = await readJsonBody(req)
  const organizationNumber = readString(body.organizationNumber)?.replace(
    /\D/g,
    "",
  )

  if (!organizationNumber || !/^[0-9]{9}$/.test(organizationNumber)) {
    return json(
      { message: "Organisasjonsnummeret må være 9 siffer." },
      400,
      corsHeaders,
    )
  }

  const response = await fetch(`${brregEntityUrl}/${organizationNumber}`, {
    headers: {
      Accept: "application/json",
    },
  })

  if (response.status === 404) {
    return json(
      { message: "Fant ingen bedrift med dette organisasjonsnummeret." },
      404,
      corsHeaders,
    )
  }

  if (response.status === 410) {
    return json(
      { message: "Denne enheten er fjernet fra BRREG av juridiske årsaker." },
      410,
      corsHeaders,
    )
  }

  if (response.status === 400) {
    return json(
      { message: "Organisasjonsnummeret må være 9 siffer." },
      400,
      corsHeaders,
    )
  }

  if (!response.ok) {
    console.error("lookup-organization BRREG request failed", response.status)
    return json(
      { message: "Kunne ikke hente bedriften fra BRREG akkurat nå." },
      502,
      corsHeaders,
    )
  }

  const entity = (await response.json()) as BrregEntityResponse
  const name = readString(entity.navn)
  const returnedOrganizationNumber = readString(entity.organisasjonsnummer)

  if (!name || returnedOrganizationNumber !== organizationNumber) {
    return json(
      { message: "BRREG returnerte ikke en gyldig bedrift." },
      502,
      corsHeaders,
    )
  }

  const address = entity.forretningsadresse ?? entity.postadresse

  return json(
    {
      organizationNumber: returnedOrganizationNumber,
      name,
      organizationFormCode: readString(entity.organisasjonsform?.kode),
      organizationFormDescription: readString(
        entity.organisasjonsform?.beskrivelse,
      ),
      municipality: readString(address?.kommune),
      postalPlace: readString(address?.poststed),
      isDeleted: Boolean(readString(entity.slettedato)),
      isBankrupt: entity.konkurs === true,
      isUnderLiquidation: entity.underAvvikling === true,
    },
    200,
    corsHeaders,
  )
})

async function requireAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? ""

  if (!authHeader.trim()) {
    return "Missing authorization token."
  }

  const supabaseUrl = requireEnv("SUPABASE_URL")
  const anonKey = requireEnv("SUPABASE_ANON_KEY")
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return "Invalid authorization token."
  }

  return null
}

async function readJsonBody(req: Request) {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin")
  const allowOrigin = isAllowedOrigin(origin) ? origin : productionOrigin

  return {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
  }
}

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) {
    return false
  }

  if (origin === productionOrigin) {
    return true
  }

  try {
    const url = new URL(origin)
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    )
  } catch {
    return false
  }
}

function json(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return Response.json(body, {
    headers: corsHeaders,
    status,
  })
}

function readString(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function requireEnv(name: string) {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`Missing ${name}.`)
  }

  return value
}
