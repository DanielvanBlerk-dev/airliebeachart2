import { kv } from "@vercel/kv";
import { sanitizeString } from "./_sanitize";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sourceId, amount, currency } = req.body;
    const safeTitle = sanitizeString(title);
    const safeMedium = sanitizeString(medium);
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    const squareRes = await fetch("https://connect.squareup.com/v2/payments", {
      method: "POST",
      headers: {
        "Square-Version": "2023-12-13",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: crypto.randomUUID(),
        amount_money: { amount, currency },
        location_id: locationId
      })
    });

    const data = await squareRes.json();

    function isValidString(str) {
      return typeof str === "string" &&
             str.trim().length > 0 &&
             !/[<>]/.test(str);
    }
    
    function isValidPhone(str) {
      return /^[0-9+\s-]{6,20}$/.test(str);
    }
    
    function isValidPostcode(str) {
      return /^[0-9]{4}$/.test(str);
    }

    if (!isValidString(firstName) ||
        !isValidString(lastName) ||
        !isValidString(address) ||
        !isValidString(city) ||
        !isValidPostcode(postcode) ||
        !isValidPhone(phone)) {
      return res.status(400).json({ success: false, error: "Invalid form data" });
    }

    if (!squareRes.ok) {
      return res.status(500).json({ success: false, error: data });
    }

    return res.status(200).json({
      success: true,
      orderId: data.payment.id
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
