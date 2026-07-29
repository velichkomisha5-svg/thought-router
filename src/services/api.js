import { FIXED_CATEGORIES } from '../config/constants';

export const requestGeminiRouting = async (text, audioBase64, apiKey, preferredCategory) => {
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
        properties: { 
          item: { type: "STRING" }, 
          amount: { type: "NUMBER" }, 
          currency: { type: "STRING" }, 
          type: { type: "STRING", enum: ["income", "expense"] },
          billing: { type: "STRING", enum: ["monthly", "yearly"] }, 
          note: { type: "STRING" } 
        },
        required: ["item", "amount", "currency", "type"]
      },
      task: {
        type: "OBJECT",
        properties: { 
          title: { type: "STRING" }, 
          dueDate: { type: "STRING" } 
        },
        required: ["title"]
      },
      calendarEvent: {
        type: "OBJECT",
        properties: { 
          summary: { type: "STRING" }, 
          startTime: { type: "STRING" }, 
          endTime: { type: "STRING" } 
        },
        required: ["summary", "startTime"]
      }
    },
    required: ["isFinance", "isSubscription", "category", "markdown"]
  };

  const systemInstructionText = `You are Thought Router Pro core engine. Parse user input and return valid JSON adhering strictly to the schema. Preferred user target category: ${preferredCategory || 'Auto'}. Anchor date: ${new Date().toISOString().split('T')[0]}. ALL date and time strings MUST be strictly formatted in ISO 8601 (YYYY-MM-DDTHH:mm:ssZ). Determine if finance is income or expense.`;
  
  let parts = [];
  if (audioBase64) {
    parts.push({ inlineData: { mimeType: "audio/m4a", data: audioBase64 } });
  }
  if (text) {
    parts.push({ text: `Input text: "${text}"` });
  }

  const body = { 
    system_instruction: { parts: [{ text: systemInstructionText }] },
    contents: [{ parts }], 
    generationConfig: { responseMimeType: "application/json", responseSchema: schema } 
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error("Пустой ответ от Gemini или сработал Safety Filter.");
  }
  
  return JSON.parse(data.candidates[0].content.parts[0].text.trim());
};

export const requestImagenGeneration = async (prompt, apiKey) => {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1 }
    })
  });
  
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (data.predictions && data.predictions.length > 0 && data.predictions[0].bytesBase64Encoded) {
    return data.predictions[0].bytesBase64Encoded;
  }
  throw new Error("Не удалось получить изображение от Imagen API");
};

export const requestSandboxChat = async (input, apiKey, history = []) => {
  const systemInstructionText = "Ты — встроенный ИИ-ассистент приложения Thought Router Pro. Твоя задача — анализировать заметки, форматировать их под Obsidian Vault, извлекать финансовые записи и задачи для Google Workspace.";
  
  const formattedHistory = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const body = {
    system_instruction: { parts: [{ text: systemInstructionText }] },
    contents: [
      ...formattedHistory,
      { role: 'user', parts: [{ text: input }] }
    ]
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) throw new Error("Ответ заблокирован или отсутствует.");
  return responseText;
};
