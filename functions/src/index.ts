import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import {FieldValue} from "firebase-admin/firestore";

admin.initializeApp();

export const parseUpload = functions.https.onRequest(
  async (req, res) => {
    try {
      const xml = req.rawBody;
      const parserRes = await fetch(
        "https://parser-service-156574509593.us-central1.run.app/parse",
        {
          method: "POST",
          headers: {"Content-Type": "application/xml"},
          body: xml,
        }
      );
      const yaml = await parserRes.text();
      await admin.firestore()
        .collection("parseLogs")
        .add({
          user: req.get("Authorization")?.split("Bearer ")[1] || null,
          timestamp: FieldValue.serverTimestamp(),
          status: parserRes.ok ? "success" : "error",
          inputSize: xml.length,
          errorMessage: parserRes.ok ? null : yaml,
        });
      res.status(parserRes.ok ? 200 : 500).send(yaml);
    } catch (err :any) {
      console.error(err);
      res.status(500).send(err.message);
    }
  }
);

