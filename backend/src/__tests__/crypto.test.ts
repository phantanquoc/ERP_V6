/**
 * Tests for crypto utilities — encryptText / decryptText
 */

// Mock env before importing crypto
jest.mock('@config/env', () => ({
  env: {
    FACE_DATA_SECRET: 'test-secret-key-for-unit-tests-only',
  },
}));

import { encryptText, decryptText } from '@utils/crypto';

describe('encryptText / decryptText', () => {
  it('should encrypt and decrypt a simple string', () => {
    const plain = 'hello world';
    const encrypted = encryptText(plain);
    expect(encrypted).not.toBe(plain);
    expect(decryptText(encrypted)).toBe(plain);
  });

  it('should encrypt JSON embedding array and decrypt correctly', () => {
    const embedding = JSON.stringify([0.1, -0.5, 0.9, 0.0, 1.0]);
    const encrypted = encryptText(embedding);
    expect(decryptText(encrypted)).toBe(embedding);
  });

  it('should produce different ciphertexts for the same input (random IV)', () => {
    const plain = 'same input';
    const enc1 = encryptText(plain);
    const enc2 = encryptText(plain);
    expect(enc1).not.toBe(enc2);
    // But both decrypt to the same value
    expect(decryptText(enc1)).toBe(plain);
    expect(decryptText(enc2)).toBe(plain);
  });

  it('should return the original value unchanged if not encrypted format', () => {
    const plain = 'not encrypted';
    expect(decryptText(plain)).toBe(plain);
  });

  it('should handle empty string', () => {
    const encrypted = encryptText('');
    expect(decryptText(encrypted)).toBe('');
  });

  it('should handle long embedding vectors (512-dim ArcFace)', () => {
    const embedding = Array.from({ length: 512 }, (_, i) => Math.sin(i) * 0.5);
    const json = JSON.stringify(embedding);
    expect(decryptText(encryptText(json))).toBe(json);
  });

  it('should throw or fail on tampered ciphertext', () => {
    const encrypted = encryptText('sensitive');
    const tampered  = encrypted.slice(0, -4) + 'XXXX'; // corrupt last 4 chars
    expect(() => decryptText(tampered)).toThrow();
  });
});
