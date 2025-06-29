import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import { FieldValue } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

/**
 * Helper to extract a UID from your Authorization header.
 * In production you’d verify an ID token via admin.auth().verifyIdToken(token),
 * but for now this just uses the raw “Bearer <uid>” you pass in.
 */
function getUidFromHeader(req: functions.https.Request): string | null {
  const auth = req.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.split("Bearer ")[1];
}

export const parseUpload = functions.https.onRequest(
  async (req, res) => {
    const uid = getUidFromHeader(req);
    const xml = req.rawBody;
    let parserRes, yaml: string;

    try {
      // 1) Call the parser service
      parserRes = await fetch(
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
        const filename =
          req.get("X-File-Name")?.replace(/\.xml$/i, ".yaml") || "out.yaml";

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
    } catch (err: any) {
      console.error("parseUpload error:", err);
      // Log the failure in parseLogs too
      await db.collection("parseLogs").add({
        user: uid,
        timestamp: FieldValue.serverTimestamp(),
        status: "error",
        inputSize: xml.length,
        errorMessage: err.message,
      });
      res.status(500).send(err.message);
    }
  }
);
