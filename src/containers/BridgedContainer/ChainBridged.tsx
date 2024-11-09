import * as React from 'react'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { bridgedChainColumns } from '~/components/Table/Defi/columns'
import Layout from '~/layout'
import { SEO } from '~/components/SEO'
import { chainIconUrl, formattedNum } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/Misc'
import dynamic from 'next/dynamic'
import { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import useWindowSize from '~/hooks/useWindowSize'
import { SortingState, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>
const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export default function ChainBridged({ chainData, chain, inflows, tokenInflowNames, chainName = 'All Chains' }) {
	const [chartType, setChartType] = React.useState('total')
	const top10Tokens = Object.entries(chainData?.[chartType]?.breakdown ?? [])
		.sort((a, b) => +b[1] - +a[1])
		.slice(0, 10)
	const otherTokens = Object.entries(chainData?.[chartType]?.breakdown ?? [])
		.sort((a, b) => +b[1] - +a[1])
		.slice(10)
	const otherTotal = otherTokens.reduce((acc, [_, value]) => acc + +value, 0)
	const tokens = [...top10Tokens, ['Other', otherTotal]]
	const screenWidth = useWindowSize()
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'value', desc: true }])
	const instance = useReactTable({
		data: Object.entries(chainData?.[chartType]?.breakdown ?? []).map(([name, value]) => ({
			name: name?.toLowerCase() === name ? name?.toUpperCase() : name,
			value
		})),
		columns: bridgedChainColumns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return (
		<>
			<Layout title={`${chainName}: Bridged TVL - DefiLlama`} style={{ gap: '24px' }}>
				<ProtocolsChainsSearch
					hideFilters
					step={{
						category: 'Chains',
						name: 'All Chains'
					}}
				/>
				<SEO cardName={chainName} token={chain} />
				<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl">
					<div className="flex flex-col gap-6 p-5 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
						<h1 className="flex items-center gap-2 text-xl">
							<TokenLogo logo={chainIconUrl(chain)} size={24} />
							<FormattedName text={chainName + ' Bridged TVL'} fontWeight={700} />
						</h1>

						<p className="flex flex-col gap-1 text-base">
							<span className="text-[#545757] dark:text-[#cccccc]">Total</span>
							<span className="font-jetbrains font-semibold text-2xl">
								{formattedNum(
									+chainData?.total.total + (+chainData?.ownTokens?.total ? +chainData?.ownTokens?.total : 0),
									true
								)}
							</span>
						</p>
						<p className="flex flex-col gap-1 text-base">
							<span className="text-[#545757] dark:text-[#cccccc]">Canonical</span>
							<span className="font-jetbrains font-semibold text-2xl">
								{formattedNum(chainData?.canonical?.total, true)}
							</span>
						</p>
						<p className="flex flex-col gap-1 text-base">
							<span className="text-[#545757] dark:text-[#cccccc]">Native</span>
							<span className="font-jetbrains font-semibold text-2xl">
								{formattedNum(chainData?.native?.total, true)}
							</span>
						</p>
						<p className="flex flex-col gap-1 text-base">
							<span className="text-[#545757] dark:text-[#cccccc]">Third Party</span>
							<span className="font-jetbrains font-semibold text-2xl">
								{formattedNum(chainData?.thirdParty?.total, true)}
							</span>
						</p>
						{chainData?.ownTokens?.total ? (
							<p className="flex flex-col gap-1 text-base">
								<span className="text-[#545757] dark:text-[#cccccc]">Own Tokens</span>
								<span className="font-jetbrains font-semibold text-2xl">
									{formattedNum(chainData?.ownTokens.total, true)}
								</span>
							</p>
						) : null}
					</div>
					<div
						style={{
							flex: 1,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '16px',
							marginTop: '16px',
							padding: '8px 24px 20px 0',
							minHeight: '460px'
						}}
					>
						<h2 style={{ margin: '0 auto' }}>Tokens Breakdown</h2>

						<Filters style={{ marginLeft: '16px' }}>
							{[
								{ type: 'total', name: 'Total' },
								{ type: 'canonical', name: 'Canonical' },
								{ type: 'native', name: 'Native' },
								{ type: 'thirdParty', name: 'Third Party' },
								inflows ? { type: 'inflows', name: 'Inflows' } : null,
								chainData?.ownTokens?.total ? { type: 'ownTokens', name: 'Own Tokens' } : null
							]
								.filter(Boolean)
								.map(({ type, name }) =>
									chainData[type]?.total !== '0' ? (
										<Denomination as="button" active={chartType === type} onClick={() => setChartType(type)} key={name}>
											{name}
										</Denomination>
									) : null
								)}
						</Filters>

						{chartType !== 'inflows' ? (
							<div style={{ width: Math.min(+screenWidth.width / 1.5, 600) + 'px' }}>
								<PieChart
									chartData={tokens.map(([name, value]: [string, string]) => ({
										name,
										value: +value
									}))}
									usdFormat={false}
								/>
							</div>
						) : (
							<div style={{ width: '100%' }}>
								<BarChart
									chartData={inflows}
									title=""
									hideDefaultLegend={true}
									customLegendName="Token"
									customLegendOptions={tokenInflowNames}
									// chartOptions={inflowsChartOptions}
								/>
							</div>
						)}
					</div>
				</div>
				{chartType !== 'inflows' ? <VirtualTable instance={instance} /> : null}
			</Layout>
		</>
	)
}
