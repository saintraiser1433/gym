import QRCode from "qrcode";
import { randomBytes } from "crypto";

export async function generateQrPayload(clientId: string) {
  const nonce = randomBytes(8).toString("hex");
  const payload = {
    clientId,
    nonce,
    ts: Date.now(),
  };
  const json = JSON.stringify(payload);
  const svg = await QRCode.toDataURL(json);
  return { json, svg };
}

