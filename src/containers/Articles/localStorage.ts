import { readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { migrateLocalArticleDocument } from './migrations'
import type { LocalArticleDocument } from './types'

export const LOCAL_ARTICLE_PATH = path.join(process.cwd(), 'Article.json')

export async function readLocalArticleDocument(): Promise<LocalArticleDocument | null> {
	try {
		const raw = await readFile(LOCAL_ARTICLE_PATH, 'utf8')
		const parsed = JSON.parse(raw) as unknown
		const migrated = migrateLocalArticleDocument(parsed)
		if (migrated.ok === false) {
			throw new Error(migrated.error)
		}
		return migrated.value
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
		throw error
	}
}

export async function writeLocalArticleDocument(article: LocalArticleDocument) {
	const tempPath = `${LOCAL_ARTICLE_PATH}.tmp`
	await writeFile(tempPath, `${JSON.stringify(article, null, 2)}\n`, 'utf8')
	await rename(tempPath, LOCAL_ARTICLE_PATH)
}
