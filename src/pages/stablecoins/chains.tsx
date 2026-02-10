import type { GetStaticProps, InferGetStaticPropsType } from 'next'
import type { ComponentProps } from 'react'
import { maxAgeForNext } from '~/api'
import { CHART_COLORS } from '~/constants/colors'
import { ChainsWithStablecoins } from '~/containers/Stablecoins/ChainsWithStablecoins'
import { getStablecoinChainsPageData } from '~/containers/Stablecoins/queries.server'
import { buildStablecoinChartData, getPrevStablecoinTotalFromChart } from '~/containers/Stablecoins/utils'
import Layout from '~/layout'
import { formattedNum, getPercentChange } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

type StablecoinChainsPageProps = ComponentProps<typeof ChainsWithStablecoins>

const toSignedChangeLabel = (value: string): string => {
	const numericValue = Number.parseFloat(value.replace(/[^0-9.+-]/g, ''))
	if (!Number.isNaN(numericValue) && numericValue === 0) {
		return value
	}
	return value.startsWith('-') ? value : `+${value}`
}

export const getStaticProps: GetStaticProps<StablecoinChainsPageProps> = withPerformanceLogging(
	'stablecoins/chains',
	async () => {
		const props = await getStablecoinChainsPageData()

		if (!props.chainCirculatings || props.chainCirculatings.length === 0) {
			throw new Error('getStablecoinChainsPageData() broken')
		}

		const totalMcapCurrent = getPrevStablecoinTotalFromChart(props.chartData, 0, 'totalCirculatingUSD')
		const totalMcapPrevDay = getPrevStablecoinTotalFromChart(props.chartData, 1, 'totalCirculatingUSD')
		const totalMcapPrevWeek = getPrevStablecoinTotalFromChart(props.chartData, 7, 'totalCirculatingUSD')
		const totalMcapPrevMonth = getPrevStablecoinTotalFromChart(props.chartData, 30, 'totalCirculatingUSD')

		const change1d = getPercentChange(totalMcapCurrent, totalMcapPrevDay)?.toFixed(2) ?? '0'
		const change7d = getPercentChange(totalMcapCurrent, totalMcapPrevWeek)?.toFixed(2) ?? '0'
		const change30d = getPercentChange(totalMcapCurrent, totalMcapPrevMonth)?.toFixed(2) ?? '0'

		const change1d_nol = formattedNum(String((totalMcapCurrent ?? 0) - (totalMcapPrevDay ?? 0)), true)
		const change7d_nol = formattedNum(String((totalMcapCurrent ?? 0) - (totalMcapPrevWeek ?? 0)), true)
		const change30d_nol = formattedNum(String((totalMcapCurrent ?? 0) - (totalMcapPrevMonth ?? 0)), true)

		const { peggedAreaChartData, peggedAreaTotalData, stackedDataset } = buildStablecoinChartData({
			chartDataByAssetOrChain: props.peggedChartDataByChain,
			assetsOrChainsList: props.chainList,
			filteredIndexes: [...Array(props.chainList.length).keys()],
			issuanceType: 'mcap'
		})

		return {
			props: {
				chainCirculatings: props.chainCirculatings,
				chainList: props.chainList,
				chainsGroupbyParent: props.chainsGroupbyParent,
				change1d: toSignedChangeLabel(change1d),
				change7d: toSignedChangeLabel(change7d),
				change30d: toSignedChangeLabel(change30d),
				totalMcapCurrent,
				change1d_nol: toSignedChangeLabel(change1d_nol),
				change7d_nol: toSignedChangeLabel(change7d_nol),
				change30d_nol: toSignedChangeLabel(change30d_nol),
				peggedAreaChartData,
				peggedAreaTotalData: {
					dataset: {
						source: peggedAreaTotalData.map(({ date, Mcap }) => ({ timestamp: +date * 1e3, Mcap })),
						dimensions: ['timestamp', 'Mcap']
					},
					charts: [
						{
							type: 'line',
							name: 'Mcap',
							encode: { x: 'timestamp', y: 'Mcap' },
							stack: 'Mcap',
							color: CHART_COLORS[0]
						}
					]
				},
				stackedDataset
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['Chains', 'ranked by', 'Stablecoins Supply']

export default function StablecoinChainsPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Stablecoins Circulating - DefiLlama"
			description="Stablecoins Circulating by Chain. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency."
			keywords="stablecoins circulating by chain, stablecoins supply by chain, stablecoins market cap by chain"
			canonicalUrl="/stablecoins/chains"
			pageName={pageName}
		>
			<ChainsWithStablecoins {...props} />
		</Layout>
	)
}
