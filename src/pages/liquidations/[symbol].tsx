import { GetStaticPaths, GetStaticProps, NextPage } from 'next'
import { maxAgeForNext } from '~/api'
import { Icon } from '~/components/Icon'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { LinkPreviewCard } from '~/components/SEO'
import { LiquidationsContainer } from '~/containers/Liquidations'
import {
	getLatestLiquidationsChartData,
	getLiquidationsAssetsList,
	getPrevLiquidationsChartData
} from '~/containers/Liquidations/queries'
import { LiqPositionsTable, LiqProtocolsTable } from '~/containers/Liquidations/Table'
import { ChartData, buildLiquidationsChartSeries } from '~/containers/Liquidations/utils'
import { LIQS_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { formattedNum, liquidationsIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

type LiquidationsNavLink = { label: string; to: string; symbol: string }

export const getStaticProps: GetStaticProps<{
	data: ChartData
	prevData: ChartData
	options: LiquidationsNavLink[]
	chartSeries: ReturnType<typeof buildLiquidationsChartSeries>
}> = withPerformanceLogging('liquidations/[symbol]', async ({ params }) => {
	const symbol = (params.symbol as string).toLowerCase()
	const { assets } = await getLiquidationsAssetsList()
	const options: LiquidationsNavLink[] = assets.map((a) => ({ label: a.label, to: a.to, symbol: a.symbol }))
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
	options: LiquidationsNavLink[]
	chartSeries: ReturnType<typeof buildLiquidationsChartSeries>
}> = (props) => {
	const { data, prevData, options } = props
	const [liqsSettings, toggleLiqsSettings] = useLocalStorageSettingsManager('liquidations')
	const { LIQS_SHOWING_INSPECTOR } = LIQS_SETTINGS
	const isLiqsShowingInspector = liqsSettings[LIQS_SHOWING_INSPECTOR]
	const nameAndSymbol = `${data.name} (${data.symbol.toUpperCase()})`
	const activeLiqLink =
		options.find((option) => option.symbol.toLowerCase() === data.symbol.toLowerCase())?.label ?? nameAndSymbol
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
				tvl={formattedNum(data.totalLiquidable, true)}
			/>

			<RowLinksWithDropdown links={options} activeLink={activeLiqLink} />
			<LiquidationsContainer data={data} prevData={prevData} chartSeries={props.chartSeries} />
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--cards-border) p-3">
					<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form) max-sm:w-full">
						<button
							className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
							data-active={!isLiqsShowingInspector}
							onClick={() => {
								if (isLiqsShowingInspector) toggleLiqsSettings(LIQS_SHOWING_INSPECTOR)
							}}
						>
							<Icon name="percent" height={14} width={14} />
							<span>Distribution</span>
						</button>
						<button
							className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
							data-active={isLiqsShowingInspector}
							onClick={() => {
								if (!isLiqsShowingInspector) toggleLiqsSettings(LIQS_SHOWING_INSPECTOR)
							}}
						>
							<Icon name="search" height={14} width={14} />
							<span>Positions</span>
						</button>
					</div>
					{isLiqsShowingInspector ? (
						<p className="text-right text-xs text-(--text-label) italic opacity-70">
							Displaying the largest {data.topPositions.length} positions out of {data.totalPositions} in total
						</p>
					) : null}
				</div>
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
