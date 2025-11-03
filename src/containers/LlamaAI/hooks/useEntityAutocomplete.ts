import { useEffect, useState } from 'react'
import { MCP_SERVER } from '~/constants'

interface EntityData {
	chains: Record<string, string>
	protocols: Record<string, { displayName: string; type: 'protocol' | 'subprotocol' }>
}

interface EntitySuggestion {
	slug: string
	displayName: string
	type: 'chain' | 'protocol' | 'subprotocol'
	score: number
}

function calculateSimilarity(search: string, target: string): number {
	const searchLower = search.toLowerCase()
	const targetLower = target.toLowerCase()

	if (targetLower === searchLower) return 1.0
	if (targetLower.startsWith(searchLower)) return 0.95
	if (targetLower.includes(searchLower)) return 0.8

	const distance = levenshteinDistance(searchLower, targetLower)
	const maxLength = Math.max(searchLower.length, targetLower.length)
	return Math.max(0, 1 - distance / maxLength)
}

function levenshteinDistance(a: string, b: string): number {
	const matrix: number[][] = []

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i]
	}

	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1]
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1
				)
			}
		}
	}

	return matrix[b.length][a.length]
}

export function useEntityAutocomplete() {
	const [entities, setEntities] = useState<EntityData | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		async function fetchEntities() {
			try {
				const response = await fetch(`${MCP_SERVER}/entities`)
				const data = await response.json()
				setEntities(data)
			} catch (error) {
				console.error('Failed to fetch entities:', error)
			} finally {
				setIsLoading(false)
			}
		}

		fetchEntities()
	}, [])

	function search(query: string, limit: number = 5): EntitySuggestion[] {
		if (!entities || !query) return []

		const suggestions: EntitySuggestion[] = []

		for (const [slug, displayName] of Object.entries(entities.chains)) {
			const slugScore = calculateSimilarity(query, slug)
			const nameScore = calculateSimilarity(query, displayName)
			const score = Math.max(slugScore, nameScore)

			if (score >= 0.6) {
				suggestions.push({
					slug,
					displayName,
					type: 'chain',
					score
				})
			}
		}

		for (const [slug, protocolData] of Object.entries(entities.protocols)) {
			const slugScore = calculateSimilarity(query, slug)
			const nameScore = calculateSimilarity(query, protocolData.displayName)
			const score = Math.max(slugScore, nameScore)

			if (score >= 0.6) {
				suggestions.push({
					slug,
					displayName: protocolData.displayName,
					type: protocolData.type,
					score
				})
			}
		}

		return suggestions
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
	}

	return {
		isLoading,
		search
	}
}
