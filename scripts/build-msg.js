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
const withFallback = (value, fallback = 'unknown') => (value ? value : fallback)

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
	const response = await fetch(loggerApiUrl, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			data: buildLogBase64,
			contentType: BUILD_LOG_CONTENT_TYPE
		})
	})
	const res = await response.text()
	if (!response.ok) {
		console.log('Build log upload failed', res)
		return ''
	}
	return res.trim()
}

// convert the bash script above to JS
const BUILD_LLAMAS = process.env.BUILD_LLAMAS || ''
const BUILD_STATUS_DASHBOARD = process.env.BUILD_STATUS_DASHBOARD
const BUILD_STATUS_WEBHOOK = process.env.BUILD_STATUS_WEBHOOK
const EMOJI_BINOCULARS = '<:binoculars:1012832136459456582>'
const EMOJI_CRINGE = '<:llamacringe:1073375066164822159>'
const EMOJI_LLAMACHEER = '<:llamacheer:1012832279195832331>'
const EMOJI_BONG = '<:bong:970440561087631360>'
const EMOJI_BEEGLUBB = '<:beeglubb:1027125046281502740>'
const EMOJI_UPLLAMA = '<:upllama:996096214841950269>'
const EMOJI_EVIL = '<:evilllama:1011045461030879353>'
const EMOJI_PEPENOTES = '<a:pepenotes:1061068916140544052>'

const buildLlamaUsers = BUILD_LLAMAS.split(',')
	.map((llama) => llama.trim())
	.filter(Boolean)
const llamaNames = buildLlamaUsers.join(', ') || 'none'
const llamaMentions = buildLlamaUsers.map((name) => (name.startsWith('@') ? name : `@${name}`)).join(' ')

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

let commitSummary = `📂 defillama-app\n💬 ${withFallback(COMMIT_COMMENT)}\n🦙 ${withFallback(
	COMMIT_AUTHOR
)}\n📸 ${withFallback(COMMIT_HASH)}\n🌿 ${withFallback(BRANCH_NAME)}\n👥 Llamas: ${llamaNames}`

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
	const message = `\`\`\`\n===== COMMIT SUMMARY =====\n${commitSummary}\n\n===== BUILD SUMMARY =====\n${buildSummary}\n\`\`\``
	const body = { content: message }
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
		const buildLogMessage = `${EMOJI_PEPENOTES} ${buildLogUrl}`
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

	if (BUILD_STATUS !== '0') {
		if (buildLlamaUsers.length > 0) {
			const llamaMessage = `${EMOJI_CRINGE} ${llamaMentions}\n${EMOJI_BINOCULARS} ${BUILD_STATUS_DASHBOARD}`
			const llamaBody = { content: llamaMessage }
			await checkWebhookResponse(
				await fetch(BUILD_STATUS_WEBHOOK, {
					method: 'POST',
					body: JSON.stringify(llamaBody),
					headers: { 'Content-Type': 'application/json' }
				})
			)
		}
	} else {
		const emojis = [EMOJI_LLAMACHEER, EMOJI_BONG, EMOJI_BEEGLUBB, EMOJI_UPLLAMA, EMOJI_EVIL]
		const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
		const llamaMessage = `${randomEmoji}`
		const llamaBody = { content: llamaMessage }
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
