import { useRouter } from 'next/router'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'

type FormSubmitEvent = Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]

export function useRangeFilter(minKey: string, maxKey: string) {
	const router = useRouter()

	const handleSubmit = (e: FormSubmitEvent) => {
		e.preventDefault()
		const form = e.currentTarget
		const minVal = (form.elements.namedItem('min') as HTMLInputElement | null)?.value
		const maxVal = (form.elements.namedItem('max') as HTMLInputElement | null)?.value

		pushShallowQuery(router, {
			[minKey]: minVal || undefined,
			[maxKey]: maxVal || undefined
		})
	}

	const handleClear = () => {
		pushShallowQuery(router, { [minKey]: undefined, [maxKey]: undefined })
	}

	const minRaw = readSingleQueryValue(router.query[minKey] as string | string[] | undefined)
	const maxRaw = readSingleQueryValue(router.query[maxKey] as string | string[] | undefined)
	const minNum = typeof minRaw === 'string' && minRaw !== '' ? Number(minRaw) : null
	const maxNum = typeof maxRaw === 'string' && maxRaw !== '' ? Number(maxRaw) : null
	const min = minNum !== null && Number.isFinite(minNum) ? minNum : null
	const max = maxNum !== null && Number.isFinite(maxNum) ? maxNum : null

	return { min, max, handleSubmit, handleClear }
}
