const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");


async function textFromPdfBuffer(pdfBuffer) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    throw new Error("textFromPdfBuffer: pdfBuffer must be a Buffer");
  }
  const data = await pdfParse(pdfBuffer);
  return (data.text || "").trim();
}

/** OCR từ ảnh Buffer (jpg/png/webp...) */
async function textFromImageBuffer(imageBuffer, lang = "vie+eng") {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    throw new Error("textFromImageBuffer: imageBuffer must be a Buffer");
  }
  const { data } = await Tesseract.recognize(imageBuffer, lang);
  return (data && data.text ? data.text : "").trim();
}

module.exports = {
  textFromPdfBuffer,
  textFromImageBuffer,
};
