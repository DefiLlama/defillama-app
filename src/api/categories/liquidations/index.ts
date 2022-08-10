import { LIQUIDATIONS_CHART_API } from '~/constants'
import { ChartData } from '~/utils/liquidations'

export const getLiquidationsPageData = async (symbol: string) => {
	const res = (await fetch(LIQUIDATIONS_CHART_API + `?symbol=${symbol.toUpperCase()}`).then((resp) => resp.json())) as
		| ChartData
		| { error: string }
	return {
		props: { ...res }
	}
}
