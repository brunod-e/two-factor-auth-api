import crypto from "crypto";

const encrypt = (value, key, IV) => {
  const cipher = crypto.createCipheriv("aes-256-gcm", key, IV);
  const cipherValue = cipher.update(value);

  return cipherValue;
};

const decrypt = (value, key, IV) => {
  const cipher = crypto.createDecipheriv("aes-256-gcm", key, IV);
  return cipher.update(value);
};

export { encrypt, decrypt };
