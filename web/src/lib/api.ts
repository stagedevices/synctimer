export async function parseUpload(
  xmlBlob: Blob,
  filename: string,
  uid: string
): Promise<string> {
  const resp = await fetch(
    `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/parseUpload`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
        "Authorization": `Bearer ${uid}`,
        "X-File-Name": filename,
      },
      body: xmlBlob,
    }
  );
  if (!resp.ok) {
    throw new Error(await resp.text());
  }
  return resp.text();
}
