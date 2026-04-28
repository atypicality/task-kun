export async function generateVoice(
  text: string,
  voice: "default" | "miku" = "default"
): Promise<string> {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://task-kun-s9rt.onrender.com";
  const response = await fetch(`${BACKEND_URL}/generate-voice`, {
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