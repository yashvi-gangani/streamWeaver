// this file talks to google's gemini api using plain fetch, no extra sdk package needed
// keeping ai calls in one place makes it easy to swap models or providers later

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash"; // free tier friendly, change here if you want a different model
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

// sends a plain text prompt to gemini and returns the raw text reply
async function askGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing, add it to your .env file");
  }

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = (data && data.error && data.error.message) || "Gemini request failed";
    throw new Error(errorMessage);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini did not return any text");
  }

  return text;
}

// same as askGemini, but strips markdown code fences and parses the reply as json
// gemini sometimes wraps json replies in ```json ... ``` even when told not to, so we clean that up
async function askGeminiForJson(prompt) {
  const rawText = await askGemini(prompt);
  const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

module.exports = { askGemini, askGeminiForJson };