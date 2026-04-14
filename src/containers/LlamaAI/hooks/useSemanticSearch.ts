import { useCallback, useEffect, useRef, useState } from 'react'
import { AI_SERVER } from '~/constants'
import type { SearchResult } from '~/containers/LlamaAI/types'
import { useAuthContext } from '~/containers/Subscription/auth'

export function useSemanticSearch() {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<SearchResult[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const abortRef = useRef<AbortController | null>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const search = useCallback(
		async (q: string) => {
			if (!q.trim() || !isAuthenticated) {
				setResults([])
				setIsSearching(false)
				return
			}

			abortRef.current?.abort()
			const controller = new AbortController()
			abortRef.current = controller

			setIsSearching(true)
			try {
				const res = await authorizedFetch(`${AI_SERVER}/search?q=${encodeURIComponent(q.trim())}&limit=10`, {
					signal: controller.signal
				})
				if (!res || !res.ok) {
					setResults([])
					return
				}
				const data = await res.json()
				if (!controller.signal.aborted) {
					setResults(data.results ?? [])
				}
			} catch (err: any) {
				if (err?.name !== 'AbortError') {
					setResults([])
				}
			} finally {
				if (!controller.signal.aborted) {
					setIsSearching(false)
				}
			}
		},
		[authorizedFetch, isAuthenticated]
	)

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)

		if (!query.trim()) {
			setResults([])
			setIsSearching(false)
			return
		}

		setIsSearching(true)
		debounceRef.current = setTimeout(() => search(query), 300)

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [query, search])

	useEffect(() => {
		return () => {
			abortRef.current?.abort()
		}
	}, [])

	const clear = useCallback(() => {
		setQuery('')
		setResults([])
		setIsSearching(false)
		abortRef.current?.abort()
	}, [])

	return { query, setQuery, results, isSearching, clear }
}
