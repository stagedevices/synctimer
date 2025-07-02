import { onRequest, Request } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  onDocumentWritten,
  onDocumentCreated,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { fetch } from "undici";
import cors from "cors";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import YAML from "yaml";

admin.initializeApp();

// Export email change functions
export * from "./email";
const db = admin.firestore();

// default CORS allow-all
const corsHandler = cors({ origin: true });

export async function storeParts(
  fileId: string,
  title: string,
  yamlText: string,
  ownerUid: string,
  database: FirebaseFirestore.Firestore = db,
): Promise<void> {
  const fileRef = database.collection("files").doc(fileId);
  await fileRef.set({
    title,
    createdAt: FieldValue.serverTimestamp(),
    ownerUid,
  });
  interface EventData { bar?: number; instruments?: string[] }
  const events = YAML.parse(yamlText) as EventData[];
  const measures = Math.max(
    0,
    ...events.map((e) => e.bar ?? 0),
  );
  await fileRef.collection("parts").add({
    partName: "Full Score",
    instrument: "Full Score",
    measures,
    yaml: yamlText,
    fullScore: true,
  });
  const instruments = Array.from(
    new Set(
      events
        .flatMap((e) => (e.instruments ? e.instruments[0] : null))
        .filter(Boolean),
    ),
  ) as string[];
  for (const inst of instruments) {
    const partEvents = events.filter((e) =>
      (e.instruments || []).includes(inst),
    );
    const partYaml = YAML.stringify(partEvents);
    await fileRef.collection("parts").add({
      partName: inst,
      instrument: inst,
      measures,
      yaml: partYaml,
      fullScore: false,
    });
  }
}

function getUidFromHeader(req: Request): string | null {
  const auth = req.header("Authorization") || "";
  const m = auth.match(/^Bearer (.+)$/);
  return m ? m[1] : null;
}

export const parseUpload = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const uid = getUidFromHeader(req);
    const xml = req.rawBody ?? Buffer.from("");
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

      // 3) store file & parts
      if (parserRes.ok && uid) {
        const rawName = req.get("X-File-Name") || "out.xml";
        const title = rawName.replace(/\.xml$/i, "");
        const fileId = randomUUID();
        await storeParts(fileId, title, yaml, uid);
        res.set("X-File-Id", fileId);
      }

      // 4) return
      res.status(parserRes.ok ? 200 : 500).send(yaml);
    } catch (e: unknown) {
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

export const linkDevice = onRequest((req, res) => {
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
    } catch (e: unknown) {
      console.error("linkDevice error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).send(msg);
    }
  });
});

export const getLinkToken = onRequest((req, res) => {
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
    } catch (e: unknown) {
      console.error("getLinkToken error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).send(msg);
    }
  });
});

// 1️⃣ Soft-delete flag on group documents
export const purgeDeletedGroups = onSchedule("every 24 hours", async () => {
  const cutoff = Date.now() - 15 * 24 * 60 * 60 * 1000;
  const snap = await db
    .collection("groups")
    .where("isDeleted", "==", true)
    .where(
      "deletedAt",
      "<=",
      admin.firestore.Timestamp.fromMillis(cutoff),
    )
    .get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
});

// Firestore trigger: update memberCount for tags
export const onTagMemberWrite = onDocumentWritten(
  { document: "tags/{tagId}/members/{uid}", region: "us-central1" },
  async (event) => {
    const change = event.data;
    const tagId = event.params.tagId;
    const was = change?.before.exists ?? false;
    const now = change?.after.exists ?? false;
    const delta = now ? (was ? 0 : 1) : -1;
    if (delta === 0) return null;
    await db.doc(`tags/${tagId}`).update({
      memberCount: FieldValue.increment(delta),
    });
    return null;
  },
);

// Firestore trigger: update memberCount for groups
export const onGroupMemberWrite = onDocumentWritten(
  { document: "groups/{groupId}/members/{uid}", region: "us-central1" },
  async (event) => {
    const change = event.data;
    const groupId = event.params.groupId;
    const was = change?.before.exists ?? false;
    const now = change?.after.exists ?? false;
    const delta = now ? (was ? 0 : 1) : -1;
    if (delta === 0) return null;
    await db.doc(`groups/${groupId}`).update({
      memberCount: FieldValue.increment(delta),
    });
    return null;
  },
);

// Firestore trigger: send notifications on new assignments
export const onAssignmentCreate = onDocumentCreated(
  { document: "assignments/{assignmentId}", region: "us-central1" },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;
    const data = snap.data() as admin.firestore.DocumentData;
    const id = event.params.assignmentId;
    for (const rec of data.recipients || []) {
      if (rec.type === "user") {
        await db
          .collection("users")
          .doc(rec.uid)
          .collection("assignments")
          .doc(id)
          .set(data);
        await db
          .collection("users")
          .doc(rec.uid)
          .collection("notifications")
          .add({
            assignmentId: id,
            fromUid: data.assignedBy,
            fileId: data.fileId,
            partIds: data.partIds,
            assignedAt: data.assignedAt,
          });
      } else if (rec.type === "group") {
        const members = await db
          .collection("groups")
          .doc(rec.groupId)
          .collection("members")
          .get();
        await Promise.all(
          members.docs.map((m) =>
            db
              .collection("users")
              .doc(m.id)
              .collection("assignments")
              .doc(id)
              .set({
                ...data,
                groupId: rec.groupId,
                assignmentName: rec.assignmentName,
              })
          )
        );
        await Promise.all(
          members.docs.map((m) =>
            db
              .collection("users")
              .doc(m.id)
              .collection("notifications")
              .add({
                assignmentId: id,
                fromUid: data.assignedBy,
                fileId: data.fileId,
                partIds: data.partIds,
                assignedAt: data.assignedAt,
              })
          )
        );
      }
    }
    return null;
  },
);

