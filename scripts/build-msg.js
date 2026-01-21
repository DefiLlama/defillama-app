import { execSync } from 'child_process'
import fs from 'fs'

const normalize = (value) => (typeof value === 'string' ? value.trim() : '')
const normalizeBranchName = (value) => {
	const normalized = normalize(value)
	if (!normalized) {
		return ''
	}
	const stripped = normalized.replace(/^refs\/(heads|tags)\//, '').replace(/^refs\//, '')
	return stripped === 'HEAD' ? '' : stripped
}
const resolveValue = (value) => (typeof value === 'function' ? value() : value)
const firstNonEmpty = (...values) => {
	for (const value of values) {
		const resolved = resolveValue(value)
		const normalized = normalize(resolved)
		if (normalized) {
			return normalized
		}
	}
	return ''
}
const firstNonEmptyLine = (...values) => {
	for (const value of values) {
		const resolved = resolveValue(value)
		const normalized = normalize(resolved)
		if (!normalized) {
			continue
		}
		const firstLine = normalized.split('\n').find((line) => line.trim().length > 0)
		if (firstLine) {
			return firstLine.trim()
		}
	}
	return ''
}
const tryGit = (command) => {
	try {
		return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim()
	} catch {
		return ''
	}
}
const withFallback = (value, fallback = '') => (value ? value : fallback)
const formatLlamaMention = (value) => {
	const normalized = normalize(value)
	if (!normalized) {
		return ''
	}
	if (normalized.startsWith('<@') && normalized.endsWith('>')) {
		return normalized
	}
	if (normalized.startsWith('@')) {
		const handle = normalized.slice(1)
		if (/^\d+$/.test(handle)) {
			return `<@${handle}>`
		}
		return `@${handle}`
	}
	if (/^\d+$/.test(normalized)) {
		return `<@${normalized}>`
	}
	return `@${normalized}`
}

// read the build.log file into base64 string (optional)
let buildLogBase64 = ''
try {
	const buildLog = fs.readFileSync('./build.log', 'utf8')
	buildLogBase64 = Buffer.from(buildLog).toString('base64')
} catch {
	console.log('build.log not found, skipping upload')
}
const BUILD_LOG_CONTENT_TYPE = 'text/plain;charset=UTF-8'
const LOGGER_API_KEY = process.env.LOGGER_API_KEY
const LOGGER_API_URL = process.env.LOGGER_API_URL
const loggerApiKey = normalize(LOGGER_API_KEY)
const loggerApiUrl = normalize(LOGGER_API_URL)

// upload the build.log file to the logger service
const uploadBuildLog = async () => {
	if (!buildLogBase64) {
		console.log('build.log missing or empty, skipping upload')
		return ''
	}
	if (!loggerApiUrl) {
		console.log('LOGGER_API_URL not set, skipping upload')
		return ''
	}
	const headers = { 'Content-Type': 'application/json' }
	if (loggerApiKey) {
		headers.apikey = loggerApiKey
	}
	try {
		let response
		let res = ''
		try {
			response = await fetch(loggerApiUrl, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					data: buildLogBase64,
					contentType: BUILD_LOG_CONTENT_TYPE
				})
			})
			res = await response.text()
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			console.log('Build log upload error', message)
			return ''
		}
		if (!response.ok) {
			console.log('Build log upload failed', res)
			return ''
		}
		return res.trim()
	} catch (error) {
		console.log('Build log upload failed', error)
		return ''
	}
}

// convert the bash script above to JS
const BUILD_LLAMAS = process.env.BUILD_LLAMAS || ''
const BUILD_STATUS_DASHBOARD = process.env.BUILD_STATUS_DASHBOARD
const BUILD_STATUS_WEBHOOK = process.env.BUILD_STATUS_WEBHOOK

const buildLlamaUsers = BUILD_LLAMAS.split(',')
	.map((llama) => llama.trim())
	.filter(Boolean)
const llamaNames = buildLlamaUsers.join(', ') || 'none'
const llamaMentions = buildLlamaUsers.map(formatLlamaMention).filter(Boolean).join(' ')

