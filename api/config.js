export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      ai: !!(
        (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY) &&
        process.env.AGAIN_ACCESS_TOKEN &&
        process.env.AI_MODEL
      ),
      googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    }),
  );
}
