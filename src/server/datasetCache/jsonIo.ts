import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export async function readJsonFileOnce<T>(filePath: string): Promise<T> {
	const fileContent = await fs.readFile(filePath, 'utf8')
	return JSON.parse(fileContent) as T
}

export async function writeJsonFileAtomically(filePath: string, value: unknown): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true })
	const tempPath = `${filePath}.tmp-${process.pid}-${randomUUID()}`
	let handle: Awaited<ReturnType<typeof fs.open>> | null = null

	try {
		handle = await fs.open(tempPath, 'w')
		await handle.writeFile(JSON.stringify(value))
		await handle.sync()
		await handle.close()
		handle = null
		await fs.rename(tempPath, filePath)
	} catch (error) {
		if (handle) {
			await handle.close().catch(() => undefined)
		}
		await fs.rm(tempPath, { force: true }).catch(() => undefined)
		throw error
	}
}
