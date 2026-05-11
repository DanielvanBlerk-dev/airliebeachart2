import { kv } from "@vercel/kv";
import { verifyAdmin } from "./_verifyAdmin";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = Number(req.query.id);

  try {
    let artworks = await kv.get("artworks") || [];
    artworks = artworks.filter(a => Number(a.id) !== id);

    await kv.set("artworks", artworks);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
}
