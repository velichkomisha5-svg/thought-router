import { FIXED_CATEGORIES } from '../config/constants';

export const requestGeminiRouting = async (text, audioBase64, apiKey) => {
  const schema = {
    type: "OBJECT",
    properties: {
      isFinance: { type: "BOOLEAN" },
      isSubscription: { type: "BOOLEAN" },
      category: { type: "STRING", enum: FIXED_CATEGORIES },
      markdown: { type: "STRING" },
      visualPrompt: { type: "STRING" },
      finance: {
        type: "OBJECT",
        properties: { item: { type: "STRING" }, amount: { type: "NUMBER" }, currency: { type: "STRING" }, billing: { type: "STRING", enum: ["monthly", "yearly"] }, note: { type: "STRING" } },
        required: ["item", "amount", "currency"]
      },
      reminder: {
        type: "OBJECT",
        properties: { needed: { type: "BOOLEAN" }, title: { type: "STRING" }, body: { type: "STRING" }, triggerDate: { type: "STRING" } },
        required: ["needed"]
      }
    },
    required: ["isFinance", "isSubscription", "category", "markdown"]
  };

  const systemInstruction = `You are Thought Router Pro core. Target anchor date: 2026-07-14. Return schema-valid JSON only.`;
  let body = { contents: [{ parts: [{ text: systemInstruction }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema } };

  if (audioBase64) {
    body.contents[0].parts.push({ inlineData: { mimeType: "audio/m4a", data: audioBase64 } });
  } else {
    body.contents[0].parts.push({ text: `Input: "${text}"` });
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.candidates[0].content.parts[0].text.trim());
};

export const requestImagenGeneration = async (prompt, apiKey) => {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numberOfImages: 1, prompt, aspectRatio: "1:1", outputMimeType: "image/png" })
  });
  const data = await res.json();
  if (data.generatedImages && data.generatedImages.length > 0) {
    return data.generatedImages[0].image.imageBytes;
  }
  throw new Error("Imagen failed");
};

export const requestSandboxChat = async (input, apiKey) => {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] })
  });
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
};
