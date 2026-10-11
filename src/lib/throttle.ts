// Spaces out model requests to stay under an API's requests-per-minute limit.
// Set REQUESTS_PER_MINUTE in .env.local (e.g. 8 for a Gemini free-tier key).
// Unset or 0 = no throttling (local Ollama).
let nextSlot = 0;

export async function throttle(): Promise<void> {
  const rpm = Number(process.env.REQUESTS_PER_MINUTE ?? 0);
  if (!rpm || rpm <= 0) return;
  const gap = 60000 / rpm;
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + gap;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}
