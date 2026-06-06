import path from 'node:path'
import { flushTelemetry, recordDomainEvent } from '~/utils/telemetry'
import { syncBuildArtifacts } from './artifactSync'
import { detectBranchName } from './branch'
import { sendBuildNotification } from './buildNotification'
import { createBuildResult, findNextBuildId, formatBuildResultSummary, type BuildResult } from './buildResult'
import type { CommandLogger } from './logger'
import { createRedactedConsoleLogger, createTeeLogger } from './logger'
import { runPreparationCommand } from './prepare'
import { createSecretRedactor } from './redaction'
import { runChild, type ActiveChildren, type RunChildResult } from './runChild'

type DeployBuildOptions = {
	activeChildren?: ActiveChildren
	branchName?: string
	env?: NodeJS.ProcessEnv
	findBuildId?: () => Promise<string>
	logger?: CommandLogger
	logPath?: string
	now?: () => Date
	notify?: (result: BuildResult) => Promise<unknown>
	projectDir?: string
	runNextBuild?: (logger: CommandLogger) => Promise<RunChildResult>
	runPrepare?: () => Promise<number>
	syncArtifacts?: (result: BuildResult) => Promise<unknown>
}

function createDefaultNextBuildRunner({
	activeChildren,
	env,
	projectDir
}: {
	activeChildren?: ActiveChildren
	env: NodeJS.ProcessEnv
	projectDir: string
}): (logger: CommandLogger) => Promise<RunChildResult> {
	return (logger) =>
		runChild(
			path.join(projectDir, 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next'),
			['build'],
			{
				activeChildren,
				cwd: projectDir,
				env,
				logger
			}
		)
}

function formatNextBuildFailure(result: RunChildResult): string {
	if (result.signal) {
		return `Next.js build failed after signal ${result.signal}`
	}
	return `Next.js build failed with exit code ${result.exitCode ?? 1}`
}

function firstEnvValue(env: NodeJS.ProcessEnv, keys: readonly string[]): string {
	for (const key of keys) {
		const value = env[key]?.trim()
		if (value) return value
	}
	return ''
}

function detectCommitSha(env: NodeJS.ProcessEnv): string {
	return firstEnvValue(env, [
		'SOURCE_COMMIT',
		'VERCEL_GIT_COMMIT_SHA',
		'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA',
		'GITHUB_SHA'
	])
}

function finishedAtFromBuildResult(result: BuildResult): string {
	return new Date(Date.parse(result.startedAt) + result.durationMs).toISOString()
}

async function recordBuildCompleteTelemetry(result: BuildResult, env: NodeJS.ProcessEnv): Promise<void> {
	const branch = result.branchName || 'unknown'
	const level = result.status === 'success' ? 'info' : 'warn'
	recordDomainEvent(
		'build.complete',
		level,
		branch,
		`Build ${result.status === 'success' ? 'completed' : 'failed'} on ${branch}`,
		{
			branch,
			build_id: result.buildId,
			commit_sha: detectCommitSha(env),
			duration_ms: result.durationMs,
			exit_code: result.exitCode,
			finished_at: finishedAtFromBuildResult(result),
			started_at: result.startedAt,
			status: result.status
		}
	)
	await flushTelemetry({ runtime: 'build', timeoutMs: 2000 })
}

export async function runDeployBuild({
	activeChildren,
	branchName,
	env = process.env,
	findBuildId,
	logger,
	logPath,
	now = () => new Date(),
	notify,
	projectDir = process.cwd(),
	runNextBuild,
	runPrepare,
	syncArtifacts
}: DeployBuildOptions = {}): Promise<BuildResult> {
	const buildLogPath = logPath ?? path.join(projectDir, 'build.log')
	const buildLogger = logger ?? createTeeLogger({ logPath: buildLogPath, redactor: createSecretRedactor(env) })
	const startedAt = now()
	const resolvedBranchName = branchName ?? detectBranchName(env)

	buildLogger.log('')
	buildLogger.log('=======================')
	buildLogger.log('New build started')
	if (resolvedBranchName) buildLogger.log(`Branch: ${resolvedBranchName}`)
	buildLogger.log('=======================')
	buildLogger.log('')

	const runPrepareStep =
		runPrepare ??
		(async () => {
			const result = await runPreparationCommand({
				env,
				logger: buildLogger,
				prefix: '[build:prepare]',
				repoRoot: projectDir
			})
			return result.exitCode
		})
	let exitCode = await runPrepareStep()

	if (exitCode === 0) {
		buildLogger.log('Next.js build started')
		const runNextBuildStep = runNextBuild ?? createDefaultNextBuildRunner({ activeChildren, env, projectDir })
		const nextResult = await runNextBuildStep(buildLogger)
		exitCode = nextResult.exitCode ?? 1
		if (exitCode === 0 && !nextResult.signal) {
			buildLogger.log('Next.js build finished successfully')
		} else {
			buildLogger.log(formatNextBuildFailure(nextResult))
		}
	} else {
		buildLogger.log('Skipping next build due to earlier failure')
	}

	const finishedAt = now()
	const buildId = await (findBuildId ?? (() => findNextBuildId(projectDir)))().catch((error) => {
		buildLogger.log(`Failed to resolve Next.js build ID: ${error instanceof Error ? error.message : String(error)}`)
		return ''
	})
	const result = createBuildResult({
		branchName: resolvedBranchName,
		buildId,
		exitCode,
		finishedAt,
		logPath: buildLogPath,
		startedAt
	})

	buildLogger.log('')
	buildLogger.log('=======================')
	buildLogger.log(formatBuildResultSummary(result))
	buildLogger.log('=======================')
	buildLogger.log('')

	if (result.exitCode === 0) {
		const syncArtifactsStep =
			syncArtifacts ??
			((buildResult: BuildResult) =>
				syncBuildArtifacts({
					activeChildren,
					env,
					logger: buildLogger,
					projectDir,
					result: buildResult
				}))
		await syncArtifactsStep(result)
	} else {
		buildLogger.log('Build failed, skipping .next artifact sync')
	}
	await recordBuildCompleteTelemetry(result, env)

	buildLogger.flush()
	buildLogger.close()
	const notificationLogger = createRedactedConsoleLogger(env)
	try {
		const notifyStep =
			notify ??
			((buildResult: BuildResult) => sendBuildNotification({ env, logger: notificationLogger, result: buildResult }))
		await notifyStep(result)
	} catch (error) {
		notificationLogger.log('Build notification failed:', error)
	}

	return result
}
