const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_PARSE_URL ||
  `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

export async function parseUpload(
  xmlBlob: Blob,
  filename: string,
  uid: string
): Promise<string> {
  const url = `${FUNCTIONS_BASE_URL}/parseUpload`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      "Authorization": `Bearer ${uid}`,
      "X-File-Name": filename,
    },
    body: xmlBlob,
  });

  const text = await resp.text();
  
  if (!resp.ok) {
    throw new Error(text);
  }
  return text;
}

export async function linkDevice(
  uid: string,
  name?: string
): Promise<{ deviceId: string; token: string }> {
  const url = `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/linkDevice`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${uid}`,
      ...(name ? { 'X-Device-Name': name } : {}),
    },
  });
  if (!resp.ok) {
    throw new Error(await resp.text());
  }
  return resp.json();
}

export async function getLinkToken(uid: string): Promise<string> {
  const url = `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/getLinkToken`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${uid}`,
    },
  });
  if (!resp.ok) {
    throw new Error(await resp.text());
  }
  const data = await resp.json();
  return data.token as string;
}

export async function sendPeerRequest(email: string, fromUid: string): Promise<void> {
  const url = `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/sendPeerRequest`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fromUid}`,
    },
    body: JSON.stringify({ email, fromUid }),
  });
  if (!resp.ok) {
    throw new Error(await resp.text());
  }
}

export async function removePeer(peerUid: string, fromUid: string): Promise<void> {
  const url = `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/removePeer`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fromUid}`,
    },
    body: JSON.stringify({ peerUid, fromUid }),
  });
  if (!resp.ok) {
    throw new Error(await resp.text());
  }
}

export async function uploadYaml(
  yamlText: string,
  filename: string,
  uid: string,
): Promise<void> {
  const url = `${FUNCTIONS_BASE_URL}/parseUpload`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/yaml',
      Authorization: `Bearer ${uid}`,
      'X-File-Name': filename,
    },
    body: yamlText,
  });
  if (!resp.ok) {
    throw new Error(await resp.text());
  }
}
