import Router, { useRouter } from 'next/router'

export function useRangeFilter(minKey: string, maxKey: string) {
	const router = useRouter()

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const form = e.target as HTMLFormElement
		const minVal = (form.elements.namedItem('min') as HTMLInputElement | null)?.value
		const maxVal = (form.elements.namedItem('max') as HTMLInputElement | null)?.value

		const params = new URLSearchParams(window.location.search)
		if (minVal) params.set(minKey, minVal)
		else params.delete(minKey)
		if (maxVal) params.set(maxKey, maxVal)
		else params.delete(maxKey)
		Router.push(`${window.location.pathname}?${params.toString()}`, undefined, { shallow: true })
	}

	const handleClear = () => {
		const params = new URLSearchParams(window.location.search)
		params.delete(minKey)
		params.delete(maxKey)
		const qs = params.toString()
		Router.push(qs ? `${window.location.pathname}?${qs}` : window.location.pathname, undefined, { shallow: true })
	}

	const minRaw = router.query[minKey]
	const maxRaw = router.query[maxKey]
	const min = typeof minRaw === 'string' && minRaw !== '' ? Number(minRaw) : null
	const max = typeof maxRaw === 'string' && maxRaw !== '' ? Number(maxRaw) : null

	return { min, max, handleSubmit, handleClear }
}
