import { createHash, createHmac } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { LogLike } from './logger'

const DEFAULT_BUCKET = 'defillama-app-artifacts'
const DEFAULT_REGION = 'auto'
const DEFAULT_SOURCE_DIR = '.next/static'
const STATIC_CACHE_CONTROL = 'public,max-age=31536000,immutable'

type FetchLike = (input: string, init: RequestInit) => Promise<Response>

type R2UploadConfig = {
	accessKeyId: string
	bucket: string
	endpoint: string
	prefix: string
	region: string
	secretAccessKey: string
	sourceDir: string
}

type R2UploadOptions = {
	env?: NodeJS.ProcessEnv
	fetchImpl?: FetchLike
	logger?: LogLike
	now?: () => Date
	projectDir?: string
	sourceDir?: string
}

type R2UploadResult =
	| { reason: string; status: 'skipped' }
	| { bucket: string; bytes: number; files: number; prefix: string; sourceDir: string; status: 'success' }

type UploadFile = {
	fullPath: string
	key: string
}

function firstEnvValue(env: NodeJS.ProcessEnv, keys: readonly string[]): string {
	for (const key of keys) {
		const value = env[key]?.trim()
		if (value) return value
	}
	return ''
}

function normalizeEndpoint(endpoint: string): string {
	const endpointWithProtocol = /^https?:\/\//.test(endpoint) ? endpoint : `https://${endpoint}`
	const url = new URL(endpointWithProtocol)
	url.hash = ''
	url.search = ''
	url.pathname = url.pathname.replace(/\/+$/, '')
	return url.toString().replace(/\/+$/, '')
}

function normalizePrefix(prefix: string): string {
	return prefix
		.split('/')
		.map((part) => part.trim())
		.filter(Boolean)
		.join('/')
}

