import { normalizeLocalArticleDocument } from './document'
import type { LocalArticleDocument, ValidationResult } from './types'

export function migrateLocalArticleDocument(input: unknown): ValidationResult<LocalArticleDocument> {
	const normalized = normalizeLocalArticleDocument(input)
	if (!normalized.ok) return normalized

	return {
		ok: true,
		value: {
			...normalized.value,
			contentVersion: 1,
			rendererVersion: 1,
			editorSchemaVersion: 1
		}
	}
}
