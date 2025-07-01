import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { fetch } from "undici";
import cors from "cors";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

admin.initializeApp();
const db = admin.firestore();

// default CORS allow-all
const corsHandler = cors({ origin: true });

function getUidFromHeader(req: functions.https.Request): string | null {
  const auth = req.header("Authorization") || "";
  const m = auth.match(/^Bearer (.+)$/);
  return m ? m[1] : null;
}

export const parseUpload = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const uid = getUidFromHeader(req);
    const xml = req.rawBody!;
    let yaml: string;
    let parserRes: Response;

    try {
      // 1) call parser
      parserRes = await fetch(
        "https://parser-service-156574509593.us-central1.run.app/parse",
        {
          method: "POST",
          headers: { "Content-Type": "application/xml" },
          body: xml,
        }
      );
      yaml = await parserRes.text();

      // 2) log parseLogs
      await db.collection("parseLogs").add({
        user: uid,
        timestamp: FieldValue.serverTimestamp(),
        status: parserRes.ok ? "success" : "error",
        inputSize: xml.length,
        errorMessage: parserRes.ok ? null : yaml,
      });

      // 3) store under users/{uid}/files
      if (parserRes.ok && uid) {
        const rawName = req.get("X-File-Name") || "out.xml";
        const title = rawName.replace(/\.xml$/i, ".yaml");

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
      // log failure
      await db.collection("parseLogs").add({
        user: uid,
        timestamp: FieldValue.serverTimestamp(),
        status: "error",
        inputSize: xml?.length ?? 0,
        errorMessage: msg,
      });
      res.status(500).send(msg);
    }
  });
});

export const linkDevice = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const uid = getUidFromHeader(req);
    if (!uid) {
      res.status(401).send("Missing Authorization");
      return;
    }
    try {
      const name = req.get("X-Device-Name") || "Unnamed";
      const token = randomUUID();
      const doc = await db
        .collection("users")
        .doc(uid)
        .collection("devices")
        .add({
          name,
          token,
          createdAt: FieldValue.serverTimestamp(),
        });
      res.json({ deviceId: doc.id, token });
    } catch (e: any) {
      console.error("linkDevice error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).send(msg);
    }
  });
});

export const getLinkToken = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const uid = getUidFromHeader(req);
    if (!uid) {
      res.status(401).send("Missing Authorization");
      return;
    }
    try {
      const token = randomUUID();
      await db
        .collection("users")
        .doc(uid)
        .collection("linkTokens")
        .doc(token)
        .set({ createdAt: FieldValue.serverTimestamp() });
      res.json({ token });
    } catch (e: any) {
      console.error("getLinkToken error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).send(msg);
    }
  });
});

// Firestore trigger: update memberCount for tags
export const onTagMemberWrite = functions.firestore
  .document("tags/{tagId}/members/{uid}")
  .onWrite(async (
    change: functions.Change<admin.firestore.DocumentData>,
    context: functions.EventContext,
  ) => {
    const tagId = context.params.tagId;
    const delta = change.after.exists ? (change.before.exists ? 0 : 1) : -1;
    if (delta === 0) return null;
    await db.doc(`tags/${tagId}`).update({
      memberCount: FieldValue.increment(delta),
    });
    return null;
  });

// Firestore trigger: update memberCount for groups
export const onGroupMemberWrite = functions.firestore
  .document("groups/{groupId}/members/{uid}")
  .onWrite(async (
    change: functions.Change<admin.firestore.DocumentData>,
    context: functions.EventContext,
  ) => {
    const groupId = context.params.groupId;
    const delta = change.after.exists ? (change.before.exists ? 0 : 1) : -1;
    if (delta === 0) return null;
    await db.doc(`groups/${groupId}`).update({
      memberCount: FieldValue.increment(delta),
    });
    return null;
  });

