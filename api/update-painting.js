import { kv } from "@vercel/kv";
import { verifyAdmin } from "./_verifyAdmin";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isValidString(title) ||
      !isValidString(medium) ||
      typeof price !== "number" ||
      price < 0) {
    return res.status(400).json({ success: false, error: "Invalid artwork data" });
  }

  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id, title, medium, price, sold, imgData } = req.body;

  try {
    let artworks = await kv.get("artworks") || [];

    artworks = artworks.map(a =>
      Number(a.id) === Number(id)
        ? { ...a, title, medium, price, sold, imgData }
        : a
    );

    await kv.set("artworks", artworks);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
}
