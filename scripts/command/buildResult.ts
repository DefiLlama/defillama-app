import fs from 'node:fs/promises'
import path from 'node:path'

type BuildStatus = 'failure' | 'success'

export type BuildResult = {
	branchName: string
	buildId: string
	durationMs: number
	exitCode: number
	logPath: string
	startedAt: string
	status: BuildStatus
}

type CreateBuildResultOptions = {
	branchName: string
	buildId: string
	exitCode: number
	finishedAt: Date
	logPath: string
	startedAt: Date
}

export function formatDurationMs(durationMs: number): string {
	const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

export function createBuildResult({
	branchName,
	buildId,
	exitCode,
	finishedAt,
	logPath,
	startedAt
}: CreateBuildResultOptions): BuildResult {
	return {
		branchName,
		buildId,
		durationMs: finishedAt.getTime() - startedAt.getTime(),
		exitCode,
		logPath,
		startedAt: startedAt.toISOString(),
		status: exitCode === 0 ? 'success' : 'failure'
	}
}

export function formatBuildResultSummary(result: BuildResult): string {
	const lines = [
		result.status === 'success'
			? `Build succeeded in ${formatDurationMs(result.durationMs)}`
			: `Build failed in ${formatDurationMs(result.durationMs)}`,
		`Build started at: ${result.startedAt}`
	]

	if (result.buildId) {
		lines.push(`Build ID: ${result.buildId}`)
	}
	if (result.branchName) {
		lines.push(`Branch: ${result.branchName}`)
	}

	return lines.join('\n')
}

async function findBuildManifest(dir: string): Promise<string> {
	const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])

	for (const entry of entries) {
		const entryPath = path.join(dir, entry.name)
		if (entry.isFile() && entry.name === '_buildManifest.js') {
			return entryPath
		}
		if (entry.isDirectory()) {
			const found = await findBuildManifest(entryPath)
			if (found) return found
		}
	}

	return ''
}

export async function findNextBuildId(projectDir: string): Promise<string> {
	const buildManifest = await findBuildManifest(path.join(projectDir, '.next'))
	return buildManifest ? path.basename(path.dirname(buildManifest)) : ''
}
