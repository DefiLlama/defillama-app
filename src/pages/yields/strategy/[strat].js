import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowUpRight, DownloadCloud } from 'react-feather'
import Layout from '~/layout'
import AuditInfo from '~/components/AuditInfo'
import { download, toK } from '~/utils'
import {
	Button,
	DownloadButton,
	FlexRow,
	InfoWrapper,
	LinksWrapper,
	Name,
	Section,
	Symbol,
	ChartsWrapper,
	LazyChart,
	ChartsPlaceholder,
	ChartWrapper,
	DetailsTable
} from '~/layout/ProtocolAndPool'
import { PoolDetails } from '~/layout/Pool'
import { StatsSection } from '~/layout/Stats/Medium'
import {
	useYieldChartData,
	useYieldChartLendBorrow,
	useYieldConfigData,
	useYieldPoolData,
	useConfigPool
} from '~/api/categories/yield/client'
import { getColorFromNumber } from '~/utils'
import styled from 'styled-components'

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false,
	loading: () => <></>
})

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false,
	loading: () => <></>
})

const PageView = () => {
	const { query } = useRouter()

	const tokens = query.strat?.split('_')

	const lendToken = tokens?.length ? tokens[0] : ''
	const borrowToken = tokens?.length ? tokens[1] : ''
	const farmToken = tokens?.length ? tokens[2] : ''

	const { data: lendHistory, loading: fetchingLendData } = useYieldChartData(lendToken)
	const { data: borrowHistory, loading: fetchingBorrowData } = useYieldChartLendBorrow(borrowToken)
	const { data: farmHistory, loading: fetchingFarmData } = useYieldChartData(farmToken)

	const { data: configData } = useConfigPool(tokens?.length ? tokens.join(',') : '')

	const parseTimestamp = (timestamp) => {
		return new Date(timestamp.split('T')[0]).getTime() / 1000
	}

	const {
		strategyData = [],
		barChartDataSupply = [],
		barChartDataBorrow = [],
		barChartDataFarm = [],
		lendApy,
		borrowApy,
		farmApy,
		strategyAPY,
		ltv
	} = useMemo(() => {
		if (!lendHistory || !borrowHistory || !farmHistory || !configData) return {}

		const lendData = lendHistory?.data?.map((t) => ({
			...t,
			timestamp: parseTimestamp(t.timestamp)
		}))
		const borrowData = borrowHistory?.data?.map((t) => ({
			...t,
			timestamp: parseTimestamp(t.timestamp)
		}))
		const farmData = farmHistory?.data?.map((t) => ({
			...t,
			timestamp: parseTimestamp(t.timestamp)
		}))

		const uniqueDates = [
			...new Set(
				lendData
					.map((d) => d.timestamp)
					.concat(borrowData.map((d) => d.timestamp))
					.concat(farmData.map((d) => d.timestamp))
			)
		]

		let merged = []
		uniqueDates.forEach((d) => {
			merged.push({
				timestamp: d,
				lendData: lendData.find((i) => i.timestamp === d),
				borrowData: borrowData.find((i) => i.timestamp === d),
				farmData: farmData.find((i) => i.timestamp === d)
			})
		})
		merged = merged.filter((t) => !Object.values(t).includes(undefined))

		const configs = configData?.data || []

		const ltv = configs?.find((p) => p.config_id === lendToken)?.ltv || 0

		merged = merged.map((t) => ({
			...t,
			strategyAPY:
				t.lendData.apy + (-t.borrowData.apyBaseBorrow + t.borrowData.apyRewardBorrow) * ltv + t.farmData.apy * ltv
		}))

		const strategyData = merged.map((t) => [t.timestamp, t.strategyAPY.toFixed(2)])

		// make sure this is the most recent value
		const latestValues = merged?.slice(-1)[0] ?? []

		const lendApy = latestValues?.lendData?.apy ?? 0

		const borrowApyBase = latestValues?.borrowData?.apyBaseBorrow ?? 0
		const borrowApyReward = latestValues?.borrowData?.apyRewardBorrow ?? 0
		const borrowApy = -borrowApyBase + borrowApyReward

		const farmApy = latestValues?.farmData?.apy ?? 0

		const strategyAPY = latestValues?.strategyAPY ?? 0

		const barChartDataSupply = merged?.length
			? merged.map((item) => ({
					date: item.lendData.timestamp,
					Base: item.lendData?.apyBase?.toFixed(2),
					Reward: item.lendData?.apyReward?.toFixed(2)
			  }))
			: []

		const barChartDataBorrow = merged?.length
			? merged.map((item) => ({
					date: item.borrowData.timestamp,
					Base: -item.borrowData?.apyBaseBorrow?.toFixed(2),
					Reward: item.borrowData?.apyRewardBorrow?.toFixed(2)
			  }))
			: []

		const barChartDataFarm = merged?.length
			? merged.map((item) => ({
					date: item.farmData.timestamp,
					Base: item.farmData?.apyBase?.toFixed(2) ?? item.apy?.toFixed(2),
					Reward: item.farmData?.apyReward?.toFixed(2)
			  }))
			: []

		return {
			strategyData,
			lendApy,
			borrowApy,
			farmApy,
			strategyAPY,
			ltv,
			barChartDataSupply,
			barChartDataBorrow,
			barChartDataFarm
		}
	}, [lendHistory, borrowHistory, farmHistory, configData, lendToken])

	return (
		<>
			<StatsSection>
				<PoolDetails>
					<Name style={{ flexWrap: 'wrap' }}>APY Breakdown:</Name>
					<TableWrapper>
						<tbody>
							<tr>
								<th>Supply APY:</th>
								<td>{lendApy?.toFixed(2)}%</td>
							</tr>

							<tr data-divider>
								<th></th>
							</tr>

							<tr>
								<th>Borrow APY:</th>
								<td>{borrowApy?.toFixed(2)}%</td>
							</tr>

							<tr data-divider>
								<th></th>
							</tr>

							<tr>
								<th>Farm APY:</th>
								<td>{farmApy?.toFixed(2)}%</td>
							</tr>

							<tr data-divider>
								<th></th>
							</tr>

							<tr>
								<th>Strategy APY:</th>
								<td>{strategyAPY?.toFixed(2)}%</td>
							</tr>

							<tr data-divider>
								<th></th>
							</tr>

							<tr>
								<th>Max LTV:</th>
								<td>{ltv?.toFixed(2)}%</td>
							</tr>
						</tbody>
					</TableWrapper>
				</PoolDetails>

				<ChartWrapper style={{ position: 'relative' }}>
					<AreaChart title="Strategy APY" chartData={strategyData} color={backgroundColor} valueSymbol={'%'} />
				</ChartWrapper>
			</StatsSection>

			<InfoWrapper>
				<Section>
					<h3>Steps</h3>
					<FlexRow>
						<span>-</span>
						Lend {configData?.data.find((c) => c.config_id === lendToken)?.symbol} as collateral on{' '}
						{configData?.data.find((c) => c.config_id === lendToken)?.project} which earns a Supply APY of{' '}
						{lendApy?.toFixed(2)}%.
					</FlexRow>
					<FlexRow>
						<span>-</span>
						Borrow {configData?.data.find((c) => c.config_id === borrowToken)?.symbol} against your{' '}
						{configData?.data.find((c) => c.config_id === lendToken)?.symbol} collateral with a max LTV of {ltv}% and a
						borrow APY of {borrowApy?.toFixed(2)}% (
						{borrowApy > 0 ? 'You get paid by borrowing' : 'The interest you need to pay'}).
					</FlexRow>

					{configData?.data.find((c) => c.config_id === borrowToken)?.symbol !==
					configData?.data.find((c) => c.config_id === farmToken)?.symbol ? (
						<FlexRow>
							<span>-</span>
							Swap borrowed {configData?.data.find((c) => c.config_id === borrowToken)?.symbol} for{' '}
							{configData?.data.find((c) => c.config_id === farmToken)?.symbol}
						</FlexRow>
					) : null}

					<FlexRow>
						<span>-</span>
						Farm with {configData?.data.find((c) => c.config_id === farmToken)?.symbol} on{' '}
						{configData?.data.find((c) => c.config_id === farmToken)?.project} which earns {farmApy?.toFixed(2)}%.
					</FlexRow>

					<FlexRow>
						The Strategy APY is: {lendApy?.toFixed(2)}%{' '}
						{borrowApy > 0 ? `+ ${borrowApy?.toFixed(2)}` : borrowApy?.toFixed(2)}% * {ltv?.toFixed(2)}% +{' '}
						{farmApy?.toFixed(2)}% * {ltv?.toFixed(2)}% = {strategyAPY?.toFixed(2)}%
					</FlexRow>
				</Section>
			</InfoWrapper>

			<ChartsWrapper>
				{fetchingLendData ? (
					<ChartsPlaceholder>Loading...</ChartsPlaceholder>
				) : (
					lendHistory?.data?.length && (
						<>
							{barChartDataSupply?.length ? (
								<LazyChart>
									<StackedBarChart
										title="Supply APY"
										chartData={barChartDataSupply}
										stacks={barChartStacks}
										stackColors={stackedBarChartColors}
										valueSymbol={'%'}
									/>
								</LazyChart>
							) : null}

							{barChartDataBorrow?.length ? (
								<LazyChart>
									<StackedBarChart
										title="Borrow APY"
										chartData={barChartDataBorrow}
										stacks={barChartStacks}
										stackColors={stackedBarChartColors}
										valueSymbol={'%'}
									/>
								</LazyChart>
							) : null}

							{barChartDataFarm?.length ? (
								<LazyChart>
									<StackedBarChart
										title="Farm APY"
										chartData={barChartDataFarm}
										stacks={barChartStacks}
										stackColors={stackedBarChartColors}
										valueSymbol={'%'}
									/>
								</LazyChart>
							) : null}
						</>
					)
				)}
			</ChartsWrapper>
		</>
	)
}

const backgroundColor = '#4f8fea'

const stackedBarChartColors = {
	Base: backgroundColor,
	Reward: '#E59421'
}
const barChartStacks = {
	Base: 'a',
	Reward: 'a'
}

const TableWrapper = styled(DetailsTable)`
	tr[data-divider] {
		position: relative;
		th::before {
			content: '';
			position: absolute;
			top: 5px;
			left: 0;
			right: 0;
			height: 10px;
			border-top: 1px solid ${({ theme }) => theme.divider};
		}
	}
`

export default function YieldPoolPage(props) {
	return (
		<Layout title={`Yield Chart - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
