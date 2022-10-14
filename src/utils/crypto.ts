import crypto from "crypto";

const encrypt = (value, key) => {
  const IV = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, IV);
  const cipherValue = cipher.update(value);

  return Buffer.concat([IV, cipherValue]);
};

const decrypt = (valueAndIV, key) => {
  const IV = valueAndIV.slice(0, 16);
  const cipherValue = valueAndIV.slice(16);
  const cipher = crypto.createDecipheriv("aes-256-gcm", key, IV);
  return cipher.update(cipherValue);
};

export { encrypt, decrypt };
