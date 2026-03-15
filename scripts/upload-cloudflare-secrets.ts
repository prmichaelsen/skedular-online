#!/usr/bin/env tsx
/**
 * Upload Cloudflare Secrets Script
 *
 * Uploads environment variables from .env to Cloudflare Workers secrets.
 * Uses .env.cloudflare.local for Cloudflare API credentials.
 *
 * Usage:
 *   npx tsx scripts/upload-cloudflare-secrets.ts
 *
 * Prerequisites:
 *   1. Create .env.cloudflare.local with:
 *      CLOUDFLARE_API_KEY=your_api_key
 *      CLOUDFLARE_EMAIL=your_email
 *      CLOUDFLARE_ACCOUNT_ID=your_account_id (optional, will use wrangler.toml)
 *   2. Ensure .env exists with secrets to upload
 *   3. Install wrangler: npm install -g wrangler
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdtempSync } from 'fs'
import { resolve, join } from 'path'
import { tmpdir } from 'os'

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function error(message: string) {
  log(`❌ ${message}`, 'red')
}

function success(message: string) {
  log(`✅ ${message}`, 'green')
}

function info(message: string) {
  log(`ℹ️  ${message}`, 'blue')
}

function warn(message: string) {
  log(`⚠️  ${message}`, 'yellow')
}

/**
 * Parse .env file into key-value pairs
 */
function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const content = readFileSync(filePath, 'utf-8')
  const env: Record<string, string> = {}

  for (const line of content.split('\n')) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) {
      continue
    }

    // Parse KEY=VALUE
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      // Try to resolve file paths — check multiple patterns:
      // 1. Explicit paths: ./file, /file, ../file
      // 2. Filenames with extensions: something.json, something.pem, etc.
      const looksLikePath = value.startsWith('./') || value.startsWith('/') || value.startsWith('../')
        || /^[\w./-]+\.(json|pem|key|cert|txt|env)$/i.test(value)

      if (looksLikePath) {
        const resolvedPath = resolve(filePath, '..', value)
        if (existsSync(resolvedPath)) {
          env[key] = readFileSync(resolvedPath, 'utf-8').trim()
          continue
        }
        // Path-like value but file doesn't exist — warn and skip to prevent bad secrets
        console.warn(`⚠️  ${key}: value looks like a file path (${value}) but file not found at ${resolvedPath}. Skipping.`)
        continue
      }

      env[key] = value
    }
  }

  return env
}

/**
 * Upload a secret to Cloudflare Workers using a temporary file
 * This avoids shell escaping issues with complex JSON secrets
 */
