import { GetStaticPaths, GetStaticProps, NextPage } from 'next'
import { maxAgeForNext } from '~/api'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import type { ISearchItem } from '~/components/Search/types'
import { LinkPreviewCard } from '~/components/SEO'
import { LiquidationsContainer } from '~/containers/Liquidations'
import { LiqPositionsTable } from '~/containers/Liquidations/PositionsTable'
import { LiqProtocolsTable } from '~/containers/Liquidations/ProtocolsTable'
import { TableHeader } from '~/containers/Liquidations/TableHeader'
import {
	ChartData,
	buildLiquidationsChartSeries,
	getLiquidationsAssetsList,
	getLatestLiquidationsChartData,
	getPrevLiquidationsChartData,
	getReadableValue
} from '~/containers/Liquidations/utils'
import { LIQS_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { liquidationsIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps: GetStaticProps<{
	data: ChartData
	prevData: ChartData
	chartSeries: ReturnType<typeof buildLiquidationsChartSeries>
}> = withPerformanceLogging('liquidations/[symbol]', async ({ params }) => {
	const symbol = (params.symbol as string).toLowerCase()
	const { assets: options } = await getLiquidationsAssetsList()
	const data = await getLatestLiquidationsChartData(symbol, 100)
	const prevData = (await getPrevLiquidationsChartData(symbol, 100, 3600 * 24)) ?? data
	const chartSeries = buildLiquidationsChartSeries(data)
	return {
		props: { data, prevData, options, chartSeries },
		revalidate: maxAgeForNext([5, 25, 45])
	}
})

export const getStaticPaths: GetStaticPaths = async () => {
	const { assets } = await getLiquidationsAssetsList()
	const paths = assets
		.map((x) => (x.route as string).split('/').pop())
		.map((x) => ({
			params: { symbol: x.toLowerCase() }
		}))

	return { paths: paths.slice(0, 5), fallback: 'blocking' }
}

const pageName = ['Liquidation Levels']

const LiquidationsHomePage: NextPage<{
	data: ChartData
	prevData: ChartData
	options: ISearchItem[]
	chartSeries: ReturnType<typeof buildLiquidationsChartSeries>
}> = (props) => {
	const { data, prevData, options } = props
	const [liqsSettings] = useLocalStorageSettingsManager('liquidations')
	const { LIQS_SHOWING_INSPECTOR } = LIQS_SETTINGS
	const isLiqsShowingInspector = liqsSettings[LIQS_SHOWING_INSPECTOR]
	const nameAndSymbol = `${data.name} (${data.symbol.toUpperCase()})`
	const activeLiqLink =
		(options as any)?.find?.((option) => option?.symbol?.toLowerCase?.() === data.symbol.toLowerCase())?.label ??
		nameAndSymbol
	return (
		<Layout
			title={`${nameAndSymbol} Liquidation Levels - DefiLlama`}
			description={`${nameAndSymbol} Liquidation Levels on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${nameAndSymbol.toLowerCase()} liquidation levels, liquidation levels on blockchain`}
			canonicalUrl={`/liquidations/${data.symbol.toLowerCase()}`}
			pageName={pageName}
		>
			<LinkPreviewCard
				liqsPage
				cardName={nameAndSymbol}
				logo={'https://defillama.com' + liquidationsIconUrl(data.symbol.toLowerCase(), true)}
				tvl={'$' + getReadableValue(data.totalLiquidable)}
			/>

			<RowLinksWithDropdown links={options as any} activeLink={activeLiqLink} />
			<LiquidationsContainer data={data} prevData={prevData} chartSeries={props.chartSeries} />
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<TableHeader
					metaText={
						isLiqsShowingInspector
							? `Displaying the largest ${data.topPositions.length} positions out of ${data.totalPositions} in total`
							: null
					}
				/>
				{isLiqsShowingInspector ? (
					<LiqPositionsTable data={data} prevData={prevData} />
				) : (
					<LiqProtocolsTable data={data} prevData={prevData} />
				)}
			</div>
		</Layout>
	)
}

export default LiquidationsHomePage
