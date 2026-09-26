// The Igloo room channel, for when the room's PC and the facilitator's laptop
// are on different networks and can only meet on the hosted deployment.
//
// It keeps two things per room in a key store: the walls' last snapshot, and
// a short tail of commands with a sequence number. Both expire four hours
// after the last write, so nothing about a session is kept.
//
// Configure by adding an Upstash for Redis store to the Vercel project; the
// variables it creates (UPSTASH_REDIS_REST_URL / _TOKEN, or the older
// KV_REST_API_URL / _TOKEN) are read here. Without them this answers 503 and
// the room reports "This browser only" rather than pretending to be shared.

const STORE = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const TTL = 4 * 60 * 60;
const TAIL = 40;
const COMMANDS = new Set(["select", "home", "tour", "journey", "step", "next", "prev", "stop", "time", "turn", "card", "spin", "labels", "reload"]);

async function redis(cmds) {
  const r = await fetch(STORE.replace(/\/$/, "") + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error("store " + r.status);
  return (await r.json()).map((x) => x.result);
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 8192) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch (e) { resolve({}); } });
  });
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!STORE || !TOKEN) return res.status(503).json({ ok: false, shared: false, reason: "no key store configured" });
  const room = String((req.query && req.query.room) || "main").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32) || "main";
  const k = "bizapps:igloo:" + room;
  try {
    if (req.method === "GET") {
      const since = Number((req.query && req.query.since) || 0) || 0;
      const [state, seq, list] = await redis([["GET", k + ":state"], ["GET", k + ":seq"], ["LRANGE", k + ":cmds", 0, TAIL - 1]]);
      const cmds = (list || []).map((x) => { try { return JSON.parse(x); } catch (e) { return null; } })
        .filter((c) => c && c.seq > since).sort((a, b) => a.seq - b.seq);
      return res.status(200).json({ ok: true, shared: true, room, seq: Number(seq) || 0, state: state ? JSON.parse(state) : null, cmds });
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      if (body.kind === "state" && body.state && typeof body.state === "object") {
        const json = JSON.stringify(body.state);
        if (json.length > 4096) return res.status(413).json({ ok: false });
        await redis([["SET", k + ":state", json, "EX", TTL]]);
        return res.status(200).json({ ok: true });
      }
      if (body.kind === "cmd" && body.cmd && COMMANDS.has(body.cmd.type)) {
        const [seq] = await redis([["INCR", k + ":seq"], ["EXPIRE", k + ":seq", TTL]]);
        const cmd = Object.assign({}, body.cmd, { seq: Number(seq) });
        const json = JSON.stringify(cmd);
        if (json.length > 1024) return res.status(413).json({ ok: false });
        await redis([["LPUSH", k + ":cmds", json], ["LTRIM", k + ":cmds", 0, TAIL - 1], ["EXPIRE", k + ":cmds", TTL]]);
        return res.status(200).json({ ok: true, seq: Number(seq) });
      }
      return res.status(400).json({ ok: false });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false });
  } catch (e) {
    return res.status(502).json({ ok: false, shared: true, reason: "store not answering" });
  }
};
