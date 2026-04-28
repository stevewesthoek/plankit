import { Command } from 'commander'
import { redactSecrets } from '../agent/safe-access'

export function diagnosticRedactionCommand(): Command {
  const cmd = new Command('diagnose-redaction')
    .description('Diagnostic command to verify redactSecrets behavior and document content handling')
    .action(async () => {
      console.log('🔍 BuildFlow Redaction Diagnostics')
      console.log('=' .repeat(60))
      console.log()

      // Test 1: Documentation placeholders
      console.log('TEST 1: Documentation Placeholders (should NOT be redacted)')
      console.log('-'.repeat(60))
      const docTests = [
        { name: 'BUILDFLOW_ACTION_TOKEN placeholder', value: 'BUILDFLOW_ACTION_TOKEN="[generate-new-token-for-this-new-environment-only]"' },
        { name: 'NEW_BUILDFLOW_ACTION_TOKEN placeholder', value: 'NEW_BUILDFLOW_ACTION_TOKEN="[generate-new-token-for-this-new-environment-only]"' },
        { name: 'RELAY_ADMIN_TOKEN placeholder', value: 'RELAY_ADMIN_TOKEN="[generate-new-admin-token-for-dokploy]"' },
        { name: 'Generic TOKEN placeholder', value: 'TOKEN="[placeholder-value]"' }
      ]

      let docPass = 0
      for (const test of docTests) {
        const result = redactSecrets(test.value)
        const pass = result === test.value
        console.log(`${pass ? '✅' : '❌'} ${test.name}`)
        if (!pass) console.log(`   Expected: ${test.value}`)
        if (!pass) console.log(`   Got:      ${result}`)
        if (pass) docPass++
      }
      console.log(`Result: ${docPass}/${docTests.length} documentation placeholders preserved\n`)

      // Test 2: Real secrets
      console.log('TEST 2: Real Secrets (SHOULD be redacted)')
      console.log('-'.repeat(60))
      const secretTests = [
        { name: 'API_KEY with real token', value: 'API_KEY=example-stripe-live-key-redacted', shouldContain: '[REDACTED]' },
        { name: 'GitHub TOKEN', value: 'TOKEN=ghp_abc123def456ghi789jkl012mno345pqr', shouldContain: '[REDACTED]' },
        { name: 'AWS_SECRET_ACCESS_KEY', value: 'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', shouldContain: '[REDACTED]' }
      ]

      let secretPass = 0
      for (const test of secretTests) {
        const result = redactSecrets(test.value)
        const pass = result.includes(test.shouldContain) && !result.includes(test.value.split('=')[1])
        console.log(`${pass ? '✅' : '❌'} ${test.name}`)
        if (!pass) console.log(`   Expected to contain: ${test.shouldContain}`)
        if (!pass) console.log(`   Got:                 ${result}`)
        if (pass) secretPass++
      }
      console.log(`Result: ${secretPass}/${secretTests.length} real secrets redacted\n`)

      // Test 2b: Quoted real secrets
      console.log('TEST 2B: Quoted Real Secrets (SHOULD be redacted)')
      console.log('-'.repeat(60))
      const quotedSecretTests = [
        { name: 'Double-quoted API_KEY', value: 'API_KEY="example-stripe-live-key-redacted"', shouldContain: 'API_KEY="[REDACTED]"' },
        { name: 'Single-quoted TOKEN', value: "TOKEN='abc1234567890secretvalue'", shouldContain: "TOKEN='[REDACTED]'" },
        { name: 'Double-quoted OPENAI_API_KEY', value: 'OPENAI_API_KEY="example-openai-key-redacted"', shouldContain: 'OPENAI_API_KEY="[REDACTED]"' }
      ]

      let quotedSecretPass = 0
      for (const test of quotedSecretTests) {
        const result = redactSecrets(test.value)
        const pass = result.includes(test.shouldContain) && !result.includes(test.value.split('=')[1])
        console.log(`${pass ? '✅' : '❌'} ${test.name}`)
        if (!pass) console.log(`   Expected to contain: ${test.shouldContain}`)
        if (!pass) console.log(`   Got:                 ${result}`)
        if (pass) quotedSecretPass++
      }
      console.log(`Result: ${quotedSecretPass}/${quotedSecretTests.length} quoted secrets redacted\n`)

      // Test 3: Private keys
      console.log('TEST 3: Private Keys (SHOULD be redacted)')
      console.log('-'.repeat(60))
      const keyValue = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890
-----END RSA PRIVATE KEY-----`
      const keyResult = redactSecrets(keyValue)
      const keyPass = keyResult.includes('[REDACTED PRIVATE KEY]') && !keyResult.includes('MIIEpAIBAAKCAQEA')
      console.log(`${keyPass ? '✅' : '❌'} Private key redaction`)
      if (keyPass) console.log('   ✅ Private keys are properly redacted\n')

      // Summary
      console.log('=' .repeat(60))
      const totalPass = docPass + secretPass + quotedSecretPass + (keyPass ? 1 : 0)
      const totalTests = docTests.length + secretTests.length + quotedSecretTests.length + 1
      console.log(`Summary: ${totalPass}/${totalTests} tests passed`)

      if (totalPass === totalTests) {
        console.log('🎉 All diagnostics passed!')
        console.log()
        console.log('BuildFlow correctly:')
        console.log('  • Preserves documentation placeholders in [...] format (quoted and unquoted)')
        console.log('  • Redacts unquoted real secrets (8+ char tokens without brackets)')
        console.log('  • Redacts double-quoted real secrets')
        console.log('  • Redacts single-quoted real secrets')
        console.log('  • Redacts private keys')
        console.log()
        console.log('Documentation sources will display exact content without masking.')
        console.log('Real credentials are protected even when quoted.')
      } else {
        console.log('⚠️  Some diagnostics failed. Check the details above.')
        process.exit(1)
      }
    })

  return cmd
}
