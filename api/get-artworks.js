import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  try {
    let artworks = await kv.get("artworks");

    if (!artworks) {
      artworks = [];
      await kv.set("artworks", artworks);
    }

    return res.status(200).json({ artworks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ artworks: [] });
  }
}
