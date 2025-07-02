import {
  onCall,
  onRequest,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { randomUUID } from "crypto";

// Firestore and Auth handles
const db = admin.firestore();
const auth = admin.auth();

/**
 * initiateEmailChange
 * Creates a verification entry in Firestore which triggers the
 * Trigger Email extension to send a verification email.
 */
export const initiateEmailChange = onCall(
  async (
    request: CallableRequest<{
      newEmail?: string;
      currentPassword?: string;
    }>,
  ) => {
    const uid = request.auth?.uid;
    const { newEmail } = request.data as { newEmail?: string };

    if (!uid) {
      throw new HttpsError(
        "unauthenticated",
        "Must be signed in."
      );
    }
    if (!newEmail) {
      throw new HttpsError(
        "invalid-argument",
        "newEmail is required."
      );
    }

    // Client should reauthenticate before calling. The password is accepted but
    // not verified server-side to keep this sample simple.
    await auth.getUser(uid);
    const token = randomUUID();
    const now = admin.firestore.Timestamp.now();
    await db.collection("emailChangeRequests").doc(token).set({
      uid,
      newEmail,
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + 24 * 60 * 60 * 1000,
      ),
    });

    return { token };
  });

/**
 * verifyEmail
 * Called when the user clicks the verification link. Validates the token and
 * updates the user's email if valid.
 */
export const verifyEmail = onRequest(async (req, res) => {
  const { token } = req.query;
  const docRef = db.collection("emailChangeRequests").doc(String(token));
  const doc = await docRef.get();
  if (!doc.exists) {
    res.status(400).json({ error: "invalid" });
    return;
  }

  const { uid, newEmail, expiresAt } = doc.data() as {
    uid: string;
    newEmail: string;
    expiresAt: admin.firestore.Timestamp;
  };
  if (admin.firestore.Timestamp.now().toMillis() > expiresAt.toMillis()) {
    await docRef.delete();
    res.status(400).json({ error: "expired", newEmail });
    return;
  }

  await auth.updateUser(uid, { email: newEmail });
  await db
    .collection("users")
    .doc(uid)
    .collection("profile")
    .doc("meta")
    .update({
      email: newEmail,
    });

  await docRef.delete();
  res.send(
    [
      "<html><body>",
      "<script>window.location.href = '/account#emailUpdated';</script>",
      "</body></html>",
    ].join("")
  );
});
