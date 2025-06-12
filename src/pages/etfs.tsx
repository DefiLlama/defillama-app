import * as React from 'react'
import dynamic from 'next/dynamic'
import { lastDayOfWeek, firstDayOfMonth, toK, download, toNiceCsvDate } from '~/utils'
import type { ILineAndBarChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { ETFColumn } from '~/components/Table/Defi/columns'
import { withPerformanceLogging } from '~/utils/perf'
import { getETFData } from '~/api/categories/protocols'
import Layout from '~/layout'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Select } from '~/components/Select'

const LineAndBarChart = dynamic(() => import('~/components/ECharts/LineAndBarChart'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<ILineAndBarChartProps>

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
	<div className="flex flex-col gap-6">
		<div className="flex items-center gap-1">
			<img src={iconUrl} alt={name} width={24} height={24} className="rounded-full" />
			<span className="text-lg font-semibold">{name}</span>
		</div>
		<div className="flex flex-col gap-4 pl-2">
			<div className="flex items-center justify-between">
				<span className="font-medium">Flows</span>
				<span className={`font-jetbrains ${flows > 0 ? 'text-green-500' : flows < 0 ? 'text-red-500' : ''}`}>
					{`${flows > 0 ? '+' : ''}$${toK(flows || 0)}`}
				</span>
			</div>
			<div className="flex items-center justify-between">
				<span className="font-medium">AUM</span>
				<span className="font-jetbrains">${toK(aum || 0)}</span>
			</div>
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

const PageView = ({ snapshot, flows, totalsByAsset, lastUpdated }: PageViewProps) => {
	const [groupBy, setGroupBy] = React.useState<'daily' | 'weekly' | 'monthly' | 'cumulative'>('weekly')
	const [tickers, setTickers] = React.useState(['Bitcoin', 'Ethereum'])

	const charts = React.useMemo(() => {
		const bitcoin = {}
		const ethereum = {}

		let totalBitcoin = 0
		let totalEthereum = 0
		for (const flowDate in flows) {
			const date = ['daily', 'cumulative'].includes(groupBy)
				? flowDate
				: groupBy === 'weekly'
				? lastDayOfWeek(+flowDate * 1000)
				: firstDayOfMonth(+flowDate * 1000)

			bitcoin[date] = (bitcoin[date] || 0) + (flows[flowDate]['Bitcoin'] ?? 0) + totalBitcoin
			if (flows[flowDate]['Ethereum']) {
				ethereum[date] = (ethereum[date] || 0) + (flows[flowDate]['Ethereum'] ?? 0) + totalEthereum
			}

			if (groupBy === 'cumulative') {
				totalBitcoin += +(flows[flowDate]['Bitcoin'] ?? 0)
				totalEthereum += +(flows[flowDate]['Ethereum'] ?? 0)
			}
		}

		const charts = {
			Bitcoin: {
				name: 'Bitcoin',
				stack: 'Bitcoin',
				type: groupBy === 'cumulative' ? 'line' : ('bar' as 'line' | 'bar'),
				data: [],
				color: '#F7931A'
			},
			Ethereum: {
				name: 'Ethereum',
				stack: 'Ethereum',
				type: groupBy === 'cumulative' ? 'line' : ('bar' as 'line' | 'bar'),
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
			<div className="flex flex-col md:flex-row gap-1 min-h-[434px]">
				<div className="w-full md:w-80 flex flex-col bg-[var(--cards-bg)] rounded-md">
					<div className="flex flex-col gap-2 p-3">
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
				<div className="flex flex-col flex-1 w-full bg-[var(--cards-bg)] rounded-md">
					<div className="flex flex-wrap justify-end gap-2 p-3">
						<h2 className="text-lg font-semibold mr-auto">Flows (Source: Farside)</h2>
						<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
							<button
								data-active={groupBy === 'daily'}
								className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
								onClick={() => setGroupBy('daily')}
							>
								Daily
							</button>

							<button
								data-active={groupBy === 'weekly'}
								className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
								onClick={() => setGroupBy('weekly')}
							>
								Weekly
							</button>

							<button
								data-active={groupBy === 'monthly'}
								className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
								onClick={() => setGroupBy('monthly')}
							>
								Monthly
							</button>

							<button
								data-active={groupBy === 'cumulative'}
								className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
								onClick={() => setGroupBy('cumulative')}
							>
								Cumulative
							</button>
						</div>
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
									'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium'
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
									download(filename, rows.map((r) => r.join(',')).join('\n'))
								} catch (error) {
									console.error('Error generating CSV:', error)
								}
							}}
							smol
							className="!bg-transparent border border-[var(--form-control-border)] !text-[#666] dark:!text-[#919296] hover:!bg-[var(--link-hover-bg)] focus-visible:!bg-[var(--link-hover-bg)]"
						/>
					</div>
					<LineAndBarChart charts={finalCharts} groupBy={groupBy === 'cumulative' ? 'daily' : groupBy} />
				</div>
			</div>
			<TableWithSearch data={snapshot} columns={ETFColumn} columnToSearch={'ticker'} placeholder={'Search ETF...'} />
		</>
	)
}

export default function ETFs(props: PageViewProps) {
	return (
		<Layout title={`Exchange Traded Funds - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
