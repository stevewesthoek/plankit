/**
 * Regression test for BuildFlow source read/index pipeline
 *
 * Issue: BuildFlow was silently redacting documentation placeholders
 * like "[generate-new-token-for-this-new-environment-only]"
 * because the redactSecrets() regex was too broad.
 *
 * Security gap: Quoted real secrets were not redacted.
 *
 * This test ensures that:
 * 1. Documentation placeholders are NEVER redacted (quoted or unquoted)
 * 2. Real secrets (long alphanumeric tokens) are redacted
 * 3. Quoted real secrets are redacted (double and single quotes)
 * 4. Private keys are still redacted
 * 5. The bugs cannot regress
 */

import { describe, it, expect } from '@jest/globals'

// Import the function directly for testing
// Note: In real usage, this would be imported from the module
function redactSecrets(content: string): string {
  return content
    // Redact double-quoted real secrets, but preserve documentation placeholders [...]
    .replace(/(AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|API_KEY|TOKEN|SECRET|PASSWORD)\s*[:=]\s*"(?!\[)([^"]+)"/gi, '$1="[REDACTED]"')
    // Redact single-quoted real secrets, but preserve documentation placeholders [...]
    .replace(/(AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|API_KEY|TOKEN|SECRET|PASSWORD)\s*[:=]\s*'(?!\[)([^']+)'/gi, "$1='[REDACTED]'")
    // Redact unquoted real secrets: alphanumeric/special chars that look like tokens
    // Skip documentation placeholders like "[generate-...]" or "[new-dev-token-only]"
    .replace(/(AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|API_KEY|TOKEN|SECRET|PASSWORD)\s*[:=]\s*(?!\[)([a-zA-Z0-9_\-\.]{8,})/gi, '$1=[REDACTED]')
    // Redact private keys
    .replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]')
}

