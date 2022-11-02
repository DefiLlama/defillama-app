import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowUpRight, DownloadCloud } from 'react-feather'
import Layout from '~/layout'
import AuditInfo from '~/components/AuditInfo'
import { YieldsSearch } from '~/components/Search'
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
import { useYieldChartLendBorrow, useYieldConfigData, useYieldPoolData } from '~/api/categories/yield/client'
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

	const { data: pool, loading: fetchingPoolData } = useYieldPoolData(query.pool)

	const { data: chart, loading: fetchingChartData } = useYieldChartLendBorrow(query.pool)

	const poolData = pool?.data ? pool.data[0] : {}

	const { data: config, loading: fetchingConfigData } = useYieldConfigData(poolData.project ?? '')

	// prepare csv data
	const downloadCsv = () => {
		const rows = [
			[
				'DATE',
				'SUPPLY_BASE',
				'SUPPLY_REWARD',
				'BORROW_NET',
				'BORROW_BASE',
				'BORROW_REWARD',
				'SUPPLIED',
				'BORROWED',
				'AVAILABLE'
			]
		]

		chart.data?.forEach((item) => {
			rows.push([
				item.timestamp,
				item.apyBase,
				item.apyReward,
				-item.apyBaseBorrow + item.apyRewardBorrow,
				-item.apyBaseBorrow,
				item.apyRewardBorrow,
				item.totalSupplyUsd,
				item.totalBorrowUsd,
				category === 'CDP' && item.debtCeilingUsd
					? item.debtCeilingUsd - item.totalBorrowUsd
					: category === 'CDP'
					? null
					: item.totalSupplyUsd === null && item.totalBorrowUsd === null
					? null
					: item.totalSupplyUsd - item.totalBorrowUsd
			])
		})

		download(`${query.pool}.csv`, rows.map((r) => r.join(',')).join('\n'))
	}

	const projectName = config?.name ?? ''
	const audits = config?.audits ?? ''
	const audit_links = config?.audit_links ?? []
	const url = config?.url ?? ''
	const twitter = config?.twitter ?? ''
	const category = config?.category ?? ''

	const latestValues = chart?.data?.slice(-1)[0] ?? []
	const apyBase = latestValues?.apyBase ?? 0
	const apyReward = latestValues?.apyReward ?? 0
	const apyBaseBorrow = -latestValues?.apyBaseBorrow ?? 0
	const apyRewardBorrow = latestValues?.apyRewardBorrow ?? 0
	const totalSupplyUsd = latestValues?.totalSupplyUsd ?? 0
	const totalBorrowUsd = latestValues?.totalBorrowUsd ?? 0
	const debtCeilingUsd = latestValues?.debtCeilingUsd ?? 0
	const totalAvailableUsd =
		category === 'CDP' && debtCeilingUsd
			? debtCeilingUsd - totalBorrowUsd
			: category === 'CDP'
			? null
			: totalSupplyUsd - totalBorrowUsd
	const newBorrowApy = Number(apyBaseBorrow) + Number(apyRewardBorrow)

	const isLoading = fetchingPoolData || fetchingChartData || fetchingConfigData

	const colors = {}
	;['Supplied', 'Borrowed', 'Available'].forEach((l, index) => {
		colors[l] = getColorFromNumber(index, 6)
	})

	const {
		barChartDataSupply = [],
		barChartDataBorrow = [],
		areaChartData = [],
		netBorrowChartData = []
	} = useMemo(() => {
		if (!chart) return {}

		// - format for chart components
		const data = chart?.data?.map((el) => [
			// round time to day
			Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000),
			el.totalSupplyUsd,
			el.totalBorrowUsd,
			category === 'CDP' && el.debtCeilingUsd
				? el.debtCeilingUsd - el.totalBorrowUsd
				: category === 'CDP'
				? null
				: el.totalSupplyUsd === null && el.totalBorrowUsd === null
				? null
				: el.totalSupplyUsd - el.totalBorrowUsd,
			el.apyBase?.toFixed(2) ?? null,
			el.apyReward?.toFixed(2) ?? null,
			-el.apyBaseBorrow?.toFixed(2) ?? null,
			el.apyRewardBorrow?.toFixed(2) ?? null,
			el.apyBaseBorrow === null && el.apyRewardBorrow === null
				? null
				: (-el.apyBaseBorrow + el.apyRewardBorrow).toFixed(2) ?? null
		])

		const dataBarSupply = data?.filter((t) => t[4] !== null || t[5] !== null) ?? []
		const barChartDataSupply = dataBarSupply.length
			? dataBarSupply.map((item) => ({ date: item[0], Base: item[4], Reward: item[5] }))
			: []

		const dataBarBorrow = data?.filter((t) => Number.isFinite(t[6]) || t[7] !== null) ?? []
		const barChartDataBorrow = dataBarBorrow.length
			? dataBarBorrow.map((item) => ({ date: item[0], Base: item[6], Reward: item[7] }))
			: []

		const dataArea = data?.filter((t) => t[1] !== null && t[2] !== null && t[3] !== null) ?? []
		const areaChartData = dataArea.length
			? dataArea.map((t) => ({ date: t[0], Supplied: t[1], Borrowed: t[2], Available: t[3] }))
			: []

		const dataNetBorrowArea = data?.filter((t) => t[8] !== null) ?? []
		const netBorrowChartData = dataNetBorrowArea.length ? dataNetBorrowArea.map((t) => [t[0], t[8]]) : []

		return { barChartDataSupply, barChartDataBorrow, areaChartData, netBorrowChartData }
	}, [chart, category])

	return (
		<>
			<YieldsSearch step={{ category: 'Yields', name: poolData.symbol, hideOptions: true }} />

			<StatsSection>
				<PoolDetails>
					<Name style={{ flexWrap: 'wrap' }}>
						{poolData.poolMeta !== undefined && poolData.poolMeta !== null && poolData.poolMeta.length > 1
							? `${poolData.symbol} (${poolData.poolMeta})`
							: poolData.symbol ?? 'Loading'}

						<Symbol>
							({projectName} - {poolData.chain})
						</Symbol>
					</Name>

					<TableWrapper>
						<tbody>
							<tr>
								<th>Supply Base APY:</th>
								<td>{apyBase.toFixed(2)}%</td>
							</tr>
							<tr>
								<th>Supply Reward APY:</th>
								<td>{apyReward.toFixed(2)}%</td>
							</tr>

							<tr data-divider>
								<th></th>
							</tr>

							<tr>
								<th>Net Borrow APY:</th>
								<td>{newBorrowApy.toFixed(2)}%</td>
							</tr>
							<tr>
								<th>Borrow Base APY:</th>
								<td>{apyBaseBorrow.toFixed(2)}%</td>
							</tr>
							<tr>
								<th>Borrow Reward APY:</th>
								<td>{apyRewardBorrow.toFixed(2)}%</td>
							</tr>

							<tr data-divider>
								<th></th>
							</tr>

							<tr>
								<th>Supplied:</th>
								<td>${toK(totalSupplyUsd ?? 0)}</td>
							</tr>
							<tr>
								<th>Borrowed:</th>
								<td>${toK(totalBorrowUsd ?? 0)}</td>
							</tr>
							<tr>
								<th>Available:</th>
								<td>${toK(totalAvailableUsd ?? 0)}</td>
							</tr>
						</tbody>
					</TableWrapper>
				</PoolDetails>

				<ChartWrapper style={{ position: 'relative' }}>
					<AreaChart title="Net Borrow APY" chartData={netBorrowChartData} color={backgroundColor} valueSymbol={'%'} />

					<DownloadToCSV as="button" onClick={downloadCsv}>
						<DownloadCloud size={14} />
						<span>&nbsp;&nbsp;.csv</span>
					</DownloadToCSV>
				</ChartWrapper>

				<DownloadToCSV as="button" onClick={downloadCsv}>
					<DownloadCloud size={14} />
					<span>&nbsp;&nbsp;.csv</span>
				</DownloadToCSV>
			</StatsSection>

			<ChartsWrapper>
				{fetchingChartData ? (
					<ChartsPlaceholder>Loading...</ChartsPlaceholder>
				) : (
					chart?.data?.length && (
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

							<LazyChart>
								<StackedBarChart
									title="Borrow APY"
									chartData={barChartDataBorrow}
									stacks={barChartStacks}
									stackColors={stackedBarChartColors}
									valueSymbol={'%'}
								/>
							</LazyChart>

							{areaChartData?.length ? (
								<LazyChart>
									<AreaChart
										chartData={areaChartData}
										title="Pool Liquidity"
										customLegendName="Filter"
										customLegendOptions={['Supplied', 'Borrowed', 'Available']}
										valueSymbol="$"
										stackColors={colors}
									/>
								</LazyChart>
							) : null}
						</>
					)
				)}
			</ChartsWrapper>

			<InfoWrapper>
				<Section>
					<h3>Protocol Information</h3>
					<FlexRow>
						<span>Category</span>
						<span>:</span>
						<Link href={`/protocols/${category.toLowerCase()}`}>{category}</Link>
					</FlexRow>

					<AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} isLoading={isLoading} />

					<LinksWrapper>
						{(url || isLoading) && (
							<Link href={url} passHref>
								<Button
									as="a"
									target="_blank"
									rel="noopener noreferrer"
									useTextColor={true}
									color={backgroundColor}
									disabled={isLoading}
								>
									<span>Website</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}

						{twitter && (
							<Link href={`https://twitter.com/${twitter}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>Twitter</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>
			</InfoWrapper>
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

const DownloadToCSV = styled(DownloadButton)`
	position: absolute;
	top: 20px;
	right: 24px;
`

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
