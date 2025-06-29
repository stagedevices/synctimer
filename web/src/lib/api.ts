export async function parseUpload(
  xmlBlob: Blob,
  filename: string,
  uid: string
): Promise<string> {
  const url = `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/parseUpload`;
  console.log("📡 parseUpload calling", { url, filename, uid });
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      "Authorization": `Bearer ${uid}`,
      "X-File-Name": filename,
    },
    body: xmlBlob,
  });

  console.log("📶 response status", resp.status);
  const text = await resp.text();
  console.log("📜 response text (first 200 chars):", text.slice(0, 200));
  
  if (!resp.ok) {
    throw new Error(text);
  }
  return text;
}
