import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metode tidak diizinkan." }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sesi login tidak ditemukan." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Missing Edge Function environment variable", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonOrPublishableKey: Boolean(anonKey),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    return json({ error: "Konfigurasi server belum lengkap. Periksa Secrets Edge Function." }, 500);
  }

  const token = authHeader.slice("Bearer ".length);
  // Verify the caller with their own access token, then read their own profile
  // under the authenticated role. This avoids depending on service-role profile lookup.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) {
    console.error("manage-staff-account auth validation failed", authError?.message);
    return json({ error: "Sesi login tidak valid." }, 401);
  }

  const { data: caller, error: callerError } = await userClient
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (callerError || !caller || String(caller.role).trim().toLowerCase() !== "direktur") {
    console.error("manage-staff-account director check failed", {
      userId: authData.user.id,
      profileFound: Boolean(caller),
      profileRole: caller?.role ?? null,
      error: callerError?.message ?? null,
      code: callerError?.code ?? null,
    });
    return json({
      error: "Pemeriksaan hak Direktur gagal.",
      detail: callerError?.message ?? (!caller ? "Profil pengguna tidak ditemukan atau tidak dapat dibaca." : `Peran akun adalah ${caller.role}, bukan direktur.`),
      code: callerError?.code ?? null,
      profileFound: Boolean(caller),
      role: caller?.role ?? null,
    }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json({ error: "Data permintaan tidak valid." }, 400);
  }

  if (input.action !== "create") return json({ error: "Aksi belum didukung." }, 400);
  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const title = String(input.title ?? "").trim();
  const unit = String(input.unit ?? "").trim();
  const allowedRoles = ["guru", "sarana", "bendahara-sekolah", "bendahara-umum", "direktur"];
  const role = String(input.role ?? "");

  if (!name || !email || !title || !unit || password.length < 6 || !allowedRoles.includes(role)) {
    return json({ error: "Lengkapi nama, email, jabatan, unit, peran, dan kata sandi minimal 6 karakter." }, 400);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError || !created.user) {
    return json({ error: createError?.message ?? "Gagal membuat pengguna Auth." }, 400);
  }

  const avatar = name.split(/\\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      id: created.user.id,
      name,
      email,
      role,
      title,
      unit,
      avatar,
    })
    .select("id, name, email, role, title, unit, avatar")
    .single();

  if (profileError || !profile) {
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: profileError?.message ?? "Profil petugas gagal dibuat." }, 500);
  }

  return json({ profile }, 201);
});
