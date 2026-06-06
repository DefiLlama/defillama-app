import { promises as fs } from 'node:fs'

export async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fs.access(targetPath)
		return true
	} catch {
		return false
	}
}

export async function ensureDirectory(targetPath: string): Promise<void> {
	await fs.mkdir(targetPath, { recursive: true })
}

export async function removeDirectory(targetPath: string): Promise<void> {
	await fs.rm(targetPath, { recursive: true, force: true })
}

export async function recoverDirectoryReplacement(targetDir: string, backupDir: string): Promise<void> {
	const targetExists = await pathExists(targetDir)
	if (targetExists) {
		if (await pathExists(backupDir)) {
			await removeDirectory(backupDir)
		}
		return
	}

	if (await pathExists(backupDir)) {
		await fs.rename(backupDir, targetDir)
	}
}

// This uses a backup-and-promote flow. It is recoverable, but not truly atomic
// because readers can observe a brief window where targetDir is absent.
export async function replaceDirectoryWithBackup(params: {
	targetDir: string
	nextDir: string
	backupDir: string
}): Promise<void> {
	const { targetDir, nextDir, backupDir } = params

	await recoverDirectoryReplacement(targetDir, backupDir)
	await removeDirectory(backupDir)

	let movedTargetToBackup = false
	let promotedNextToTarget = false

	try {
		if (await pathExists(targetDir)) {
			await fs.rename(targetDir, backupDir)
			movedTargetToBackup = true
		}

		await fs.rename(nextDir, targetDir)
		promotedNextToTarget = true
		if (await pathExists(backupDir)) {
			await removeDirectory(backupDir)
		}
	} catch (error) {
		if (
			!promotedNextToTarget &&
			movedTargetToBackup &&
			!(await pathExists(targetDir)) &&
			(await pathExists(backupDir))
		) {
			await fs.rename(backupDir, targetDir)
		}
		throw error
	}
}
