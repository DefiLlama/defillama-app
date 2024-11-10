import * as React from 'react'
import dynamic from 'next/dynamic'
import { transparentize } from 'polished'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { formattedNum } from '~/utils'
import type { IBarChartProps } from '~/components/ECharts/types'
import { RowLinksWithDropdown } from '~/components/Filters/common/RowLinksWithDropdown'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

interface IUsersByChainsProps {
	chart: Array<{
		day: string
		total_txs: number
		new_users: number
		unique_users: number
	}>
	backgroundColor?: string
	logo?: string
	name: string
	chain: string
	chains: Array<{ label: string; to: string }>
	protocols: Array<string>
}

export function UsersByChain({ chart, backgroundColor, name, chains, chain }: IUsersByChainsProps) {
	const allTxsChart = React.useMemo(() => {
		const allTxsByDate = {}

		chart.forEach((value) => {
			const day = new Date(value.day).getTime() / 1000

			// intialize object with date and column type props
			if (!allTxsByDate[day]) {
				allTxsByDate[day] = {
					'New Users': 0,
					'Unique Users': 0,
					'Daily Transactions': 0
				}
			}

			// sum all values of same category on same date
			allTxsByDate[day]['New Users'] += value.new_users
			allTxsByDate[day]['Unique Users'] += value.unique_users
			allTxsByDate[day]['Daily Transactions'] += value.total_txs
		})

		return Object.keys(allTxsByDate).map((date) => ({
			date,
			...allTxsByDate[date]
		}))
	}, [chart])

	const recentMetrics = allTxsChart[allTxsChart.length - 1]

	return (
		<Layout
			title={`${name ? name + ': ' : ''}User Metrics - DefiLlama`}
			defaultSEO
			backgroundColor={backgroundColor && transparentize(0.6, backgroundColor)}
			style={{ gap: '36px' }}
		>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Users', hideOptions: true }} />

			<div className="grid grid-cols-1 gap-8 isolate sm:p-4 xl:gap-12 xl:grid-cols-[auto_1fr]">
				<nav className="flex items-center gap-5 overflow-hidden col-span-full">
					<RowLinksWithDropdown links={chains} activeLink={chain} />
				</nav>

				<div className="flex flex-col px-4 col-span-1 xl:p-0 xl:pl-9 xl:min-w-[380px]">
					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">24h Unique Users</span>
						<span className="font-jetbrains font-semibold text-2xl">
							{formattedNum(recentMetrics?.['Unique Users'])}
						</span>
					</p>

					<hr className="my-5 border-[var(--divider)] xl:my-8" />

					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">24h New Users</span>
						<span className="font-jetbrains font-semibold text-2xl">{formattedNum(recentMetrics?.['New Users'])}</span>
					</p>

					<hr className="my-5 border-[var(--divider)] xl:my-8" />

					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">24h Transactions</span>
						<span className="font-jetbrains font-semibold text-2xl">
							{formattedNum(recentMetrics?.['Daily Transactions'])}
						</span>
					</p>
				</div>
				<div className="col-span-full min-h-[360px] flex flex-col xl:col-span-1 -mt-8 xl:mt-0">
					<BarChart
						chartData={allTxsChart}
						stacks={stacks}
						seriesConfig={seriesConfig}
						title=""
						chartOptions={chartOptions}
					/>
				</div>
				<h1 className="font-bold text-xl -mb-6 xl:mx-4">User Rankings</h1>
				<p className="p-5 text-center col-span-full xl:mx-4 rounded-md">{`No protocols being tracked on this chain`}</p>
			</div>
		</Layout>
	)
}

const stacks = { 'Unique Users': 'stackA', 'New Users': 'stackB' }

const seriesConfig = {
	stackA: {
		color: '#2172E5'
	},
	stackB: {
		type: 'line',
		symbol: 'none',
		color: '#E59421'
	}
}

const chartOptions = {
	legend: {
		right: null // set legend to center, default is right on larger screens
	}
}
