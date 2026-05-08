export type DiffOp =
	| { type: 'equal'; value: string }
	| { type: 'add'; value: string }
	| { type: 'remove'; value: string }

const PARAGRAPH_SPLIT = /\n{2,}/
const WORD_TOKENIZE = /(\s+)/

const MAX_WORD_DIFF_TOKENS = 4000

function lcs<T>(
	a: T[],
	b: T[],
	eq: (x: T, y: T) => boolean = (x, y) => x === y
): { type: 'equal' | 'add' | 'remove'; index: number }[] {
	const n = a.length
	const m = b.length
	const dp: Uint32Array[] = []
	for (let i = 0; i <= n; i += 1) dp.push(new Uint32Array(m + 1))
	for (let i = 1; i <= n; i += 1) {
		for (let j = 1; j <= m; j += 1) {
			if (eq(a[i - 1], b[j - 1])) {
				dp[i][j] = dp[i - 1][j - 1] + 1
			} else {
				dp[i][j] = dp[i - 1][j] >= dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1]
			}
		}
	}
	const out: { type: 'equal' | 'add' | 'remove'; index: number }[] = []
	let i = n
	let j = m
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && eq(a[i - 1], b[j - 1])) {
			out.push({ type: 'equal', index: i - 1 })
			i -= 1
			j -= 1
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			out.push({ type: 'add', index: j - 1 })
			j -= 1
		} else {
			out.push({ type: 'remove', index: i - 1 })
			i -= 1
		}
	}
	out.reverse()
	return out
}

function coalesce(ops: DiffOp[]): DiffOp[] {
	const out: DiffOp[] = []
	for (const op of ops) {
		const last = out[out.length - 1]
		if (last && last.type === op.type) {
			last.value += op.value
		} else {
			out.push({ ...op })
		}
	}
	return out
}

function tokenizeWords(text: string): string[] {
	if (!text) return []
	return text.split(WORD_TOKENIZE).filter((token) => token.length > 0)
}

export function diffWords(oldText: string, newText: string): DiffOp[] {
	if (oldText === newText) return [{ type: 'equal', value: oldText }]
	const oldTokens = tokenizeWords(oldText)
	const newTokens = tokenizeWords(newText)
	if (oldTokens.length + newTokens.length > MAX_WORD_DIFF_TOKENS) {
		return [
			{ type: 'remove', value: oldText },
			{ type: 'add', value: newText }
		]
	}
	const trace = lcs(oldTokens, newTokens)
	const ops: DiffOp[] = trace.map((step) => {
		if (step.type === 'equal') return { type: 'equal', value: oldTokens[step.index] }
		if (step.type === 'add') return { type: 'add', value: newTokens[step.index] }
		return { type: 'remove', value: oldTokens[step.index] }
	})
	return coalesce(ops)
}

export type ParagraphDiffOp =
	| { type: 'equal'; value: string }
	| { type: 'add'; value: string }
	| { type: 'remove'; value: string }
	| { type: 'modify'; before: string; after: string; words: DiffOp[] }

export function diffParagraphs(oldText: string, newText: string): ParagraphDiffOp[] {
	if (oldText === newText) {
		return oldText ? [{ type: 'equal', value: oldText }] : []
	}
	const oldParas = oldText.split(PARAGRAPH_SPLIT).filter((p) => p.length > 0)
	const newParas = newText.split(PARAGRAPH_SPLIT).filter((p) => p.length > 0)
	const trace = lcs(oldParas, newParas)
	const draft: { type: 'equal' | 'add' | 'remove'; value: string }[] = trace.map((step) => {
		if (step.type === 'equal') return { type: 'equal', value: oldParas[step.index] }
		if (step.type === 'add') return { type: 'add', value: newParas[step.index] }
		return { type: 'remove', value: oldParas[step.index] }
	})
	const out: ParagraphDiffOp[] = []
	for (let k = 0; k < draft.length; k += 1) {
		const op = draft[k]
		const next = draft[k + 1]
		if (op.type === 'remove' && next?.type === 'add') {
			out.push({
				type: 'modify',
				before: op.value,
				after: next.value,
				words: diffWords(op.value, next.value)
			})
			k += 1
			continue
		}
		out.push(op)
	}
	return out
}

export type FieldChange = {
	key: string
	label: string
	before: string | null
	after: string | null
	kind: 'text' | 'tags' | 'status'
}

const TEXT_FIELDS: { key: string; label: string }[] = [
	{ key: 'title', label: 'Title' },
	{ key: 'subtitle', label: 'Subtitle' },
	{ key: 'slug', label: 'Slug' },
	{ key: 'excerpt', label: 'Excerpt' },
	{ key: 'seoTitle', label: 'SEO title' },
	{ key: 'seoDescription', label: 'SEO description' }
]

function normalizeText(value: unknown): string | null {
	if (value == null) return null
	if (typeof value !== 'string') return String(value)
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : null
}

function normalizeTags(value: unknown): string[] {
	if (!Array.isArray(value)) return []
	return value.filter((tag): tag is string => typeof tag === 'string')
}

export function diffMetadata(
	beforeSnap: Record<string, unknown> | null | undefined,
	afterSnap: Record<string, unknown> | null | undefined
): FieldChange[] {
	const before = beforeSnap ?? {}
	const after = afterSnap ?? {}
	const changes: FieldChange[] = []

	for (const field of TEXT_FIELDS) {
		const a = normalizeText(before[field.key])
		const b = normalizeText(after[field.key])
		if (a !== b) {
			changes.push({ key: field.key, label: field.label, before: a, after: b, kind: 'text' })
		}
	}

	const beforeStatus = normalizeText(before.status)
	const afterStatus = normalizeText(after.status)
	if (beforeStatus !== afterStatus) {
		changes.push({ key: 'status', label: 'Status', before: beforeStatus, after: afterStatus, kind: 'status' })
	}

	const beforeTags = normalizeTags(before.tags)
	const afterTags = normalizeTags(after.tags)
	const tagsEqual = beforeTags.length === afterTags.length && beforeTags.every((tag, idx) => tag === afterTags[idx])
	if (!tagsEqual) {
		changes.push({
			key: 'tags',
			label: 'Tags',
			before: beforeTags.join(', ') || null,
			after: afterTags.join(', ') || null,
			kind: 'tags'
		})
	}

	return changes
}

export function diffStats(ops: ParagraphDiffOp[]): { added: number; removed: number } {
	let added = 0
	let removed = 0
	for (const op of ops) {
		if (op.type === 'add') {
			added += tokenizeWords(op.value).filter((token) => token.trim().length > 0).length
		} else if (op.type === 'remove') {
			removed += tokenizeWords(op.value).filter((token) => token.trim().length > 0).length
		} else if (op.type === 'modify') {
			for (const word of op.words) {
				const count = tokenizeWords(word.value).filter((token) => token.trim().length > 0).length
				if (word.type === 'add') added += count
				if (word.type === 'remove') removed += count
			}
		}
	}
	return { added, removed }
}
