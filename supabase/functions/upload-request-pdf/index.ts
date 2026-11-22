import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const bytes = Uint8Array.from(atob(body), c => c.charCodeAt(0));
  return bytes.buffer;
}
function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function textBase64Url(value: string): string {
  return base64Url(new TextEncoder().encode(value));
}
async function googleAccessToken(service: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = textBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = textBase64Url(JSON.stringify({
    iss: service.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = header + "." + claim;
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToArrayBuffer(service.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)
  ));
  const assertion = unsigned + "." + base64Url(signature);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || "Google OAuth gagal.");
  return data.access_token as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metode tidak diizinkan." }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sesi login tidak ditemukan." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json({ error: "Sesi login tidak valid." }, 401);
  const { data: profile } = await userClient.from("profiles").select("role").eq("id", auth.user.id).single();
  if (!profile) return json({ error: "Profil pengguna tidak ditemukan." }, 403);

  let input: { fileName?: string; mimeType?: string; fileBase64?: string; requestCode?: string };
  try { input = await req.json(); } catch { return json({ error: "Data upload tidak valid." }, 400); }
  if (!input.fileBase64 || !input.fileName || input.mimeType !== "application/pdf") {
    return json({ error: "Pilih berkas PDF yang valid." }, 400);
  }
  if (input.fileBase64.length > 14_000_000) return json({ error: "Ukuran PDF terlalu besar (maksimal sekitar 10 MB)." }, 413);

  const rawService = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  const folderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
  if (!rawService || !folderId) return json({ error: "Secret Google Drive belum lengkap." }, 500);

  try {
    const service = JSON.parse(rawService);
    const token = await googleAccessToken(service);
    const safeName = input.fileName.replace(/[\\/:*?"<>|]/g, "_");
    const metadata = { name: safeName, mimeType: "application/pdf", parents: [folderId], description: "Arsip pengajuan dana SIT Qudwah" };
    const boundary = "-------sitqudwahuploadboundary";
    const pdfBytes = Uint8Array.from(atob(input.fileBase64), c => c.charCodeAt(0));
    const prefix = new TextEncoder().encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`
    );
    const suffix = new TextEncoder().encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(prefix.length + pdfBytes.length + suffix.length);
    body.set(prefix); body.set(pdfBytes, prefix.length); body.set(suffix, prefix.length + pdfBytes.length);
    const uploaded = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    const result = await uploaded.json();
    if (!uploaded.ok) {
      console.error("Google Drive upload failed", result);
      return json({ error: result.error?.message || "Google Drive menolak unggahan." }, 502);
    }
    return json({ success: true, file: result });
  } catch (error) {
    console.error("Upload PDF error", error);
    return json({ error: error instanceof Error ? error.message : "Gagal mengunggah PDF." }, 500);
  }
});
