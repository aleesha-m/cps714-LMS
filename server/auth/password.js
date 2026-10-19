import crypto from "crypto";

// Password hashing with Node's built-in scrypt (no extra dependency needed).
const KEYLEN = 64;
const PARAMS = { N: 2 ** 14, r: 8, p: 1 };

const scrypt = (password, salt) =>
    new Promise((resolve, reject) =>
        crypto.scrypt(password, salt, KEYLEN, PARAMS, (err, key) => (err ? reject(err) : resolve(key)))
    );

export async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const key = await scrypt(password, salt);
    return `${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
    const [saltHex, keyHex] = stored.split("$");
    const key = await scrypt(password, Buffer.from(saltHex, "hex"));
    const expected = Buffer.from(keyHex, "hex");
    return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// A throwaway hash so logins for unknown emails take as long as real ones.
export const DUMMY_HASH = await hashPassword("not-a-real-password");
