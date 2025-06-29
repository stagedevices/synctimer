import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { fetch } from "undici";
import * as cors from "cors";
import type { Request, Response } from "express";
import { FieldValue } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

// Allow any origin; adjust in prod as you see fit
const corsHandler = cors({ origin: true });

/** Extracts “Bearer <uid>” */
function getUidFromHeader(req: Request): string | null {
  const auth = req.header("Authorization") || "";
  const m = auth.match(/^Bearer (.+)$/);
  return m ? m[1] : null;
}

export const parseUpload = functions.https.onRequest((req: Request, res: Response) => {
  // First run CORS
  corsHandler(req, res, async () => {
    const uid = getUidFromHeader(req);
    const xml = req.rawBody as Buffer;            // firebase-functions gives you rawBody for non-JSON types
    let parserRes, yaml: string;

    try {
      // 1) hit your parser
      parserRes = await fetch(
        "https://parser-service-156574509593.us-central1.run.app/parse",
        {
          method: "POST",
          headers: { "Content-Type": "application/xml" },
          body: xml,
        }
      );
      yaml = await parserRes.text();

      // 2) log it
      await db.collection("parseLogs").add({
        user:       uid,
        timestamp:  FieldValue.serverTimestamp(),
        status:     parserRes.ok ? "success" : "error",
        inputSize:  xml.length,
        errorMessage: parserRes.ok ? null : yaml,
      });

      // 3) store under /users/{uid}/files if ok
      if (parserRes.ok && uid) {
        const rawName = req.header("X-File-Name") || "out.xml";
        const title   = rawName.replace(/\.xml$/i, ".yaml");
        await db
          .collection("users")
          .doc(uid)
          .collection("files")
          .add({
            title,
            yaml,
            createdAt: FieldValue.serverTimestamp(),
            size: yaml.length,
            status: "ready",
          });
      }

      // 4) return
      res.status(parserRes.ok ? 200 : 500).send(yaml);

    } catch (e: any) {
      console.error("parseUpload error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      // also log this failure
      await db.collection("parseLogs").add({
        user:        uid,
        timestamp:   FieldValue.serverTimestamp(),
        status:      "error",
        inputSize:   xml?.length ?? 0,
        errorMessage: msg,
      });
      res.status(500).send(msg);
    }
  });
});
