// Lovable edge function: send-fcm-notification
// Sends an FCM v1 push to all tokens registered for a recipient username.
// Cleans up tokens that come back as invalid / unregistered.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  recipient: string;
  alertId: string;
  type: "normal" | "urgent";
  title: string;
  body: string;
  sender?: string;
}

function b64url(input: ArrayBuffer | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else bytes = new Uint8Array(input);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const clientEmail = Deno.env.get("FCM_CLIENT_EMAIL")!;
  const privateKeyPem = Deno.env.get("FCM_PRIVATE_KEY")!.replace(/\\n/g, "\n");

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const keyBuf = pemToArrayBuffer(privateKeyPem);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBuf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!resp.ok) throw new Error(`oauth2 token failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  cachedToken = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return cachedToken.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const projectId = Deno.env.get("FCM_PROJECT_ID")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as Body;
    const { recipient, alertId, type, title, body: msgBody } = body;

    const { data: rows, error } = await admin
      .from("fcm_tokens")
      .select("token")
      .eq("username", recipient);
    if (error) throw error;
    const tokens = (rows ?? []).map((r) => r.token);
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();
    const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const urgent = type === "urgent";
    let sent = 0;
    const stale: string[] = [];

    await Promise.all(
      tokens.map(async (token) => {
        const message = {
          message: {
            token,
            notification: { title, body: msgBody },
            data: {
              alertId,
              type,
              link: "/tasks",
            },
            webpush: {
              notification: {
                icon: "/icon-192.svg",
                badge: "/icon-192.svg",
                tag: alertId,
                requireInteraction: urgent,
                renotify: urgent,
              },
              fcm_options: { link: "/tasks" },
            },
          },
        };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });
        if (res.ok) {
          sent++;
          return;
        }
        const errText = await res.text();
        if (res.status === 404 || res.status === 400 || /UNREGISTERED|INVALID_ARGUMENT/i.test(errText)) {
          stale.push(token);
        }
        console.error("FCM send failed", res.status, errText);
      }),
    );

    if (stale.length > 0) {
      await admin.from("fcm_tokens").delete().in("token", stale);
    }

    return new Response(JSON.stringify({ sent, removed: stale.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-fcm-notification error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
