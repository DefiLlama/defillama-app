import { useRouter } from 'next/router'
import { readSingleQueryValue } from '~/utils/routerQuery'

export function useRangeFilter(minKey: string, maxKey: string) {
	const router = useRouter()

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const form = e.target as HTMLFormElement
		const minVal = (form.elements.namedItem('min') as HTMLInputElement | null)?.value
		const maxVal = (form.elements.namedItem('max') as HTMLInputElement | null)?.value

		const nextQuery: Record<string, any> = { ...router.query }
		if (minVal) nextQuery[minKey] = minVal
		else delete nextQuery[minKey]
		if (maxVal) nextQuery[maxKey] = maxVal
		else delete nextQuery[maxKey]
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}

	const handleClear = () => {
		const nextQuery: Record<string, any> = { ...router.query }
		delete nextQuery[minKey]
		delete nextQuery[maxKey]
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}

	const minRaw = readSingleQueryValue(router.query[minKey] as string | string[] | undefined)
	const maxRaw = readSingleQueryValue(router.query[maxKey] as string | string[] | undefined)
	const minNum = typeof minRaw === 'string' && minRaw !== '' ? Number(minRaw) : null
	const maxNum = typeof maxRaw === 'string' && maxRaw !== '' ? Number(maxRaw) : null
	const min = minNum !== null && Number.isFinite(minNum) ? minNum : null
	const max = maxNum !== null && Number.isFinite(maxNum) ? maxNum : null

	return { min, max, handleSubmit, handleClear }
}
