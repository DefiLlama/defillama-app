import * as React from 'react'
import { getETFData } from '~/api/categories/protocols'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { ILineAndBarChartProps } from '~/components/ECharts/types'
import { Select } from '~/components/Select'
import { ETFColumn } from '~/components/Table/Defi/columns'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import Layout from '~/layout'
import { download, firstDayOfMonth, formattedNum, lastDayOfWeek, toNiceCsvDate } from '~/utils'
import { useCSVDownload } from '~/hooks/useCSVDownload'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

interface AssetSectionProps {
	name: string
	iconUrl: string
	flows: number
	aum: number
}

interface TransformedFlow {
	date: string
	[key: string]: string | number
}

interface AssetTotals {
	[key: string]: {
		aum: number
		flows: number
	}
}

const AssetSection = ({ name, iconUrl, flows, aum }: AssetSectionProps) => (
	<div className="flex flex-col gap-4">
		<div className="flex items-center gap-1">
			<img src={iconUrl} alt={name} width={20} height={20} className="rounded-full" />
			<span className="text-lg font-semibold">{name}</span>
		</div>
		<div className="flex items-center justify-between">
			<span className="font-medium">Flows</span>
			<span className={`font-jetbrains ${flows > 0 ? 'text-green-500' : flows < 0 ? 'text-red-500' : ''}`}>
				{formattedNum(flows || 0, true)}
			</span>
		</div>
		<div className="flex items-center justify-between">
			<span className="font-medium">AUM</span>
			<span className="font-jetbrains">{formattedNum(aum || 0, true)}</span>
		</div>
	</div>
)

export const getStaticProps = withPerformanceLogging('etfs', async () => {
	const data = await getETFData()

	return {
		props: {
			...data
		},
		revalidate: 5 * 60
	}
})

interface PageViewProps {
	snapshot: Array<{
		asset: string
		aum: number
		flows: number
		ticker: string
	}>
	flows: TransformedFlow[]
	lastUpdated: string
	totalsByAsset: AssetTotals
}

