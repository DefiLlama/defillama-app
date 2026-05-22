import fs from 'node:fs/promises'
import type { BuildResult } from './buildResult'
import { formatDurationMs } from './buildResult'
import type { LogLike } from './logger'

type Fetch = typeof fetch

type SendBuildNotificationOptions = {
	env?: NodeJS.ProcessEnv
	fetchImpl?: Fetch
	logger?: LogLike
	readFile?: typeof fs.readFile
	result: BuildResult
}

type BuildNotificationResult = { status: 'sent'; buildLogUrl: string } | { reason: string; status: 'skipped' }

const BUILD_LOG_CONTENT_TYPE = 'text/plain;charset=UTF-8'

function normalize(value: string | undefined): string {
	return value?.trim() ?? ''
}

function formatUserMentions(value: string | undefined): string {
	return normalize(value)
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean)
		.map((id) => `<@${id}>`)
		.join(' ')
}

function formatBuildNotificationSummary(result: BuildResult): string {
	let summary =
		result.status === 'success'
			? `🎉 Build succeeded in ${formatDurationMs(result.durationMs)}`
			: `🚨 Build failed in ${formatDurationMs(result.durationMs)}`
	summary += '\n📂 defillama-app\n'
	if (result.branchName) {
		summary = `🪾 ${result.branchName}\n` + summary
	}
	summary += `\n📅 Build started at ${result.startedAt}`
	if (result.buildId) {
		summary += `\n📦 Build ID: ${result.buildId}`
	}
	return summary
}

async function postWebhook(fetchImpl: Fetch, webhookUrl: string, body: unknown, logger: LogLike) {
	try {
		const response = await fetchImpl(webhookUrl, {
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST'
		})
		if (!response.ok) {
			logger.log('Failed to post webhook', await response.text())
		}
	} catch (error) {
		logger.log('Failed to post webhook', error)
	}
}

async function uploadBuildLog({
	env,
	fetchImpl,
	logger,
	readFile,
	result
}: Required<
	Pick<SendBuildNotificationOptions, 'env' | 'fetchImpl' | 'logger' | 'readFile' | 'result'>
>): Promise<string> {
	const loggerApiUrl = normalize(env.LOGGER_API_URL)
	const loggerApiKey = normalize(env.LOGGER_API_KEY)

	if (!loggerApiUrl) {
		logger.log('LOGGER_API_URL not set, skipping upload')
		return ''
	}

	const buildLog = await readFile(result.logPath, 'utf8').catch(() => '')
	if (!buildLog) {
		logger.log('build.log missing or empty, skipping upload')
		return ''
	}

	const headers: Record<string, string> = { 'Content-Type': 'application/json' }
	if (loggerApiKey) {
		headers.apikey = loggerApiKey
	}

	try {
		const response = await fetchImpl(loggerApiUrl, {
			body: JSON.stringify({
				contentType: BUILD_LOG_CONTENT_TYPE,
				data: Buffer.from(buildLog).toString('base64')
			}),
			headers,
			method: 'POST'
		})
		const responseText = await response.text()
		if (!response.ok) {
			logger.log('Build log upload failed', responseText)
			return ''
		}
		return responseText.trim()
	} catch (error) {
		logger.log('Build log upload error', error)
		return ''
	}
}

export async function sendBuildNotification({
	env = process.env,
	fetchImpl = fetch,
	logger = console,
	readFile = fs.readFile,
	result
}: SendBuildNotificationOptions): Promise<BuildNotificationResult> {
	if (env.SKIP_BUILD_NOTIFY === '1') {
		logger.log('SKIP_BUILD_NOTIFY=1, skipping Discord notification')
		return { reason: 'skip flag', status: 'skipped' }
	}

	const webhookUrl = normalize(env.BUILD_STATUS_WEBHOOK)
	if (!webhookUrl) {
		logger.log('BUILD_STATUS_WEBHOOK not set, skipping discord notification')
		return { reason: 'missing webhook', status: 'skipped' }
	}

	await postWebhook(
		fetchImpl,
		webhookUrl,
		{
			allowed_mentions: { parse: ['users', 'roles'] },
			content: `\`\`\`${'===== BUILD SUMMARY =====\n' + formatBuildNotificationSummary(result)}\`\`\``
		},
		logger
	)

	let buildLogUrl = ''
	const buildLogId = await uploadBuildLog({ env, fetchImpl, logger, readFile, result })
	if (buildLogId) {
		buildLogUrl = `${normalize(env.LOGGER_API_URL)}/get/${buildLogId}`
		logger.log(buildLogUrl)
		await postWebhook(fetchImpl, webhookUrl, { content: buildLogUrl }, logger)
	} else {
		logger.log('Build log upload skipped')
	}

	const userMentions = formatUserMentions(env.BUILD_NOTIFY_USERS)
	if (result.exitCode !== 0 && userMentions) {
		await postWebhook(
			fetchImpl,
			webhookUrl,
			{
				allowed_mentions: { parse: ['users'] },
				content: userMentions
			},
			logger
		)
	}

	return { buildLogUrl, status: 'sent' }
}
