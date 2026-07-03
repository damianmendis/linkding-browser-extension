import { describe, it, expect } from 'vitest';
import { validateServerUrl, validateApiToken, escapeHtml } from '../../src/lib/validators';

describe('validateServerUrl', () => {
  it('accepts valid https URL', () => {
    expect(validateServerUrl('https://links.example.com')).toBe('https://links.example.com');
  });

  it('strips trailing slash', () => {
    expect(validateServerUrl('https://links.example.com/')).toBe('https://links.example.com');
    expect(validateServerUrl('https://links.example.com/path/')).toBe('https://links.example.com/path');
  });

  it('trims whitespace', () => {
    expect(validateServerUrl('  https://links.example.com  ')).toBe('https://links.example.com');
  });

  it('rejects empty string', () => {
    expect(() => validateServerUrl('')).toThrow(/required/i);
  });

  it('rejects invalid URL', () => {
    expect(() => validateServerUrl('not a url')).toThrow(/valid URL/i);
  });

  it('rejects ftp protocol', () => {
    expect(() => validateServerUrl('ftp://example.com')).toThrow(/http/i);
  });
});

describe('validateApiToken', () => {
  it('accepts non-empty token', () => {
    expect(validateApiToken('mytoken123')).toBe('mytoken123');
  });

  it('trims whitespace', () => {
    expect(validateApiToken('  tok  ')).toBe('tok');
  });

  it('rejects empty string', () => {
    expect(() => validateApiToken('')).toThrow(/required/i);
  });
});

describe('escapeHtml', () => {
  it('escapes special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});
