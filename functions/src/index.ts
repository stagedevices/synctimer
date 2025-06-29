import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { fetch } from "undici"
import cors from "cors";
import { FieldValue } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

// Allow CORS from anywhere
const corsHandler = cors({ origin: true });

/**
 * Extracts a Firebase UID from Authorization: Bearer <uid>
 */
function getUidFromHeader(req: functions.https.Request): string | null {
  const auth = req.get("Authorization") || "";
  const match = auth.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

export const parseUpload = functions.https.onRequest(
  async (req, res) => {
    // Handle CORS preflight & simple CORS
    corsHandler(req, res, async () => {
      // Only allow POST
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const uid = getUidFromHeader(req);
      const xml = req.rawBody;
      let parserRes: Response;
      let yaml: string;

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

        // 2) Log every parse attempt
        await db.collection("parseLogs").add({
          user: uid,
          timestamp: FieldValue.serverTimestamp(),
          status: parserRes.ok ? "success" : "error",
          inputSize: xml.length,
          errorMessage: parserRes.ok ? null : yaml,
        });

        // 3) If successful, store the YAML under /users/{uid}/files
        if (parserRes.ok && uid) {
          const headerName = req.get("X-File-Name") || "out.xml";
          const filename = headerName.replace(/\.xml$/i, ".yaml");
          await db
            .collection("users")
            .doc(uid)
            .collection("files")
            .add({
              title: filename,
              yaml,
              createdAt: FieldValue.serverTimestamp(),
              size: xml.length,
              status: "ready",
            });
        }

        // 4) Send the YAML (or error) back
        return res.status(parserRes.ok ? 200 : 500).send(yaml);

      } catch (err: any) {
        console.error("parseUpload error:", err);
        const msg = err instanceof Error ? err.message : String(err);

        // Log the failure
        await db.collection("parseLogs").add({
          user: uid,
          timestamp: FieldValue.serverTimestamp(),
          status: "error",
          inputSize: xml.length,
          errorMessage: msg,
        });

        return res.status(500).send(msg);
      }
    });
  }
);
