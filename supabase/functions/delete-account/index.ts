import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const productionOrigin = "https://svario.no"

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ message: "Method not allowed." }, 405, corsHeaders)
  }

  const authHeader = req.headers.get("Authorization") ?? ""
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()

  if (!token) {
    return json({ message: "Missing authorization token." }, 401, corsHeaders)
  }

  const supabaseUrl = requireEnv("SUPABASE_URL")
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY")

  if (!serviceKey) {
    return json(
      { message: "Server is missing service credentials." },
      500,
      corsHeaders,
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data: userResult, error: userError } =
    await supabaseAdmin.auth.getUser(token)
  const user = userResult.user

  if (userError || !user) {
    return json({ message: "Invalid authorization token." }, 401, corsHeaders)
  }

  const { error: deleteDataError } = await supabaseAdmin.rpc(
    "delete_account_data_for_auth_user",
    { p_auth_user_id: user.id },
  )

  if (deleteDataError) {
    console.error("delete-account data deletion failed", deleteDataError)
    return json({ message: "Could not delete account data." }, 500, corsHeaders)
  }

  const { error: deleteAuthUserError } =
    await supabaseAdmin.auth.admin.deleteUser(user.id, false)

  if (deleteAuthUserError) {
    console.error("delete-account auth deletion failed", deleteAuthUserError)
    return json({ message: "Could not delete auth user." }, 500, corsHeaders)
  }

  return json({ ok: true }, 200, corsHeaders)
})

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

function requireEnv(name: string) {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`Missing ${name}.`)
  }

  return value
}