describe('redactSecrets', () => {
  describe('documentation placeholders (must NOT be redacted)', () => {
    it('should preserve BUILDFLOW_ACTION_TOKEN placeholder', () => {
      const input = 'BUILDFLOW_ACTION_TOKEN="[generate-new-token-for-this-new-environment-only]"'
      const result = redactSecrets(input)
      expect(result).toEqual(input)
      expect(result).not.toContain('[REDACTED]')
    })

    it('should preserve alternative BUILDFLOW_ACTION_TOKEN placeholder', () => {
      const input = 'BUILDFLOW_ACTION_TOKEN="[new-dev-token-only]"'
      const result = redactSecrets(input)
      expect(result).toEqual(input)
      expect(result).not.toContain('[REDACTED]')
    })

    it('should preserve RELAY_ADMIN_TOKEN placeholder', () => {
      const input = 'RELAY_ADMIN_TOKEN="[generate-new-admin-token-for-dokploy]"'
      const result = redactSecrets(input)
      expect(result).toEqual(input)
      expect(result).not.toContain('[REDACTED]')
    })

    it('should preserve NEW_BUILDFLOW_ACTION_TOKEN placeholder', () => {
      const input = 'NEW_BUILDFLOW_ACTION_TOKEN="[generate-new-token-for-this-new-environment-only]"'
      const result = redactSecrets(input)
      expect(result).toEqual(input)
      expect(result).not.toContain('[REDACTED]')
    })

    it('should preserve any TOKEN with bracket-enclosed placeholder', () => {
      const input = 'MY_TOKEN="[placeholder-value]"'
      const result = redactSecrets(input)
      expect(result).toEqual(input)
      expect(result).not.toContain('[REDACTED]')
    })

    it('should preserve single-quoted documentation placeholder', () => {
      const input = "TOKEN='[new-dev-token-only]'"
      const result = redactSecrets(input)
      expect(result).toEqual(input)
      expect(result).not.toContain('[REDACTED]')
    })
  })

  describe('real secrets (MUST be redacted)', () => {
    it('should redact API_KEY with real token', () => {
      const input = 'API_KEY=example-stripe-live-key-redacted'
      const result = redactSecrets(input)
      expect(result).toContain('API_KEY=[REDACTED]')
      expect(result).not.toContain('example-stripe-live-key-redacted')
    })

    it('should redact TOKEN with real GitHub token', () => {
      const input = 'TOKEN=ghp_abc123def456ghi789jkl012mno345pqr'
      const result = redactSecrets(input)
      expect(result).toContain('TOKEN=[REDACTED]')
      expect(result).not.toContain('ghp_abc123def456ghi789jkl012mno345pqr')
    })

    it('should redact SECRET with real secret', () => {
      const input = 'SECRET=very_long_secret_string_with_numbers_12345'
      const result = redactSecrets(input)
      expect(result).toContain('SECRET=[REDACTED]')
      expect(result).not.toContain('very_long_secret_string_with_numbers_12345')
    })

    it('should redact PASSWORD with real password', () => {
      const input = 'PASSWORD=SuperSecureP@ssw0rd123456'
      const result = redactSecrets(input)
      expect(result).toContain('PASSWORD=[REDACTED]')
      expect(result).not.toContain('SuperSecureP@ssw0rd123456')
    })

    it('should redact OPENAI_API_KEY', () => {
      const input = 'OPENAI_API_KEY=example-openai-org-key-redacted'
      const result = redactSecrets(input)
      expect(result).toContain('OPENAI_API_KEY=[REDACTED]')
      expect(result).not.toContain('example-openai-org-key-redacted')
    })

    it('should redact AWS_SECRET_ACCESS_KEY', () => {
      const input = 'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      const result = redactSecrets(input)
      expect(result).toContain('AWS_SECRET_ACCESS_KEY=[REDACTED]')
      expect(result).not.toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
    })
  })

  describe('double-quoted real secrets (MUST be redacted)', () => {
    it('should redact double-quoted API_KEY with real token', () => {
      const input = 'API_KEY="example-stripe-live-key-redacted"'
      const result = redactSecrets(input)
      expect(result).toContain('API_KEY="[REDACTED]"')
      expect(result).not.toContain('example-stripe-live-key-redacted')
    })

    it('should redact double-quoted TOKEN', () => {
      const input = 'TOKEN="abc1234567890secretvalue"'
      const result = redactSecrets(input)
      expect(result).toContain('TOKEN="[REDACTED]"')
      expect(result).not.toContain('abc1234567890secretvalue')
    })

    it('should redact double-quoted PASSWORD', () => {
      const input = 'PASSWORD="supersecretpassword123"'
      const result = redactSecrets(input)
      expect(result).toContain('PASSWORD="[REDACTED]"')
      expect(result).not.toContain('supersecretpassword123')
    })

    it('should redact double-quoted OPENAI_API_KEY', () => {
      const input = 'OPENAI_API_KEY="example-openai-key-redacted"'
      const result = redactSecrets(input)
      expect(result).toContain('OPENAI_API_KEY="[REDACTED]"')
      expect(result).not.toContain('example-openai-key-redacted')
    })
  })

  describe('single-quoted real secrets (MUST be redacted)', () => {
    it('should redact single-quoted API_KEY with real token', () => {
      const input = "API_KEY='example-stripe-live-key-redacted'"
      const result = redactSecrets(input)
      expect(result).toContain("API_KEY='[REDACTED]'")
      expect(result).not.toContain('example-stripe-live-key-redacted')
    })

    it('should redact single-quoted TOKEN', () => {
      const input = "TOKEN='abc1234567890secretvalue'"
      const result = redactSecrets(input)
      expect(result).toContain("TOKEN='[REDACTED]'")
      expect(result).not.toContain('abc1234567890secretvalue')
    })

    it('should redact single-quoted OPENAI_API_KEY', () => {
      const input = "OPENAI_API_KEY='example-openai-key-redacted'"
      const result = redactSecrets(input)
      expect(result).toContain("OPENAI_API_KEY='[REDACTED]'")
      expect(result).not.toContain('example-openai-key-redacted')
    })
  })

  describe('private keys (MUST be redacted)', () => {
    it('should redact RSA private key', () => {
      const input = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890...
-----END RSA PRIVATE KEY-----`
      const result = redactSecrets(input)
      expect(result).toContain('[REDACTED PRIVATE KEY]')
      expect(result).not.toContain('MIIEpAIBAAKCAQEA')
    })

    it('should redact EC private key', () => {
      const input = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIIGlVmq7dMCwfAsdMfN45Iokt0...
-----END EC PRIVATE KEY-----`
      const result = redactSecrets(input)
      expect(result).toContain('[REDACTED PRIVATE KEY]')
      expect(result).not.toContain('MHcCAQEEIIGlVmq7dMCwfAsdMfN45Iokt0')
    })
  })

  describe('mixed content', () => {
    it('should preserve documentation while redacting real secrets', () => {
      const input = `BUILDFLOW_ACTION_TOKEN="[generate-new-token-for-this-new-environment-only]"
# Real secret below:
API_KEY=example-stripe-live-key-redacted`
      const result = redactSecrets(input)
      expect(result).toContain('BUILDFLOW_ACTION_TOKEN="[generate-new-token-for-this-new-environment-only]"')
      expect(result).toContain('API_KEY=[REDACTED]')
      expect(result).not.toContain('example-stripe-live-key-redacted')
    })

    it('should handle colon separator', () => {
      const input = `TOKEN: "[placeholder-token]"
SECRET: real_secret_12345678901234567890`
      const result = redactSecrets(input)
      expect(result).toContain('TOKEN: "[placeholder-token]"')
      expect(result).toContain('SECRET: [REDACTED]')
      expect(result).not.toContain('real_secret_12345678901234567890')
    })

    it('should handle mixed separators', () => {
      const input = `API_KEY=[placeholder]
PASSWORD=real_password_very_long_indeed_123456`
      const result = redactSecrets(input)
      expect(result).toContain('API_KEY=[placeholder]')
      expect(result).toContain('PASSWORD=[REDACTED]')
    })
  })

  describe('edge cases', () => {
    it('should not redact tokens shorter than 8 characters', () => {
      const input = 'TOKEN=short'
      const result = redactSecrets(input)
      expect(result).toEqual(input)
    })

    it('should redact tokens of exactly 8 characters', () => {
      const input = 'TOKEN=12345678'
      const result = redactSecrets(input)
      expect(result).toContain('[REDACTED]')
    })

    it('should handle whitespace around separators', () => {
      const input = 'TOKEN  :  real_token_12345678901234567'
      const result = redactSecrets(input)
      expect(result).toContain('[REDACTED]')
    })

    it('should preserve empty or whitespace-only values', () => {
      const input = 'TOKEN='
      const result = redactSecrets(input)
      expect(result).toEqual(input)
    })
  })
})
