import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const PASSWORD_ALGO = 'scrypt-v1';

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return {
    passwordHash: `${salt.toString('hex')}:${derivedKey.toString('hex')}`,
    passwordAlgo: PASSWORD_ALGO,
  };
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [saltHex, hashHex] = passwordHash.split(':');

  if (!saltHex || !hashHex) {
    return false;
  }

  const storedHash = Buffer.from(hashHex, 'hex');
  const derivedKey = (await scrypt(
    password,
    Buffer.from(saltHex, 'hex'),
    storedHash.length,
  )) as Buffer;

  return timingSafeEqual(storedHash, derivedKey);
}

export function getPasswordAlgo() {
  return PASSWORD_ALGO;
}
