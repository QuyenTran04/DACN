const DatauriParser = require("datauri/parser");

exports.bufferToDataURI = (buffer, mimetype) => {
  const parser = new DatauriParser();
  const ext = mimetype.split("/")[1] || "bin";
  return parser.format(ext, buffer).content; // "data:<mime>;base64,..."
};