// node ./scripts/build-msg.js $BUILD_STATUS "$BUILD_TIME_STR" "$START_TIME" "$BUILD_ID" "$COMMIT_COMMENT" "$COMMIT_AUTHOR" "$COMMIT_HASH" "$BRANCH_NAME"
const BUILD_STATUS = process.argv[2]
const BUILD_TIME_STR = process.argv[3]
const START_TIME = process.argv[4]
const BUILD_ID = process.argv[5]
const COMMIT_COMMENT = firstNonEmptyLine(
	process.argv[6],
	process.env.COMMIT_COMMENT,
	process.env.COMMIT_MESSAGE,
	process.env.CI_COMMIT_MESSAGE,
	process.env.VERCEL_GIT_COMMIT_MESSAGE,
	process.env.GIT_COMMIT_MESSAGE,
	() => tryGit('git log -1 --pretty=%B')
)
const COMMIT_AUTHOR = firstNonEmpty(
	process.argv[7],
	process.env.COMMIT_AUTHOR,
	process.env.CI_COMMIT_AUTHOR,
	process.env.GIT_AUTHOR_NAME,
	process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN,
	process.env.GITHUB_ACTOR,
	process.env.GITLAB_USER_NAME,
	() => tryGit('git log -1 --pretty=%an')
)
const COMMIT_HASH = firstNonEmpty(
	process.argv[8],
	process.env.COMMIT_HASH,
	process.env.SOURCE_COMMIT,
	process.env.CI_COMMIT_SHA,
	process.env.VERCEL_GIT_COMMIT_SHA,
	process.env.GITHUB_SHA,
	process.env.COMMIT_REF,
	process.env.SOURCE_VERSION,
	() => tryGit('git rev-parse HEAD')
)
const BRANCH_NAME = firstNonEmpty(
	normalizeBranchName(process.argv[9]),
	normalizeBranchName(process.env.BRANCH_NAME),
	normalizeBranchName(process.env.COOLIFY_BRANCH),
	normalizeBranchName(process.env.GIT_BRANCH),
	normalizeBranchName(process.env.CI_COMMIT_REF_NAME),
	normalizeBranchName(process.env.GITHUB_HEAD_REF),
	normalizeBranchName(process.env.GITHUB_REF_NAME),
	normalizeBranchName(process.env.GITHUB_REF),
	normalizeBranchName(process.env.VERCEL_GIT_COMMIT_REF),
	normalizeBranchName(process.env.CIRCLE_BRANCH),
	normalizeBranchName(process.env.TRAVIS_BRANCH),
	normalizeBranchName(process.env.BITBUCKET_BRANCH),
	normalizeBranchName(process.env.NETLIFY_BRANCH),
	normalizeBranchName(process.env.BUILD_SOURCEBRANCHNAME),
	normalizeBranchName(process.env.CF_PAGES_BRANCH),
	() => normalizeBranchName(tryGit('git rev-parse --abbrev-ref HEAD'))
)

let buildSummary =
	BUILD_STATUS === '0' ? `🎉 Build succeeded in ${BUILD_TIME_STR}` : `🚨 Build failed in ${BUILD_TIME_STR}`
buildSummary += `\n📅 Build started at ${START_TIME}`
if (BUILD_ID) {
	buildSummary += `\n📦 Build ID: ${BUILD_ID}`
}

const commitMessageLabel = withFallback(COMMIT_COMMENT, 'unknown commit message')
const commitAuthorLabel = withFallback(COMMIT_AUTHOR, 'unknown author')
const commitHashLabel = withFallback(COMMIT_HASH, 'unknown commit id')
const branchLabel = withFallback(BRANCH_NAME, 'unknown branch')

let commitSummary = `📂 defillama-app\n🪾 ${branchLabel}\n💬 ${commitMessageLabel}\n🦙 ${commitAuthorLabel}\n📸 ${commitHashLabel}`

async function checkWebhookResponse(bodyResponse) {
	if (!bodyResponse.ok) {
		console.log(`Failed to post webhook`, await bodyResponse.text())
	}
}

const sendMessages = async () => {
	if (!BUILD_STATUS_WEBHOOK) {
		console.log('BUILD_STATUS_WEBHOOK not set, skipping discord notification')
		return
	}
	const llamaSummary = llamaMentions ? `Build llamas: ${llamaMentions}` : `Build llamas: ${llamaNames}`
	const message = `\`\`\`\n===== COMMIT SUMMARY =====\n${commitSummary}\n\n===== BUILD SUMMARY =====\n${buildSummary}\n\`\`\`\n${llamaSummary}`
	const body = {
		content: message,
		allowed_mentions: { parse: ['users', 'roles'] }
	}
	await checkWebhookResponse(
		await fetch(BUILD_STATUS_WEBHOOK, {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		})
	)

	const buildLogId = await uploadBuildLog()
	if (buildLogId) {
		const buildLogUrl = `${loggerApiUrl}/get/${buildLogId}`
		const buildLogMessage = buildLogUrl
		console.log(buildLogMessage)
		const buildLogBody = { content: buildLogMessage }
		await checkWebhookResponse(
			await fetch(BUILD_STATUS_WEBHOOK, {
				method: 'POST',
				body: JSON.stringify(buildLogBody),
				headers: { 'Content-Type': 'application/json' }
			})
		)
	} else {
		console.log('Build log upload skipped')
	}

	if (BUILD_STATUS !== '0' && buildLlamaUsers.length > 0) {
		const llamaMessage = [
			'Build failed.',
			llamaMentions ? `Build llamas: ${llamaMentions}` : `Build llamas: ${llamaNames}`,
			BUILD_STATUS_DASHBOARD
		]
			.filter(Boolean)
			.join('\n')
		const llamaBody = {
			content: llamaMessage,
			allowed_mentions: { parse: ['users', 'roles'] }
		}
		await checkWebhookResponse(
			await fetch(BUILD_STATUS_WEBHOOK, {
				method: 'POST',
				body: JSON.stringify(llamaBody),
				headers: { 'Content-Type': 'application/json' }
			})
		)
	}
}

sendMessages()
