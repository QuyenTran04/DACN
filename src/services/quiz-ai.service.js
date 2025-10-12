const { OpenAI } = require("openai");

function ensureOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }
}

const MODEL = process.env.OPENAI_MODEL_TEXT || "gpt-4o";

/** Bóc JSON mảng một cách "chịu lỗi" khi model trả kèm text */
function safeJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    if (parsed && Array.isArray(parsed.quizzes)) return parsed.quizzes;
  } catch (e) {
    const m = String(raw).match(/\[\s*{[\s\S]*}\s*\]/);
    if (m) {
      try {
        const arr = JSON.parse(m[0]);
        if (Array.isArray(arr)) return arr;
      } catch {}
    }
  }
  return [];
}

/** Sinh danh sách câu hỏi trắc nghiệm từ text */
async function extractQuestions(text, { maxQuestions = 12 } = {}) {
  ensureOpenAI();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const sys = `Bạn là trợ lý tạo trắc nghiệm cho hệ thống LMS. 
Chỉ trả về JSON MẢNG, KHÔNG kèm giải thích.
Mỗi phần tử dạng: 
{ "content": "string", "options": ["string",...], "answer": "string (optional)" }
Yêu cầu:
- Ưu tiên 1 đáp án đúng (nhưng có thể đa chọn nếu văn bản yêu cầu).
- Không sinh đáp án mơ hồ kiểu "Tất cả đều đúng" trừ khi cần.
- Tối đa ${maxQuestions} câu, tiếng Việt, rõ ràng.`;

  const user = `Tạo trắc nghiệm từ nội dung sau:
"""${String(text || "").slice(0, 15000)}"""`;

  const resp = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" }, // ép JSON
  });

  const raw = resp.choices?.[0]?.message?.content ?? "[]";
  const arr = safeJsonArray(raw);

  // Chuẩn hoá output -> {content, options[], answer?}
  const normalized = arr
    .filter((q) => q && (q.content || q.question) && (q.options || q.choices))
    .map((q) => ({
      content: String(q.content || q.question).trim(),
      options: Array.isArray(q.options)
        ? q.options.map(String)
        : Array.isArray(q.choices)
        ? q.choices.map(String)
        : [],
      answer: q.answer ? String(q.answer).trim() : undefined,
    }))
    .filter(
      (q) => q.content && Array.isArray(q.options) && q.options.length >= 2
    );

  return normalized;
}

/** Giải 1 câu MCQ: trả về **nội dung đáp án đúng** (text) */
async function solveQuestion(question) {
  ensureOpenAI();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { content, options } = question || {};
  if (!content || !Array.isArray(options) || options.length < 2) {
    throw new Error("Invalid question payload for solveQuestion");
  }
  const letters = options.map((_, i) => String.fromCharCode(65 + i));
  const prompt = `Chọn đáp án đúng và CHỈ trả về nội dung đáp án (không kèm chữ cái).
Câu hỏi: ${content}
Đáp án:
${options.map((op, i) => `${letters[i]}. ${op}`).join("\n")}`;

  const resp = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.0,
  });

  return resp.choices?.[0]?.message?.content?.trim() || "";
}

module.exports = {
  extractQuestions,
  solveQuestion,
};
