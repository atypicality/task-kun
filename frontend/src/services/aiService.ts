export async function generateVoice(
  text: string,
  voice: "default" | "miku" = "default"
): Promise<string> {
  const response = await fetch("http://127.0.0.1:8000/generate-voice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate voice");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}