function uploadSecret(key: string, value: string, projectName: string): boolean {
  let tempFile: string | null = null

  try {
    // Create a temporary directory
    const tempDir = mkdtempSync(join(tmpdir(), 'cf-secrets-'))
    tempFile = join(tempDir, `${key}.txt`)

    // Write secret value to temp file
    writeFileSync(tempFile, value, 'utf-8')

    // Use wrangler versions secret put to avoid deployment requirement
    // This avoids shell escaping issues with complex JSON
    execSync(`wrangler versions secret put ${key} --name ${projectName} < ${tempFile}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
      shell: '/bin/bash', // Ensure bash is used for proper redirection
    })
    
    return true
  } catch (err) {
    error(`Failed to upload ${key}: ${err instanceof Error ? err.message : String(err)}`)
    return false
  } finally {
    // Clean up temp file
    if (tempFile && existsSync(tempFile)) {
      try {
        unlinkSync(tempFile)
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Main function
 */
async function main() {
  log('\n🚀 Cloudflare Secrets Upload Script\n', 'cyan')

  // Support --env-file or --env flag for alternate env files (e.g., .env.e1.local)
  let envFileArg = process.argv.indexOf('--env-file')
  if (envFileArg === -1) envFileArg = process.argv.indexOf('--env')
  const envFileName = envFileArg !== -1 && process.argv[envFileArg + 1]
    ? process.argv[envFileArg + 1]
    : '.env'

  // Check for required files
  const envPath = resolve(process.cwd(), envFileName)
  const cloudflareEnvPath = resolve(process.cwd(), '.env.cloudflare.local')

  if (!existsSync(envPath)) {
    error(`${envFileName} file not found`)
    process.exit(1)
  }

  if (!existsSync(cloudflareEnvPath)) {
    error('.env.cloudflare.local file not found')
    info('Create this file with:')
    info('  CLOUDFLARE_API_KEY=your_api_key')
    info('  CLOUDFLARE_EMAIL=your_email')
    info('  CLOUDFLARE_ACCOUNT_ID=your_account_id (optional)')
    process.exit(1)
  }

  // Load Cloudflare credentials
  const cloudflareEnv = parseEnvFile(cloudflareEnvPath)
  
  if (!cloudflareEnv.CLOUDFLARE_API_KEY || !cloudflareEnv.CLOUDFLARE_EMAIL) {
    error('CLOUDFLARE_API_KEY and CLOUDFLARE_EMAIL must be set in .env.cloudflare.local')
    process.exit(1)
  }

  // Set Cloudflare credentials as environment variables for wrangler
  process.env.CLOUDFLARE_API_KEY = cloudflareEnv.CLOUDFLARE_API_KEY
  process.env.CLOUDFLARE_EMAIL = cloudflareEnv.CLOUDFLARE_EMAIL
  
  if (cloudflareEnv.CLOUDFLARE_ACCOUNT_ID) {
    process.env.CLOUDFLARE_ACCOUNT_ID = cloudflareEnv.CLOUDFLARE_ACCOUNT_ID
  }

  // Support --worker-name flag to target a specific worker (e.g., agentbase-e1)
  const workerNameArg = process.argv.indexOf('--worker-name')
  const workerNameOverride = workerNameArg !== -1 && process.argv[workerNameArg + 1]
    ? process.argv[workerNameArg + 1]
    : null

  // Get project name from --worker-name flag or wrangler.toml
  let projectName: string | null = workerNameOverride
  if (!projectName) {
    try {
      const wranglerConfig = readFileSync(resolve(process.cwd(), 'wrangler.toml'), 'utf-8')
      const nameMatch = wranglerConfig.match(/name\s*=\s*"([^"]+)"/)
      if (nameMatch) {
        projectName = nameMatch[1]
      }
    } catch (err) {
      // fall through to error below
    }
    if (!projectName) {
      error('Could not determine worker name. Either add `name` to wrangler.toml or pass --worker-name.')
      process.exit(1)
    }
  }

  info(`Project: ${projectName}`)
  info(`Cloudflare Email: ${cloudflareEnv.CLOUDFLARE_EMAIL}\n`)

  // Support --only flag to upload specific secret(s)
  const onlyArg = process.argv.indexOf('--only')
  const onlyKeys = onlyArg !== -1 && process.argv[onlyArg + 1]
    ? process.argv[onlyArg + 1].split(',').map(k => k.trim())
    : null

  // Load secrets from .env
  const secrets = parseEnvFile(envPath)

  // Filter out VITE_ prefixed variables (these are public), then apply --only filter
  let secretKeys = Object.keys(secrets).filter(key => !key.startsWith('VITE_'))
  if (onlyKeys) {
    const missing = onlyKeys.filter(k => !secretKeys.includes(k))
    if (missing.length) {
      error(`Keys not found in ${envFileName}: ${missing.join(', ')}`)
      process.exit(1)
    }
    secretKeys = onlyKeys
  }

  if (secretKeys.length === 0) {
    warn('No secrets found to upload (excluding VITE_ variables)')
    process.exit(0)
  }

  info(`Found ${secretKeys.length} secrets to upload\n`)

  // Confirm before uploading
  log('Secrets to upload:', 'yellow')
  secretKeys.forEach(key => {
    const val = secrets[key]
    const masked = val.length <= 4
      ? '****'
      : `${val.substring(0, 2)}${'*'.repeat(Math.min(val.length - 4, 20))}${val.substring(val.length - 2)}`
    log(`  - ${key}: ${masked} (${val.length} chars)`, 'yellow')
  })

  log('\n⚠️  This will overwrite existing secrets in Cloudflare Workers', 'yellow')
  log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n', 'yellow')

  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Upload secrets
  let successCount = 0
  let failCount = 0

  for (const key of secretKeys) {
    process.stdout.write(`Uploading ${key}... `)
    
    if (uploadSecret(key, secrets[key], projectName)) {
      success('✓')
      successCount++
    } else {
      error('✗')
      failCount++
    }
  }

  // Summary
  log('\n' + '='.repeat(50), 'cyan')
  log(`Upload complete: ${successCount} succeeded, ${failCount} failed`, 'cyan')
  log('='.repeat(50) + '\n', 'cyan')

  if (failCount > 0) {
    process.exit(1)
  }
}

// Run main function
main().catch(err => {
  error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
