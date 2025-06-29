// functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import cors from "cors";
import {FieldValue} from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

// helper to pull the UID out of your Authorization header
/**
 * Extracts the UID out of the incoming request’s
 * “Authorization: Bearer <uid>” header.
 *
 * @param {functions.https.Request} req The HTTPS request object.
 * @return {string|null} The UID if present; otherwise null.
 */
function getUidFromHeader(req: functions.https.Request): string | null {
  const auth = req.get("Authorization") || "";
  const m = auth.match(/^Bearer (.+)$/);
  return m ? m[1] : null;
}

// CORS middleware: allow POST + OPTIONS, our two custom headers, any origin
const corsHandler = cors({
  origin: true,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-File-Name"],
});

export const parseUpload = functions.https.onRequest((req, res) => {
  // wrap your entire logic in the CORS check
  corsHandler(req, res, async () => {
    const uid = getUidFromHeader(req);
    const xml = req.rawBody;
    let parserRes: fetch.Response;
    let yaml: string;

    try {
      // 1) Call the parser service
      parserRes = await fetch(
        "https://parser-service-156574509593.us-central1.run.app/parse",
        {
          method: "POST",
          headers: {"Content-Type": "application/xml"},
          body: xml,
        }
      );
      yaml = await parserRes.text();

      // 2) Log the parse attempt
      await db.collection("parseLogs").add({
        user: uid,
        timestamp: FieldValue.serverTimestamp(),
        status: parserRes.ok ? "success" : "error",
        inputSize: xml.length,
        errorMessage: parserRes.ok ? null : yaml,
      });

      // 3) If success, write into /users/{uid}/files
      if (parserRes.ok && uid) {
        const filename =
          (req.get("X-File-Name")?.replace(/\.xml$/i, ".yaml")) || "out.yaml";

        await db
          .collection("users")
          .doc(uid)
          .collection("files")
          .add({
            title: filename,
            yaml,
            createdAt: FieldValue.serverTimestamp(),
            size: yaml.length,
            status: "ready",
          });
      }

      // 4) Return the YAML (or error) to the client
      res.status(parserRes.ok ? 200 : 500).send(yaml);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("parseUpload error:", err);

      // also log the failure
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

