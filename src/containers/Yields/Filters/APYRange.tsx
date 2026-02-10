import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

interface IAPYRange {
	nestedMenu?: boolean
	placement?: Ariakit.PopoverStoreProps['placement']
}

export function APYRange({ nestedMenu, placement }: IAPYRange) {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minApy = form.min?.value
		const maxApy = form.max?.value

		const eventData: Record<string, number> = {}
		if (minApy) eventData.min = Number(minApy)
		if (maxApy) eventData.max = Number(maxApy)
		if (Object.keys(eventData).length > 0) {
			trackYieldsEvent(YIELDS_EVENTS.FILTER_APY_RANGE, eventData)
		}

		const params = new URLSearchParams(window.location.search)
		if (minApy) params.set('minApy', minApy)
		else params.delete('minApy')
		if (maxApy) params.set('maxApy', maxApy)
		else params.delete('maxApy')
		const queryString = params.toString()
		const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
		router.push(newUrl, undefined, { shallow: true })
	}

	const handleClear = () => {
		const params = new URLSearchParams(window.location.search)
		params.delete('minApy')
		params.delete('maxApy')
		const queryString = params.toString()
		const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
		router.push(newUrl, undefined, { shallow: true })
	}

	const { minApy, maxApy } = router.query
	const min = typeof minApy === 'string' && minApy !== '' ? Number(minApy) : null
	const max = typeof maxApy === 'string' && maxApy !== '' ? Number(maxApy) : null

	return (
		<FilterBetweenRange
			name="APY Range"
			trigger={
				<>
					{min || max ? (
						<>
							<span>APY: </span>
							<span className="text-(--link)">{`${min?.toLocaleString() ?? 'min'} - ${
								max?.toLocaleString() ?? 'max'
							}`}</span>
						</>
					) : (
						<span>APY</span>
					)}
				</>
			}
			variant="secondary"
			onSubmit={handleSubmit}
			onClear={handleClear}
			nestedMenu={nestedMenu}
			min={min}
			max={max}
			placement={placement}
		/>
	)
}
