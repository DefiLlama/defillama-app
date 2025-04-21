/* eslint-disable no-unused-vars*/
// eslint sucks at types
import { NextPage, GetStaticProps, GetStaticPaths } from 'next'
import * as React from 'react'
import Layout from '~/layout'
import { LiquidationsSearch } from '~/components/Search/Liquidations'
import { SEO } from '~/components/SEO'
import { LiquidationsHeader } from '~/containers/Liquidations/LiquidationsHeader'
import { LiquidationsContent } from '~/containers/Liquidations/LiquidationsContent'
import { LiqProtocolsTable } from '~/containers/Liquidations/ProtocolsTable'
import { TableSwitch } from '~/containers/Liquidations/TableSwitch'
import { LiqPositionsTable } from '~/containers/Liquidations/PositionsTable'
import { LIQS_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import type { ISearchItem } from '~/components/Search/types'
import { maxAgeForNext } from '~/api'
import { liquidationsIconUrl } from '~/utils'
import {
	ChartData,
	getAvailableAssetsList,
	getLatestChartData,
	getPrevChartData,
	getReadableValue
} from '~/containers/Liquidations/utils'
import { LiquidationsContext } from '~/containers/Liquidations/context'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps: GetStaticProps<{ data: ChartData; prevData: ChartData }> = withPerformanceLogging(
	'liquidations/[symbol]',
	async ({ params }) => {
		const symbol = (params.symbol as string).toLowerCase()
		const { assets: options } = await getAvailableAssetsList()
		const data = await getLatestChartData(symbol, 100)
		const prevData = (await getPrevChartData(symbol, 100, 3600 * 24)) ?? data
		return {
			props: { data, prevData, options },
			revalidate: maxAgeForNext([5, 25, 45])
		}
	}
)

export const getStaticPaths: GetStaticPaths = async () => {
	const { assets } = await getAvailableAssetsList()
	const paths = assets
		.map((x) => (x.route as string).split('/').pop())
		.map((x) => ({
			params: { symbol: x.toLowerCase() }
		}))

	return { paths: paths.slice(0, 5), fallback: 'blocking' }
}

const LiquidationsProvider = ({ children }) => {
	const [selectedSeries, setSelectedSeries] = React.useState<{ [key: string]: boolean }>({})

	return (
		<LiquidationsContext.Provider value={{ selectedSeries, setSelectedSeries }}>
			{children}
		</LiquidationsContext.Provider>
	)
}

const LiquidationsHomePage: NextPage<{ data: ChartData; prevData: ChartData; options: ISearchItem[] }> = (props) => {
	const { data, prevData, options } = props
	const [liqsSettings] = useLocalStorageSettingsManager('liquidations')
	const { LIQS_SHOWING_INSPECTOR } = LIQS_SETTINGS
	const isLiqsShowingInspector = liqsSettings[LIQS_SHOWING_INSPECTOR]

	return (
		<Layout title={`${data.name} (${data.symbol.toUpperCase()}) Liquidation Levels - DefiLlama`}>
			<SEO
				liqsPage
				cardName={`${data.name} (${data.symbol.toUpperCase()})`}
				logo={'https://defillama.com' + liquidationsIconUrl(data.symbol.toLowerCase(), true)}
				tvl={'$' + getReadableValue(data.totalLiquidable)}
			/>

			<LiquidationsSearch />

			{/* {!['BNB', 'CAKE', 'SXP', 'BETH', 'ADA'].includes(data.symbol.toUpperCase()) && (
				<>
					<p className="p-5 bg-[var(--cards-bg)] rounded-md text-center">
						We are now tracking
						<Link href={`/liquidations/bnb`} className="flex items-center gap-1">
								<Image src={`/asset-icons/bnb.png`} width={24} height={24} alt={'BNB'} style={{ borderRadius: 12 }} />
								<span>BSC</span>
						</Link>
						ecosystem assets! Choose one from the asset picker dropdown menu!
					</p>
					<p className="p-5 bg-[var(--cards-bg)] rounded-md text-center xl:hidden">
						We are now tracking
						<Link href={`/liquidations/bnb`} className="flex items-center gap-1">
								<Image src={`/asset-icons/bnb.png`} width={24} height={24} alt={'BNB'} style={{ borderRadius: 12 }} />
								<span>BSC</span>
						</Link>
						!
					</p>
				</>
			)} */}

			<div className="flex items-center justify-between gap-4 bg-[var(--cards-bg)] rounded-md p-3">
				<h1 className="text-xl font-semibold">Liquidation levels in DeFi 💦</h1>
				<LiquidationsHeader data={data} options={options} />
			</div>
			<LiquidationsProvider>
				<LiquidationsContent data={data} prevData={prevData} />
			</LiquidationsProvider>
			<div className="bg-[var(--cards-bg)] rounded-md">
				<TableSwitch />
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
