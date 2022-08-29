import * as React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useFetchProtocolUserMetrics } from '~/api/categories/users/client'
import FormattedName from '~/components/FormattedName'
import {
	DetailsWrapper,
	Name,
	StatsSection,
	ChartsWrapper,
	LazyChart,
	ChartWrapper,
	ChartsPlaceholder
} from '~/components/ProtocolAndPool'
import { ProtocolsChainsSearch } from '~/components/Search'
import TokenLogo from '~/components/TokenLogo'
import Layout from '~/layout'
import { tokenIconUrl } from '~/utils'
import type { IBarChartProps } from '~/components/ECharts/types'
import styled from 'styled-components'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

interface IAllChains {
	date: string | number
	'Total Users': number
	'Unique Users': number
}

// generate this page statically and use color based on protocol logo
export default function Protocol() {
	const { query } = useRouter()

	const protocolName = typeof query.protocol === 'string' ? query.protocol : null

	const { data, loading } = useFetchProtocolUserMetrics(protocolName)

	const { allChains } = React.useMemo(() => {
		const sortedData = data?.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())

		// get unique chains
		const chains = Array.from(
			sortedData?.reduce((acc, curr) => {
				acc.add(curr.chain)

				return acc
			}, new Set()) ?? []
		)

		const usersBydate = {}
		let totalUsers = 0
		let uniqueUsers = 0

		chains?.forEach((chain) => {
			const values = sortedData?.filter((item) => item.chain === chain && item.column_type === 'all')

			values.forEach((value) => {
				totalUsers += value.total_users || 0
				uniqueUsers += value.unique_users || 0

				const day = new Date(value.day).getTime() / 1000

				if (!usersBydate[day]) {
					usersBydate[day] = {
						totalUsers: 0,
						uniqueUsers: 0
					}
				}

				usersBydate[day]['totalUsers'] += value.total_users
				usersBydate[day]['uniqueUsers'] += value.unique_users
			})
		})

		const allChains: Array<IAllChains> = Object.keys(usersBydate).map((date) => ({
			date,
			'Total Users': usersBydate[date].totalUsers,
			'Unique Users': usersBydate[date].uniqueUsers
		}))

		return {
			chains,
			allChains,
			totalUsers,
			uniqueUsers
		}
	}, [data])

	return (
		<Layout title={`${protocolName} User Metrics - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />

			<StatsSection>
				<DetailsWrapper>
					<Name>
						<TokenLogo logo={tokenIconUrl(protocolName)} size={24} />
						<FormattedName text={protocolName ? protocolName + ' ' : ''} maxCharacters={16} fontWeight={700} />
					</Name>

					{/* <StatWrapper>
						<Stat>
							<span>Total Users</span>
							<span></span>
						</Stat>
					</StatWrapper> */}
				</DetailsWrapper>
				<ChartWrapper>
					{!loading && data && (
						<BarChart chartData={allChains} title="" stacks={{ 'Unique Users': 'stackA', 'Total Users': 'stackB' }} />
					)}
				</ChartWrapper>
			</StatsSection>

			<ChartsWrapper>
				{loading ? (
					<ChartsPlaceholder>Loading...</ChartsPlaceholder>
				) : (
					<>
						<LazyChartWrapper>
							<BarChart
								chartData={allChains}
								title="Unique Users"
								stacks={{ 'Unique Users': 'stackA' }}
								chartOptions={chartOptions}
							/>
						</LazyChartWrapper>
						<LazyChartWrapper>
							<BarChart
								chartData={allChains}
								title="Total Users"
								stacks={{ 'Total Users': 'stackA' }}
								chartOptions={chartOptions}
							/>
						</LazyChartWrapper>
					</>
				)}
			</ChartsWrapper>
		</Layout>
	)
}

const chartOptions = {
	legend: {
		orient: 'vertical',
		align: 'left',
		top: 30,
		left: 0
	},
	valueAsYAxis: {
		position: 'right'
	}
}

const LazyChartWrapper = styled(LazyChart)`
	grid-column: 1 / -1;
`
