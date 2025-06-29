export async function parseUpload(xml: Blob): Promise<string> {
  const url = import.meta.env.VITE_PARSE_URL + "/parseUpload";
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xml,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(text);
  return text;
}
