import type { UnifiedRowHeaderType } from '../../../types'
import { DEFAULT_CHAINS_ROW_HEADERS, DEFAULT_PROTOCOLS_ROW_HEADERS } from '../constants'

const ALLOWED_HEADERS: UnifiedRowHeaderType[] = ['chain', 'category', 'parent-protocol', 'protocol']

export function sanitizeRowHeaders(
	rowHeaders: UnifiedRowHeaderType[] | undefined,
	strategyType: 'protocols' | 'chains'
): UnifiedRowHeaderType[] {
	if (strategyType === 'chains') {
		return [...DEFAULT_CHAINS_ROW_HEADERS]
	}

	const unique: UnifiedRowHeaderType[] = []
	const provided = rowHeaders && rowHeaders.length ? rowHeaders : DEFAULT_PROTOCOLS_ROW_HEADERS

	for (const header of provided) {
		if (!ALLOWED_HEADERS.includes(header)) continue
		if (unique.includes(header)) continue
		unique.push(header)
	}

	// Ensure protocol is always last and parent-protocol (if present) comes right before it
	const protocolIndex = unique.indexOf('protocol')
	if (protocolIndex !== -1) {
		unique.splice(protocolIndex, 1)
	}
	const parentIndex = unique.indexOf('parent-protocol')
	if (parentIndex !== -1) {
		unique.splice(parentIndex, 1)
		unique.push('parent-protocol')
	}
	unique.push('protocol')

	return unique
}
