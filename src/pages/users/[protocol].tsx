import * as React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { useFetchProtocolUserMetrics } from '~/api/categories/users/client'
import FormattedName from '~/components/FormattedName'
import { DetailsWrapper, Name, Stat, StatsSection, StatWrapper } from '~/components/ProtocolAndPool'
import { ProtocolsChainsSearch } from '~/components/Search'
import TokenLogo from '~/components/TokenLogo'
import Layout from '~/layout'
import { tokenIconUrl } from '~/utils'
import type { IChartProps } from '~/components/TokenChart/types'

const BarChart = dynamic(() => import('~/components/TokenChart/BarChart'), {
	ssr: false
}) as React.FC<IChartProps>

interface IAllChains {
	date: string | number
	'Total Users': number
	'Unique Users': number
}

export default function Protocol() {
	const { query } = useRouter()

	const protocolName = typeof query.protocol === 'string' ? query.protocol : null

	const { data, loading } = useFetchProtocolUserMetrics(protocolName)

	const { chains, allChains, totalUsers, uniqueUsers } = React.useMemo(() => {
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
		<Layout title="DefiLlama" defaultSEO>
			<ProtocolsChainsSearch />

			<StatsSection>
				<DetailsWrapper>
					<Name>
						<TokenLogo logo={tokenIconUrl(protocolName)} size={24} />
						<FormattedName text={protocolName ? protocolName + ' ' : ''} maxCharacters={16} fontWeight={700} />
					</Name>

					<StatWrapper>
						<Stat>
							<span>Total Users</span>
							<span>{data && totalUsers}</span>
						</Stat>
					</StatWrapper>
					<StatWrapper>
						<Stat>
							<span>Unique Users</span>
							<span>{data && uniqueUsers}</span>
						</Stat>
					</StatWrapper>
				</DetailsWrapper>
				<ChartWrapper>
					{!loading && data && (
						<BarChart
							chartData={allChains}
							title=""
							moneySymbol=""
							tokensUnique={['Total Users', 'Unique Users']}
							legendName="User"
						/>
					)}
				</ChartWrapper>
			</StatsSection>
		</Layout>
	)
}

const ChartWrapper = styled.div`
	padding: 20px;
	min-height: 400px;
	grid-column: span 1;
`