const groupByList = ['Daily', 'Weekly', 'Monthly', 'Cumulative']
const PageView = ({ snapshot, flows, totalsByAsset, lastUpdated }: PageViewProps) => {
	const [groupBy, setGroupBy] = React.useState<(typeof groupByList)[number]>('Weekly')
	const [tickers, setTickers] = React.useState(['Bitcoin', 'Ethereum'])
	const { downloadCSV, isLoading: isDownloadLoading } = useCSVDownload()

	const charts = React.useMemo(() => {
		const bitcoin = {}
		const ethereum = {}

		let totalBitcoin = 0
		let totalEthereum = 0
		for (const flowDate in flows) {
			const date = ['Daily', 'Cumulative'].includes(groupBy)
				? flowDate
				: groupBy === 'Weekly'
					? lastDayOfWeek(+flowDate * 1000)
					: firstDayOfMonth(+flowDate * 1000)

			bitcoin[date] = (bitcoin[date] || 0) + (flows[flowDate]['Bitcoin'] ?? 0) + totalBitcoin
			if (flows[flowDate]['Ethereum']) {
				ethereum[date] = (ethereum[date] || 0) + (flows[flowDate]['Ethereum'] ?? 0) + totalEthereum
			}

			if (groupBy === 'Cumulative') {
				totalBitcoin += +(flows[flowDate]['Bitcoin'] ?? 0)
				totalEthereum += +(flows[flowDate]['Ethereum'] ?? 0)
			}
		}

		const charts = {
			Bitcoin: {
				name: 'Bitcoin',
				stack: 'Bitcoin',
				type: groupBy === 'Cumulative' ? 'line' : ('bar' as 'line' | 'bar'),
				data: [],
				color: '#F7931A'
			},
			Ethereum: {
				name: 'Ethereum',
				stack: 'Ethereum',
				type: groupBy === 'Cumulative' ? 'line' : ('bar' as 'line' | 'bar'),
				data: [],
				color: '#6B7280'
			}
		}

		for (const date in bitcoin) {
			charts.Bitcoin.data.push([+date * 1000, bitcoin[date]])
			charts.Ethereum.data.push([+date * 1000, ethereum[date] || null])
		}

		return charts
	}, [flows, groupBy])

	const finalCharts = React.useMemo(() => {
		const newCharts: any = {}
		if (tickers.includes('Bitcoin')) {
			newCharts.Bitcoin = charts.Bitcoin
		}
		if (tickers.includes('Ethereum')) {
			newCharts.Ethereum = charts.Ethereum
		}
		return newCharts
	}, [charts, tickers])

	return (
		<>
			<div className="flex min-h-[434px] flex-col gap-1 md:flex-row">
				<div className="flex w-full flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) md:w-80">
					<div className="flex flex-col gap-1 p-3">
						<h1 className="text-xl font-semibold">Daily Stats</h1>
						<span className="text-xs opacity-70">{lastUpdated}</span>
					</div>

					<div className="flex flex-col gap-12 p-3">
						<AssetSection
							name="Bitcoin"
							iconUrl="https://icons.llamao.fi/icons/protocols/bitcoin"
							flows={totalsByAsset.bitcoin?.flows ?? 0}
							aum={totalsByAsset.bitcoin?.aum ?? 0}
						/>

						<AssetSection
							name="Ethereum"
							iconUrl="https://icons.llamao.fi/icons/protocols/ethereum"
							flows={totalsByAsset.ethereum?.flows ?? 0}
							aum={totalsByAsset.ethereum?.aum ?? 0}
						/>
					</div>
				</div>
				<div className="flex w-full flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap justify-end gap-2 p-3">
						<h2 className="mr-auto text-lg font-semibold">Flows (Source: Farside)</h2>
						<TagGroup setValue={(val) => setGroupBy(val)} values={groupByList} selectedValue={groupBy} />
						<Select
							allValues={['Bitcoin', 'Ethereum']}
							selectedValues={tickers}
							setSelectedValues={setTickers}
							selectOnlyOne={(newOption) => {
								setTickers([newOption])
							}}
							label={'ETF'}
							clearAll={() => setTickers([])}
							toggleAll={() => setTickers(['Bitcoin', 'Ethereum'])}
							labelType="smol"
							triggerProps={{
								className:
									'flex items-center justify-between gap-2 px-2 py-[6px] text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
							}}
							portal
						/>
						<CSVDownloadButton
							onClick={() => {
								try {
									let rows = []

									rows = [['Timestamp', 'Date', 'Bitcoin', 'Ethereum']]
									for (const date in flows) {
										rows.push([date, toNiceCsvDate(date), flows[date]['Bitcoin'] ?? '', flows[date]['Ethereum'] ?? ''])
									}
									const filename = `etf-flows-${new Date().toISOString().split('T')[0]}.csv`
									downloadCSV(filename, rows.map((r) => r.join(',')).join('\n'))
								} catch (error) {
									console.error('Error generating CSV:', error)
								}
							}}
							isLoading={isDownloadLoading}
							smol
						/>
					</div>
					<React.Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
						<LineAndBarChart
							charts={finalCharts}
							groupBy={groupBy === 'Cumulative' ? 'daily' : (groupBy.toLowerCase() as 'daily' | 'weekly' | 'monthly')}
						/>
					</React.Suspense>
				</div>
			</div>
			<TableWithSearch
				data={snapshot}
				columns={ETFColumn}
				columnToSearch={'ticker'}
				placeholder={'Search ETF...'}
				header="Exchange Traded Funds"
			/>
		</>
	)
}

const pageName = ['ETFs: Overview']

export default function ETFs(props: PageViewProps) {
	return (
		<Layout title={`Exchange Traded Funds - DefiLlama`} pageName={pageName}>
			<PageView {...props} />
		</Layout>
	)
}
