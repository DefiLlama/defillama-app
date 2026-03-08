import fs from 'fs'

const normalize = (value) => (typeof value === 'string' ? value.trim() : '')
const normalizeBranchName = (value) => {
	const normalized = normalize(value)
	if (!normalized) return ''
	const stripped = normalized.replace(/^refs\/(heads|tags)\//, '').replace(/^refs\//, '')
	return stripped === 'HEAD' ? '' : stripped
}
const firstNonEmpty = (...values) => {
	for (const value of values) {
		const normalized = normalize(value)
		if (normalized) return normalized
	}
	return ''
}

let buildLogBase64 = ''
try {
	const buildLog = fs.readFileSync('./build.log', 'utf8')
	buildLogBase64 = Buffer.from(buildLog).toString('base64')
} catch {
	console.log('build.log not found, skipping upload')
}

const BUILD_LOG_CONTENT_TYPE = 'text/plain;charset=UTF-8'
const loggerApiKey = normalize(process.env.LOGGER_API_KEY)
const loggerApiUrl = normalize(process.env.LOGGER_API_URL)

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
		const response = await fetch(loggerApiUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({ data: buildLogBase64, contentType: BUILD_LOG_CONTENT_TYPE })
		})
		const res = await response.text()
		if (!response.ok) {
			console.log('Build log upload failed', res)
			return ''
		}
		return res.trim()
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.log('Build log upload error', message)
		return ''
	}
}

const BUILD_STATUS_WEBHOOK = process.env.BUILD_STATUS_WEBHOOK

// Comma-separated Discord user IDs to ping on build failure (e.g. "123456789,987654321")
const BUILD_NOTIFY_USERS = normalize(process.env.BUILD_NOTIFY_USERS)
const userMentions = BUILD_NOTIFY_USERS
	? BUILD_NOTIFY_USERS.split(',')
			.map((id) => id.trim())
			.filter(Boolean)
			.map((id) => `<@${id}>`)
			.join(' ')
	: ''

// build.sh exports these; fallback branch detection for non-Docker environments
const BUILD_STATUS = normalize(process.env.BUILD_STATUS)
const BUILD_TIME_STR = normalize(process.env.BUILD_TIME_STR)
const START_TIME = normalize(process.env.START_TIME)
const BUILD_ID = normalize(process.env.BUILD_ID)
const BRANCH_NAME = firstNonEmpty(
	normalizeBranchName(process.env.BRANCH_NAME),
	normalizeBranchName(process.env.COOLIFY_BRANCH),
	normalizeBranchName(process.env.GITHUB_HEAD_REF),
	normalizeBranchName(process.env.GITHUB_REF_NAME),
	normalizeBranchName(process.env.GITHUB_REF),
	''
)

if (!BUILD_STATUS || !BUILD_TIME_STR || !START_TIME) {
	console.log(
		'Missing required env vars for build message:',
		['BUILD_STATUS', 'BUILD_TIME_STR', 'START_TIME'].filter((k) => !normalize(process.env[k])).join(', ')
	)
}

const formatSummary = () => {
	let summary =
		BUILD_STATUS === '0' ? `🎉 Build succeeded in ${BUILD_TIME_STR}` : `🚨 Build failed in ${BUILD_TIME_STR}`
	summary += '\n📂 defillama-app\n'
	if (BRANCH_NAME) {
		summary = `🪾 ${BRANCH_NAME}\n` + summary
	}
	summary += `\n📅 Build started at ${START_TIME}`
	if (BUILD_ID) {
		summary += `\n📦 Build ID: ${BUILD_ID}`
	}
	return summary
}

async function postWebhook(body) {
	const response = await fetch(BUILD_STATUS_WEBHOOK, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' }
	})
	if (!response.ok) {
		console.log('Failed to post webhook', await response.text())
	}
}

const sendMessages = async () => {
	if (!BUILD_STATUS_WEBHOOK) {
		console.log('BUILD_STATUS_WEBHOOK not set, skipping discord notification')
		return
	}

	await postWebhook({
		content: `\`\`\`${'===== BUILD SUMMARY =====\n' + formatSummary()}\`\`\``,
		allowed_mentions: { parse: ['users', 'roles'] }
	})

	const buildLogId = await uploadBuildLog()
	if (buildLogId) {
		const buildLogUrl = `${loggerApiUrl}/get/${buildLogId}`
		console.log(buildLogUrl)
		await postWebhook({ content: buildLogUrl })
	} else {
		console.log('Build log upload skipped')
	}

	if (BUILD_STATUS !== '0' && userMentions) {
		await postWebhook({
			content: userMentions,
			allowed_mentions: { parse: ['users'] }
		})
	}
}

sendMessages().catch((error) => {
	console.log('Build notification failed:', error instanceof Error ? error.message : String(error))
})
