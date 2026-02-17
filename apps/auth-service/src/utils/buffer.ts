import DataUriParser from "datauri/parser.js";
import path from "path";

const getBuffer = (file: { originalname: string; buffer: Buffer }) => {
  const parser = new DataUriParser();

  const extName = path.extname(file.originalname).toString();

  const result = parser.format(extName, file.buffer);
  if (!result || !result.content) {
    throw new Error("Unable to create data URI");
  }

  return result;
};

export default getBuffer;
