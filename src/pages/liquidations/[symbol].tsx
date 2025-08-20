// eslint sucks at types
import * as React from 'react'
import { GetStaticPaths, GetStaticProps, NextPage } from 'next'
import { maxAgeForNext } from '~/api'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import type { ISearchItem } from '~/components/Search/types'
import { SEO } from '~/components/SEO'
import { LiquidationsContext } from '~/containers/Liquidations/context'
import { LiquidationsContent } from '~/containers/Liquidations/LiquidationsContent'
import { LiqPositionsTable } from '~/containers/Liquidations/PositionsTable'
import { LiqProtocolsTable } from '~/containers/Liquidations/ProtocolsTable'
import { TableSwitch } from '~/containers/Liquidations/TableSwitch'
import {
	ChartData,
	getAvailableAssetsList,
	getLatestChartData,
	getPrevChartData,
	getReadableValue
} from '~/containers/Liquidations/utils'
import { LIQS_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { liquidationsIconUrl } from '~/utils'
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

const pageName = ['Liquidation Levels']

const LiquidationsHomePage: NextPage<{ data: ChartData; prevData: ChartData; options: ISearchItem[] }> = (props) => {
	const { data, prevData, options } = props
	const [liqsSettings] = useLocalStorageSettingsManager('liquidations')
	const { LIQS_SHOWING_INSPECTOR } = LIQS_SETTINGS
	const isLiqsShowingInspector = liqsSettings[LIQS_SHOWING_INSPECTOR]

	return (
		<Layout
			title={`${data.name} (${data.symbol.toUpperCase()}) Liquidation Levels - DefiLlama`}
			customSEO
			pageName={pageName}
		>
			<SEO
				liqsPage
				cardName={`${data.name} (${data.symbol.toUpperCase()})`}
				logo={'https://defillama.com' + liquidationsIconUrl(data.symbol.toLowerCase(), true)}
				tvl={'$' + getReadableValue(data.totalLiquidable)}
			/>

			<LiquidationsProvider>
				<RowLinksWithDropdown links={options as any} />
				<LiquidationsContent data={data} prevData={prevData} options={options} />
			</LiquidationsProvider>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
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
