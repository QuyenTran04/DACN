// Chuẩn hoá payload về đúng model (options[].text, correctAnswers là text)
exports.normalizeQuizPayload = (q) => {
  const question = String(q.question || q.content || "").trim();

  const options = (q.options || [])
    .map((op) => {
      if (typeof op === "string") return { text: op.trim() };
      return {
        text: String(op?.text || "").trim(),
        imageUrl: op?.imageUrl ? String(op.imageUrl).trim() : undefined,
      };
    })
    .filter((op) => op.text);

  // correctAnswers: ưu tiên mảng, fallback answer đơn
  let correctAnswers = Array.isArray(q.correctAnswers)
    ? q.correctAnswers
    : q.answer
    ? [q.answer]
    : [];
  correctAnswers = correctAnswers
    .map((a) => String(a || "").trim())
    .filter(Boolean);

  // chỉ giữ đáp án thuộc tập options.text
  const optionTexts = new Set(options.map((o) => o.text));
  correctAnswers = correctAnswers.filter((a) => optionTexts.has(a));

  return { question, options, correctAnswers };
};
