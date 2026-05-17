import path from 'node:path'
import type { BuildResult } from './buildResult'
import type { CommandLogger } from './logger'
import { runChild, type ActiveChildren, type RunChildResult } from './runChild'

type ArtifactSyncOptions = {
	activeChildren?: ActiveChildren
	env?: NodeJS.ProcessEnv
	logger: Pick<CommandLogger, 'log' | 'stderr' | 'stdout'>
	projectDir?: string
	result: BuildResult
	runCommand?: typeof runChild
}

type ArtifactSyncResult =
	| { status: 'failed'; step: 'download' | 'upload'; result: RunChildResult }
	| { status: 'skipped'; reason: string }
	| { status: 'success' }

export async function syncBuildArtifacts({
	activeChildren,
	env = process.env,
	logger,
	projectDir = process.cwd(),
	result,
	runCommand = runChild
}: ArtifactSyncOptions): Promise<ArtifactSyncResult> {
	if (env.SKIP_ARTIFACT_SYNC === '1') {
		logger.log('SKIP_ARTIFACT_SYNC=1, skipping rclone sync')
		return { reason: 'skip flag', status: 'skipped' }
	}
	if (result.exitCode !== 0) {
		logger.log('Build failed, skipping .next artifact sync')
		return { reason: 'build failed', status: 'skipped' }
	}

	const configPath = path.join('scripts', 'rclone.conf')
	const staticPath = path.join('.', '.next', 'static')
	const remotePath = 'artifacts:defillama-app-artifacts'
	// Intentionally upload and then download .next/static so each deploy shares
	// the multi-node artifact set; both directions are checked before success.
	const upload = await runCommand('rclone', ['--config', configPath, 'copy', staticPath, remotePath], {
		activeChildren,
		cwd: projectDir,
		env,
		logger
	})
	if (upload.exitCode !== 0) {
		logger.log('rclone artifact upload failed')
		return { result: upload, status: 'failed', step: 'upload' }
	}

	const download = await runCommand('rclone', ['--config', configPath, 'copy', remotePath, staticPath], {
		activeChildren,
		cwd: projectDir,
		env,
		logger
	})
	if (download.exitCode !== 0) {
		logger.log('rclone artifact download failed')
		return { result: download, status: 'failed', step: 'download' }
	}

	return { status: 'success' }
}
