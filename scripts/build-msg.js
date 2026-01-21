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

const parseGitHubRepo = (url) => {
	if (!url) return ''
	// Handle various GitHub URL formats:
	// https://github.com/owner/repo.git
	// git@github.com:owner/repo.git
	// owner/repo
	const httpsMatch = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/)
	if (httpsMatch) return httpsMatch[1]
	const sshMatch = url.match(/github\.com:([^/]+\/[^/]+?)(?:\.git)?$/)
	if (sshMatch) return sshMatch[1]
	// Direct owner/repo format
	if (/^[^/]+\/[^/]+$/.test(url)) return url
	return ''
}

const fetchGitHubCommitInfo = async (sha) => {
	const repoUrl = firstNonEmpty(
		process.env.COOLIFY_GIT_REPOSITORY,
		process.env.GIT_REPOSITORY,
		process.env.GITHUB_REPOSITORY,
		() => tryGit('git config --get remote.origin.url')
	)
	const repo = parseGitHubRepo(repoUrl)
	if (!repo || !sha) {
		console.log('GitHub API: Missing repo or SHA', { repo, sha: sha?.slice(0, 7) })
		return null
	}
	try {
		const url = `https://api.github.com/repos/${repo}/commits/${sha}`
		console.log(`GitHub API: Fetching commit info from ${repo}`)
		const headers = { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'defillama-build' }
		const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
		if (token) {
			headers.Authorization = `Bearer ${token}`
		}
		const res = await fetch(url, { headers })
		if (!res.ok) {
			console.log(`GitHub API: Failed with status ${res.status}`)
			return null
		}
		const data = await res.json()
		return {
			message: data.commit?.message?.split('\n')[0] || '',
			author: data.commit?.author?.name || data.author?.login || '',
			sha: data.sha || ''
		}
	} catch (error) {
		console.log('GitHub API: Error fetching commit', error instanceof Error ? error.message : String(error))
		return null
	}
}
const withFallback = (value, fallback = '') => (value ? value : fallback)

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
	.map((llama) => `@${llama}`)
	.join(' ')

// node ./scripts/build-msg.js $BUILD_STATUS "$BUILD_TIME_STR" "$START_TIME" "$BUILD_ID" "$COMMIT_COMMENT" "$COMMIT_AUTHOR" "$COMMIT_HASH" "$BRANCH_NAME"
const BUILD_STATUS = process.argv[2]
const BUILD_TIME_STR = process.argv[3]
const START_TIME = process.argv[4]
const BUILD_ID = process.argv[5]
let COMMIT_COMMENT = firstNonEmptyLine(
	process.argv[6],
	process.env.COMMIT_COMMENT,
	process.env.COMMIT_MESSAGE,
	process.env.CI_COMMIT_MESSAGE,
	process.env.VERCEL_GIT_COMMIT_MESSAGE,
	process.env.GIT_COMMIT_MESSAGE,
	() => tryGit('git log -1 --pretty=%B')
)
let COMMIT_AUTHOR = firstNonEmpty(
	process.argv[7],
	process.env.COMMIT_AUTHOR,
	process.env.CI_COMMIT_AUTHOR,
	process.env.GIT_AUTHOR_NAME,
	process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN,
	process.env.GITHUB_ACTOR,
	process.env.GITLAB_USER_NAME,
	() => tryGit('git log -1 --pretty=%an')
)
let COMMIT_HASH = firstNonEmpty(
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

// Try to fetch missing commit info from GitHub API
const enrichCommitInfo = async () => {
	const needsMessage = !COMMIT_COMMENT
	const needsAuthor = !COMMIT_AUTHOR
	const needsHash = !COMMIT_HASH

	if (!needsMessage && !needsAuthor) {
		console.log('Commit info already available, skipping GitHub API')
		return
	}

	// We need at least a hash to query GitHub
	if (!COMMIT_HASH) {
		console.log('No commit hash available, cannot fetch from GitHub API')
		return
	}

	console.log('Fetching missing commit info from GitHub API...')
	const info = await fetchGitHubCommitInfo(COMMIT_HASH)
	if (!info) {
		console.log('GitHub API returned no data')
		return
	}

	if (needsMessage && info.message) {
		COMMIT_COMMENT = info.message
		console.log(`GitHub API: Got commit message: ${info.message.slice(0, 50)}...`)
	}
	if (needsAuthor && info.author) {
		COMMIT_AUTHOR = info.author
		console.log(`GitHub API: Got commit author: ${info.author}`)
	}
}
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

const buildBuildSummary = () => {
	let summary =
		BUILD_STATUS === '0' ? `🎉 Build succeeded in ${BUILD_TIME_STR}` : `🚨 Build failed in ${BUILD_TIME_STR}`
	summary += `\n📅 Build started at ${START_TIME}`
	if (BUILD_ID) {
		summary += `\n📦 Build ID: ${BUILD_ID}`
	}
	return summary
}

const buildCommitSummary = () => {
	const commitMessageLabel = withFallback(COMMIT_COMMENT, 'unknown commit message')
	const commitAuthorLabel = withFallback(COMMIT_AUTHOR, 'unknown author')
	const commitHashLabel = withFallback(COMMIT_HASH, 'unknown commit id')
	const branchLabel = withFallback(BRANCH_NAME, 'unknown branch')
	return `📂 defillama-app\n🪾 ${branchLabel}\n💬 ${commitMessageLabel}\n🦙 ${commitAuthorLabel}\n📸 ${commitHashLabel}`
}

async function checkWebhookResponse(bodyResponse) {
	if (!bodyResponse.ok) {
		console.log(`Failed to post webhook`, await bodyResponse.text())
	}
}

const sendMessages = async () => {
	// Enrich commit info from GitHub API if needed
	await enrichCommitInfo()

	if (!BUILD_STATUS_WEBHOOK) {
		console.log('BUILD_STATUS_WEBHOOK not set, skipping discord notification')
		return
	}

	const buildSummary = buildBuildSummary()
	const commitSummary = buildCommitSummary()

	const message = [
		'===== COMMIT SUMMARY =====',
		commitSummary,
		'===== BUILD SUMMARY =====',
		buildSummary,
		buildLlamaUsers || null
	]
		.filter(Boolean)
		.join('\n')
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

	if (BUILD_STATUS !== '0') {
		const llamaMessage = ['Build failed.', buildLlamaUsers || null, BUILD_STATUS_DASHBOARD || null]
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
