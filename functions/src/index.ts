// functions/src/index.ts

import cors from "cors";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import { FieldValue } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

// CORS middleware, allow all origins for now
const corsHandler = cors({ origin: true });

/**
 * Extracts UID from Authorization: Bearer <uid> header.
 */
function getUidFromHeader(req: functions.https.Request): string | null {
  const auth = req.get("Authorization") || "";
  const m = auth.match(/^Bearer (.+)$/);
  return m ? m[1] : null;
}

export const parseUpload = functions.https.onRequest((req, res) => {
  // handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsHandler(req, res, () => res.sendStatus(204));
  }

  corsHandler(req, res, async () => {
    const uid = getUidFromHeader(req);
    const xml = req.rawBody;
    let yaml: string;

    try {
      // 1) Call the parser service
      const parserRes = await fetch(
        "https://parser-service-156574509593.us-central1.run.app/parse",
        {
          method: "POST",
          headers: { "Content-Type": "application/xml" },
          body: xml,
        }
      );
      yaml = await parserRes.text();

      // 2) Log the parse operation
      await db.collection("parseLogs").add({
        user: uid,
        timestamp: FieldValue.serverTimestamp(),
        status: parserRes.ok ? "success" : "error",
        inputSize: xml.length,
        errorMessage: parserRes.ok ? null : yaml,
      });

      // 3) If successful, store the YAML under /users/{uid}/files
      if (parserRes.ok && uid) {
        const filename = (
          req.get("X-File-Name")?.replace(/\.xml$/i, ".yaml") ||
          "out.yaml"
        );
        await db
          .collection("users")
          .doc(uid)
          .collection("files")
          .add({
            title: filename,
            yaml,
            createdAt: FieldValue.serverTimestamp(),
            size: Buffer.byteLength(yaml, "utf8"),
            status: "ready",
          });
      }

      // 4) Return the YAML (or error) to the client
      res.status(parserRes.ok ? 200 : 500).send(yaml);
    } catch (err: any) {
      const msg = err.message || String(err);
      console.error("parseUpload error:", msg);
      // Log error
      await db.collection("parseLogs").add({
        user: uid,
        timestamp: FieldValue.serverTimestamp(),
        status: "error",
        inputSize: xml.length,
        errorMessage: msg,
      });
      res.status(500).send(msg);
    }
  });
});
