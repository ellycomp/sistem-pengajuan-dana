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

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_OAUTH_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Konfigurasi OAuth Google belum lengkap. Pastikan GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, dan GOOGLE_OAUTH_REFRESH_TOKEN sudah diatur di Supabase Secrets."
    );
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    console.error("Google OAuth token refresh failed", {
      status: response.status,
      error: data.error,
      description: data.error_description,
    });
    throw new Error(
      data.error_description || data.error || "Google OAuth gagal memperoleh access token."
    );
  }

  return data.access_token as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metode tidak diizinkan." }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Sesi login tidak ditemukan." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !anonKey) {
    return json({ error: "Konfigurasi Supabase belum lengkap." }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json({ error: "Sesi login tidak valid." }, 401);

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (profileError || !profile) return json({ error: "Profil pengguna tidak ditemukan." }, 403);

  let input: { fileName?: string; mimeType?: string; fileBase64?: string; requestCode?: string };
  try {
    input = await req.json();
  } catch {
    return json({ error: "Data PDF tidak valid." }, 400);
  }

  if (!input.fileBase64 || !input.fileName || input.mimeType !== "application/pdf") {
    return json({ error: "PDF hasil pembuatan dokumen tidak ditemukan atau formatnya tidak valid." }, 400);
  }
  if (input.fileBase64.length > 14_000_000) {
    return json({ error: "Ukuran PDF terlalu besar (maksimal sekitar 10 MB)." }, 413);
  }

  const folderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
  if (!folderId) return json({ error: "Secret GOOGLE_DRIVE_FOLDER_ID belum diatur." }, 500);

  try {
    const accessToken = await getGoogleAccessToken();
    const safeName = input.fileName.replace(/[\\/:*?"<>|]/g, "_");
    const metadata = {
      name: safeName,
      mimeType: "application/pdf",
      parents: [folderId],
      description: input.requestCode
        ? `Arsip pengajuan dana SIT Qudwah · ${input.requestCode}`
        : "Arsip pengajuan dana SIT Qudwah",
    };

    const pdfBytes = base64ToBytes(input.fileBase64);
    const boundary = "sitqudwah_pdf_" + crypto.randomUUID().replace(/-/g, "");
    const encoder = new TextEncoder();
    const prefix = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`
    );
    const suffix = encoder.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(prefix.length + pdfBytes.length + suffix.length);
    body.set(prefix, 0);
    body.set(pdfBytes, prefix.length);
    body.set(suffix, prefix.length + pdfBytes.length);

    const uploaded = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    const result = await uploaded.json();
    if (!uploaded.ok || !result.id) {
      console.error("Google Drive upload failed", {
        status: uploaded.status,
        error: result.error,
      });
      return json(
        { error: result.error?.message || "Google Drive menolak penyimpanan PDF." },
        502
      );
    }

    return json({
      success: true,
      file: {
        ...result,
        webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
      },
    });
  } catch (error) {
    console.error("Upload PDF error", error);
    return json(
      { error: error instanceof Error ? error.message : "Gagal mengunggah PDF ke Google Drive." },
      500
    );
  }
});