function resolveEndpoint(env: NodeJS.ProcessEnv): string {
	const endpoint = firstEnvValue(env, ['R2_ENDPOINT', 'RCLONE_CONFIG_ARTIFACTS_ENDPOINT'])
	if (endpoint) return normalizeEndpoint(endpoint)

	const accountId = firstEnvValue(env, ['R2_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID'])
	if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`

	return ''
}

function resolveR2UploadConfig({
	env = process.env,
	projectDir = process.cwd(),
	sourceDir
}: Pick<R2UploadOptions, 'env' | 'projectDir' | 'sourceDir'> = {}): R2UploadConfig {
	const accessKeyId = firstEnvValue(env, ['R2_ACCESS_KEY_ID', 'RCLONE_CONFIG_ARTIFACTS_ACCESS_KEY_ID'])
	const secretAccessKey = firstEnvValue(env, ['R2_SECRET_ACCESS_KEY', 'RCLONE_CONFIG_ARTIFACTS_SECRET_ACCESS_KEY'])
	const endpoint = resolveEndpoint(env)
	const missing: string[] = []

	if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID or RCLONE_CONFIG_ARTIFACTS_ACCESS_KEY_ID')
	if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY or RCLONE_CONFIG_ARTIFACTS_SECRET_ACCESS_KEY')
	if (!endpoint) missing.push('R2_ENDPOINT, R2_ACCOUNT_ID, or RCLONE_CONFIG_ARTIFACTS_ENDPOINT')
	if (missing.length > 0) {
		throw new Error(`Missing R2 upload environment variables: ${missing.join(', ')}`)
	}

	const configuredSourceDir = (sourceDir ?? firstEnvValue(env, ['R2_ARTIFACT_SOURCE_DIR'])) || DEFAULT_SOURCE_DIR

	return {
		accessKeyId,
		bucket: firstEnvValue(env, ['R2_ARTIFACT_BUCKET']) || DEFAULT_BUCKET,
		endpoint,
		prefix: normalizePrefix(firstEnvValue(env, ['R2_ARTIFACT_PREFIX'])),
		region: firstEnvValue(env, ['R2_REGION']) || DEFAULT_REGION,
		secretAccessKey,
		sourceDir: path.resolve(projectDir, configuredSourceDir)
	}
}

async function collectUploadFiles(sourceDir: string, prefix: string): Promise<UploadFile[]> {
	const files: UploadFile[] = []

	async function walk(dir: string): Promise<void> {
		const entries = await fs.readdir(dir, { withFileTypes: true })
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name)
			if (entry.isDirectory()) {
				await walk(fullPath)
			} else if (entry.isFile()) {
				const relativePath = path.relative(sourceDir, fullPath).split(path.sep).join('/')
				files.push({ fullPath, key: prefix ? `${prefix}/${relativePath}` : relativePath })
			}
		}
	}

	await walk(sourceDir)
	return files
}

function contentTypeForPath(filePath: string): string {
	const extension = path.extname(filePath).toLowerCase()
	switch (extension) {
		case '.css':
			return 'text/css;charset=UTF-8'
		case '.gif':
			return 'image/gif'
		case '.html':
			return 'text/html;charset=UTF-8'
		case '.ico':
			return 'image/x-icon'
		case '.jpeg':
		case '.jpg':
			return 'image/jpeg'
		case '.js':
		case '.mjs':
			return 'text/javascript;charset=UTF-8'
		case '.json':
		case '.map':
			return 'application/json;charset=UTF-8'
		case '.png':
			return 'image/png'
		case '.svg':
			return 'image/svg+xml'
		case '.txt':
			return 'text/plain;charset=UTF-8'
		case '.wasm':
			return 'application/wasm'
		case '.webp':
			return 'image/webp'
		case '.woff':
			return 'font/woff'
		case '.woff2':
			return 'font/woff2'
		default:
			return 'application/octet-stream'
	}
}

function hashHex(value: Buffer | string): string {
	return createHash('sha256').update(value).digest('hex')
}

function hmac(key: Buffer | string, value: string): Buffer {
	return createHmac('sha256', key).update(value).digest()
}

function hmacHex(key: Buffer, value: string): string {
	return createHmac('sha256', key).update(value).digest('hex')
}

function formatAmzDate(now: Date): string {
	return now.toISOString().replace(/[:-]|\.\d{3}/g, '')
}

function encodePathPart(value: string): string {
	return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

function encodeObjectKey(value: string): string {
	return value.split('/').map(encodePathPart).join('/')
}

function createSigningKey(secretAccessKey: string, date: string, region: string): Buffer {
	const dateKey = hmac(`AWS4${secretAccessKey}`, date)
	const regionKey = hmac(dateKey, region)
	const serviceKey = hmac(regionKey, 's3')
	return hmac(serviceKey, 'aws4_request')
}

function createSignedPutRequest(
	config: R2UploadConfig,
	file: UploadFile,
	body: Buffer,
	now: Date
): RequestInit & { url: string } {
	const url = `${config.endpoint}/${encodePathPart(config.bucket)}/${encodeObjectKey(file.key)}`
	const parsedUrl = new URL(url)
	const amzDate = formatAmzDate(now)
	const date = amzDate.slice(0, 8)
	const payloadHash = hashHex(body)
	const contentType = contentTypeForPath(file.fullPath)
	const signedHeaderValues: Record<string, string> = {
		'cache-control': STATIC_CACHE_CONTROL,
		'content-type': contentType,
		host: parsedUrl.host,
		'x-amz-content-sha256': payloadHash,
		'x-amz-date': amzDate
	}
	const signedHeaderKeys = Object.keys(signedHeaderValues).sort()
	const canonicalHeaders = signedHeaderKeys
		.map((key) => `${key}:${signedHeaderValues[key].trim().replace(/\s+/g, ' ')}\n`)
		.join('')
	const signedHeaders = signedHeaderKeys.join(';')
	const canonicalRequest = ['PUT', parsedUrl.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
	const scope = `${date}/${config.region}/s3/aws4_request`
	const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, hashHex(canonicalRequest)].join('\n')
	const signature = hmacHex(createSigningKey(config.secretAccessKey, date, config.region), stringToSign)
	const requestBody = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer

	return {
		body: requestBody,
		headers: {
			Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
			'Cache-Control': STATIC_CACHE_CONTROL,
			'Content-Type': contentType,
			'x-amz-content-sha256': payloadHash,
			'x-amz-date': amzDate
		},
		method: 'PUT',
		url
	}
}

async function putObject({
	config,
	fetchImpl,
	file,
	now
}: {
	config: R2UploadConfig
	fetchImpl: FetchLike
	file: UploadFile
	now: () => Date
}): Promise<number> {
	const body = await fs.readFile(file.fullPath)
	const { url, ...request } = createSignedPutRequest(config, file, body, now())
	const response = await fetchImpl(url, request)
	if (!response.ok) {
		const responseBody = await response.text().catch(() => '')
		throw new Error(
			`R2 upload failed for ${file.key}: ${response.status} ${response.statusText}${responseBody ? `: ${responseBody.slice(0, 500)}` : ''}`
		)
	}
	return body.byteLength
}

export async function uploadR2BuildArtifacts({
	env = process.env,
	fetchImpl = fetch,
	logger = console,
	now = () => new Date(),
	projectDir = process.cwd(),
	sourceDir
}: R2UploadOptions = {}): Promise<R2UploadResult> {
	if (env.SKIP_R2_UPLOAD === '1') {
		logger.log('SKIP_R2_UPLOAD=1, skipping R2 artifact upload')
		return { reason: 'skip flag', status: 'skipped' }
	}

	const config = resolveR2UploadConfig({ env, projectDir, sourceDir })
	const files = await collectUploadFiles(config.sourceDir, config.prefix)
	logger.log(
		`Uploading ${files.length} build artifact files from ${path.relative(projectDir, config.sourceDir)} to R2 bucket ${config.bucket}${config.prefix ? `/${config.prefix}` : ''}`
	)

	let nextFileIndex = 0
	let uploadedFiles = 0
	let uploadedBytes = 0
	const uploadConcurrency = Math.min(8, files.length)
	const workers: Array<Promise<void>> = []

	for (let i = 0; i < uploadConcurrency; i++) {
		workers.push(
			(async () => {
				for (;;) {
					const file = files[nextFileIndex]
					nextFileIndex++
					if (!file) return
					const bytes = await putObject({ config, fetchImpl, file, now })
					uploadedFiles++
					uploadedBytes += bytes
				}
			})()
		)
	}

	await Promise.all(workers)
	logger.log(`Uploaded ${uploadedFiles} build artifact files (${uploadedBytes} bytes) to R2`)
	return {
		bucket: config.bucket,
		bytes: uploadedBytes,
		files: uploadedFiles,
		prefix: config.prefix,
		sourceDir: config.sourceDir,
		status: 'success'
	}
}
