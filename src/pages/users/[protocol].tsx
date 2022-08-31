import * as React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useFetchProtocolUserMetrics } from '~/api/categories/users/client'
import FormattedName from '~/components/FormattedName'
import { Name, ChartsWrapper, LazyChart, ChartsPlaceholder } from '~/components/ProtocolAndPool'
import { ProtocolsChainsSearch } from '~/components/Search'
import TokenLogo from '~/components/TokenLogo'
import Layout from '~/layout'
import { capitalizeFirstLetter, tokenIconUrl } from '~/utils'
import type { IBarChartProps } from '~/components/ECharts/types'
import styled from 'styled-components'
import { SelectLegendMultiple } from '~/components/ECharts/shared'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

interface IChainData {
	[key: string]: string | number
}

interface IAllChains {
	date: string | number
	'Total Users': number
	'Unique Users': number
}

// TODO add comments

// generate this page statically and use color based on protocol logo
export default function Protocol() {
	const { query } = useRouter()

	const protocolName = typeof query.protocol === 'string' ? query.protocol : null

	const { data, loading } = useFetchProtocolUserMetrics(protocolName)

	// get unique chains
	const chains = React.useMemo(() => {
		return Array.from(
			data?.reduce((acc, curr) => {
				acc.add(curr.chain)

				return acc
			}, new Set()) ?? new Set()
		) as Array<string>
	}, [data])

	const [selectedChains, setSelectedChains] = React.useState(chains)

	const { allUserTypes, uniqueUsersChart, uniqueUsersChartStacks, totalUsersChart, totalUsersChartStacks } =
		React.useMemo(() => {
			const sortedData = data?.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())

			const allUsersByDate = {}
			const uniqueUsersByDate = {}
			const uniqueUsersChartStacks = {}
			const totalUsersByDate = {}
			const totalUsersChartStacks = {}

			selectedChains?.forEach((chain) => {
				const allUsers = sortedData?.filter((item) => item.chain === chain && item.column_type === 'all')

				allUsers.forEach((value) => {
					const day = new Date(value.day).getTime() / 1000

					// -------------------------------- //
					if (!allUsersByDate[day]) {
						allUsersByDate[day] = {
							'Total Users': 0,
							'Unique Users': 0
						}
					}

					// -------------------------------- //
					allUsersByDate[day]['Total Users'] += value.total_users
					allUsersByDate[day]['Unique Users'] += value.unique_users
				})

				const users = sortedData?.filter((item) => item.chain === chain)

				users.forEach((value) => {
					const day = new Date(value.day).getTime() / 1000

					// -------------------------------- //
					if (!uniqueUsersByDate[day]) {
						uniqueUsersByDate[day] = {
							Others: 0
						}
					}

					if (!totalUsersByDate[day]) {
						totalUsersByDate[day] = {
							Others: 0
						}
					}

					const columnType = capitalizeFirstLetter(value.column_type)

					// -------------------------------- //
					if (columnType === 'All') {
						uniqueUsersChartStacks[columnType] = 'stackA'
						totalUsersChartStacks[columnType] = 'stackA'

						// -------------------------------- //
						uniqueUsersByDate[day]['Others'] += value.unique_users
						totalUsersByDate[day]['Others'] += value.total_users
					} else {
						uniqueUsersChartStacks[columnType] = 'stackB'
						totalUsersChartStacks[columnType] = 'stackB'

						// -------------------------------- //
						uniqueUsersChartStacks['Others'] = 'stackB'
						totalUsersChartStacks['Others'] = 'stackB'

						// -------------------------------- //
						uniqueUsersByDate[day]['Others'] -= value.unique_users
						totalUsersByDate[day]['Others'] -= value.total_users
					}

					// -------------------------------- //
					if (!uniqueUsersByDate[day][columnType]) {
						uniqueUsersByDate[day][columnType] = 0
					}

					if (!totalUsersByDate[day][columnType]) {
						totalUsersByDate[day][columnType] = 0
					}

					// -------------------------------- //
					uniqueUsersByDate[day][columnType] += value.unique_users
					totalUsersByDate[day][columnType] += value.total_users
				})
			})

			const allUserTypes: Array<IAllChains> = Object.keys(allUsersByDate).map((date) => ({
				date,
				...allUsersByDate[date]
			}))

			const uniqueUsersChart: Array<IChainData> = Object.keys(uniqueUsersByDate).map((date) => ({
				date,
				...uniqueUsersByDate[date]
			}))

			const totalUsersChart: Array<IChainData> = Object.keys(totalUsersByDate).map((date) => ({
				date,
				...totalUsersByDate[date]
			}))

			return {
				allUserTypes,
				uniqueUsersChart,
				uniqueUsersChartStacks: sortBarChartStacks(uniqueUsersChartStacks),
				totalUsersChart,
				totalUsersChartStacks: sortBarChartStacks(totalUsersChartStacks)
			}
		}, [data, selectedChains])

	return (
		<Layout title={`${protocolName} User Metrics - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />

			<SectionHeaderWrapper>
				<Name>
					<TokenLogo logo={tokenIconUrl(protocolName)} size={24} />
					<FormattedName text={protocolName ? protocolName + ' ' : ''} maxCharacters={16} fontWeight={700} />
				</Name>
				<SelectLegendMultiple
					allOptions={chains}
					options={selectedChains}
					setOptions={setSelectedChains}
					title={selectedChains.length === 1 ? 'Chain' : 'Chains'}
				/>
			</SectionHeaderWrapper>

			<ChartsWrapper>
				{loading ? (
					<ChartsPlaceholder>Loading...</ChartsPlaceholder>
				) : (
					<>
						<LazyChartWrapper>
							<BarChart
								chartData={allUserTypes}
								title="All Users"
								stacks={{ 'Unique Users': 'stackA', 'Total Users': 'stackB' }}
							/>
						</LazyChartWrapper>
						<LazyChartWrapper>
							<BarChart
								chartData={uniqueUsersChart}
								title="Unique Users"
								stacks={uniqueUsersChartStacks}
								chartOptions={chartOptions}
								height="400px"
								barWidths={{ stackB: 5 }}
							/>
						</LazyChartWrapper>
						<LazyChartWrapper>
							<BarChart
								chartData={totalUsersChart}
								title="Total Users"
								stacks={totalUsersChartStacks}
								chartOptions={chartOptions}
								height="400px"
								barWidths={{ stackB: 5 }}
							/>
						</LazyChartWrapper>
					</>
				)}
			</ChartsWrapper>
		</Layout>
	)
}

const chartOptions = {
	grid: {
		top: '80px'
	},
	yAxis: {
		position: 'right'
	},
	legend: {
		align: 'left',
		top: 30,
		left: 0
	}
}

const LazyChartWrapper = styled(LazyChart)`
	grid-column: 1 / -1;
	min-height: 400px;
`

const SectionHeaderWrapper = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 24px;
	position: relative;

	& > *:first-child {
		margin-bottom: -16px;
	}
`

function sortBarChartStacks(stacks: { [key: string]: 'string' }) {
	const sorted = {}

	for (const stack in stacks) {
		if (stack !== 'All' && stack !== 'Others') {
			sorted[stack] = stacks[stack]
		}
	}

	return { All: stacks['All'], ...sorted, Others: stacks['Others'] }
}
