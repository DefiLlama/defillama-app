import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TVLRange } from '../TVLRange'

const { capturedProps, routerState } = vi.hoisted(() => ({
	capturedProps: [] as Array<{ onSubmit: (event: unknown) => void }>,
	routerState: {
		query: {}
	}
}))

vi.mock('next/router', () => ({
	useRouter: () => routerState
}))

vi.mock('~/components/Filters/FilterBetweenRange', () => ({
	FilterBetweenRange: (props: { onSubmit: (event: unknown) => void }) => {
		capturedProps.push(props)
		return null
	}
}))

function submitTvlRange(min: string, max: string) {
	capturedProps[0]!.onSubmit({
		preventDefault: vi.fn(),
		currentTarget: {
			min: { value: min },
			max: { value: max }
		}
	})
}

describe('TVLRange', () => {
	beforeEach(() => {
		capturedProps.length = 0
		routerState.query = {}
	})

	it('applies page reset before delegating to a custom query updater', () => {
		const pushQueryUpdates = vi.fn()

		renderToStaticMarkup(<TVLRange resetPageOnChange pushQueryUpdates={pushQueryUpdates} />)
		submitTvlRange('100', '200')

		expect(pushQueryUpdates).toHaveBeenCalledWith({
			minTvl: '100',
			maxTvl: '200',
			page: undefined
		})
	})

	it('does not add page reset when resetPageOnChange is false', () => {
		const pushQueryUpdates = vi.fn()

		renderToStaticMarkup(<TVLRange pushQueryUpdates={pushQueryUpdates} />)
		submitTvlRange('100', '200')

		expect(pushQueryUpdates).toHaveBeenCalledWith({
			minTvl: '100',
			maxTvl: '200'
		})
	})
})
