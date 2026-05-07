//FRONT
// Centralised fetch wrapper — all paths are relative so Vite proxy handles CORS
export async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || data.message || 'Request failed'), { data });
  return data;
}