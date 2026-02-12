import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'

export interface IHacksPageData {
	data: Array<{
		chains: string[]
		classification: string
		date: number
		target: string
		amount: number
		name: string
		technique: string
		bridge: boolean
		link: string
		language: string
	}>
	monthlyHacksChartData: { dataset: MultiSeriesChart2Dataset; charts: IMultiSeriesChart2Props['charts'] }
	totalHacked: string
	totalHackedDefi: string
	totalRugs: string
	pieChartData: Array<{ name: string; value: number }>
	chainOptions: string[]
	techniqueOptions: string[]
	classificationOptions: string[]
}

export interface IProtocolTotalValueLostInHacksByProtocol {
	protocols: Array<{ name: string; slug: string; route: string; totalHacked: number; returnedFunds: number }>
}
