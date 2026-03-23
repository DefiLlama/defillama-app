/**
 * Deterministic A/B variant assignment using FNV-1a hash.
 * Same (experimentId, userId) always produces the same variant.
 */
export function getExperimentVariant(experimentId: string, userId: string): 'A' | 'B' {
	let hash = 2166136261
	const str = `${experimentId}:${userId}`
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i)
		hash = Math.imul(hash, 16777619)
	}
	return (hash >>> 0) / 4294967296 < 0.5 ? 'A' : 'B'
}
