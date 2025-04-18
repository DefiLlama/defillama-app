import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Layout from '~/layout'
import { AuditInfo } from '~/components/AuditInfo'
import { download, toK } from '~/utils'
import { useYieldChartLendBorrow, useYieldConfigData, useYieldPoolData } from '~/containers/Yields/queries/client'
import { getColorFromNumber } from '~/utils'
import { useEffect } from 'react'

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false,
	loading: () => <></>
})

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false,
	loading: () => <></>
})

const PageView = () => {
	const router = useRouter()

	useEffect(() => {
		router.push(`/yields/pool/${router.query.pool}`)
	})
	return <div></div>
}

// const PageView = () => {
// 	const { query } = useRouter()

// 	const { data: pool, isLoading: fetchingPoolData } = useYieldPoolData(query.pool)

// 	const { data: chart, isLoading: fetchingChartData } = useYieldChartLendBorrow(query.pool)

// 	const poolData = pool?.data ? pool.data[0] : {}

// 	const { data: config, isLoading: fetchingConfigData } = useYieldConfigData(poolData.project ?? '')

// 	// prepare csv data
// 	const downloadCsv = () => {
// 		const rows = [
// 			[
// 				'DATE',
// 				'SUPPLY_BASE',
// 				'SUPPLY_REWARD',
// 				'BORROW_NET',
// 				'BORROW_BASE',
// 				'BORROW_REWARD',
// 				'SUPPLIED',
// 				'BORROWED',
// 				'AVAILABLE'
// 			]
// 		]

// 		chart.data?.forEach((item) => {
// 			rows.push([
// 				item.timestamp,
// 				item.apyBase,
// 				item.apyReward,
// 				-item.apyBaseBorrow + item.apyRewardBorrow,
// 				-item.apyBaseBorrow,
// 				item.apyRewardBorrow,
// 				item.totalSupplyUsd,
// 				item.totalBorrowUsd,
// 				category === 'CDP' && item.debtCeilingUsd
// 					? item.debtCeilingUsd - item.totalBorrowUsd
// 					: category === 'CDP'
// 					? null
// 					: item.totalSupplyUsd === null && item.totalBorrowUsd === null
// 					? null
// 					: item.totalSupplyUsd - item.totalBorrowUsd
// 			])
// 		})

// 		download(`${query.pool}.csv`, rows.map((r) => r.join(',')).join('\n'))
// 	}

// 	const projectName = config?.name ?? ''
// 	const audits = config?.audits ?? ''
// 	const audit_links = config?.audit_links ?? []
// 	const url = config?.url ?? ''
// 	const twitter = config?.twitter ?? ''
// 	const category = config?.category ?? ''

// 	const latestValues = chart?.data?.slice(-1)[0] ?? []
// 	const apyBase = latestValues?.apyBase ?? 0
// 	const apyReward = latestValues?.apyReward ?? 0
// 	const apyBaseBorrow = -latestValues?.apyBaseBorrow ?? 0
// 	const apyRewardBorrow = latestValues?.apyRewardBorrow ?? 0
// 	const totalSupplyUsd = latestValues?.totalSupplyUsd ?? 0
// 	const totalBorrowUsd = latestValues?.totalBorrowUsd ?? 0
// 	const debtCeilingUsd = latestValues?.debtCeilingUsd ?? 0
// 	const totalAvailableUsd =
// 		category === 'CDP' && debtCeilingUsd
// 			? debtCeilingUsd - totalBorrowUsd
// 			: category === 'CDP'
// 			? null
// 			: totalSupplyUsd - totalBorrowUsd
// 	const newBorrowApy = Number(apyBaseBorrow) + Number(apyRewardBorrow)

// 	const isLoading = fetchingPoolData || fetchingChartData || fetchingConfigData

// 	const colors = {}
// 	;['Supplied', 'Borrowed', 'Available'].forEach((l, index) => {
// 		colors[l] = getColorFromNumber(index, 6)
// 	})

// 	const {
// 		barChartDataSupply = [],
// 		barChartDataBorrow = [],
// 		areaChartData = [],
// 		netBorrowChartData = []
// 	} = useMemo(() => {
// 		if (!chart) return {}

// 		// - format for chart components
// 		const data = chart?.data?.map((el) => [
// 			// round time to day
// 			Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000),
// 			el.totalSupplyUsd,
// 			el.totalBorrowUsd,
// 			category === 'CDP' && el.debtCeilingUsd
// 				? el.debtCeilingUsd - el.totalBorrowUsd
// 				: category === 'CDP'
// 				? null
// 				: el.totalSupplyUsd === null && el.totalBorrowUsd === null
// 				? null
// 				: el.totalSupplyUsd - el.totalBorrowUsd,
// 			el.apyBase?.toFixed(2) ?? null,
// 			el.apyReward?.toFixed(2) ?? null,
// 			-el.apyBaseBorrow?.toFixed(2) ?? null,
// 			el.apyRewardBorrow?.toFixed(2) ?? null,
// 			el.apyBaseBorrow === null && el.apyRewardBorrow === null
// 				? null
// 				: (-el.apyBaseBorrow + el.apyRewardBorrow).toFixed(2) ?? null
// 		])

// 		const dataBarSupply = data?.filter((t) => t[4] !== null || t[5] !== null) ?? []
// 		const barChartDataSupply = dataBarSupply.length
// 			? dataBarSupply.map((item) => ({ date: item[0], Base: item[4], Reward: item[5] }))
// 			: []

// 		const dataBarBorrow = data?.filter((t) => Number.isFinite(t[6]) || t[7] !== null) ?? []
// 		const barChartDataBorrow = dataBarBorrow.length
// 			? dataBarBorrow.map((item) => ({ date: item[0], Base: item[6], Reward: item[7] }))
// 			: []

// 		const dataArea = data?.filter((t) => t[1] !== null && t[2] !== null && t[3] !== null) ?? []
// 		const areaChartData = dataArea.length
// 			? dataArea.map((t) => ({ date: t[0], Supplied: t[1], Borrowed: t[2], Available: t[3] }))
// 			: []

// 		const dataNetBorrowArea = data?.filter((t) => t[8] !== null) ?? []
// 		const netBorrowChartData = dataNetBorrowArea.length ? dataNetBorrowArea.map((t) => [t[0], t[8]]) : []

// 		return { barChartDataSupply, barChartDataBorrow, areaChartData, netBorrowChartData }
// 	}, [chart, category])

// 	return (
// 		<>
// 			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
// 				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
// 					<Name style={{ flexWrap: 'wrap' }}>
// 						{poolData.poolMeta !== undefined && poolData.poolMeta !== null && poolData.poolMeta.length > 1
// 							? `${poolData.symbol} (${poolData.poolMeta})`
// 							: poolData.symbol ?? 'Loading'}

// 					<span className="font-normal mr-auto">
// 							({projectName} - {poolData.chain})
// 						</span>
// 					</Name>

// 					<table className="w-full text-base border-collapse">
// 						<tbody>
// 							<tr>
// 								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">Supply Base APY:</th>
// 								<td className="font-jetbrains text-right">{apyBase.toFixed(2)}%</td>
// 							</tr>
// 							<tr className="border-b border-[var(--divider)]">
// 								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">Supply Reward APY:</th>
// 								<td className="font-jetbrains text-right">{apyReward.toFixed(2)}%</td>
// 							</tr>

// 							<tr>
// 								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pt-1">Net Borrow APY:</th>
// 								<td className="font-jetbrains text-right">{newBorrowApy.toFixed(2)}%</td>
// 							</tr>
// 							<tr>
// 								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">Borrow Base APY:</th>
// 								<td className="font-jetbrains text-right">{apyBaseBorrow.toFixed(2)}%</td>
// 							</tr>
// 							<tr className="border-b border-[var(--divider)]">
// 								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">Borrow Reward APY:</th>
// 								<td className="font-jetbrains text-right">{apyRewardBorrow.toFixed(2)}%</td>
// 							</tr>

// 							<tr>
// 								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pt-1">Supplied:</th>
// 								<td className="font-jetbrains text-right">${toK(totalSupplyUsd ?? 0)}</td>
// 							</tr>
// 							<tr>
// 								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">Borrowed:</th>
// 								<td className="font-jetbrains text-right">${toK(totalBorrowUsd ?? 0)}</td>
// 							</tr>
// 							<tr>
// 								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">Available:</th>
// 								<td className="font-jetbrains text-right">${toK(totalAvailableUsd ?? 0)}</td>
// 							</tr>
// 						</tbody>
// 					</TableWrapper>
// 				</div>

// 				<LazyChart className="bg-[var(--cards-bg)] rounded-md pt-3 col-span-2  min-h-[372px]">
// 					<AreaChart title="Net Borrow APY" chartData={netBorrowChartData} color={backgroundColor} valueSymbol={'%'} />

// 					<ButtonLight as="button" onClick={downloadCsv} useTextColor={true}>
// 						<Icon name="download-cloud" height={14} width={14} />
// 						<span>&nbsp;&nbsp;.csv</span>
// 					</ButtonLight>
// 				</LazyChart>

// 				<ButtonLight as="button" onClick={downloadCsv} useTextColor={true}>
// 					<Icon name="download-cloud" height={14} width={14} />
// 					<span>&nbsp;&nbsp;.csv</span>
// 				</ButtonLight>
// 			</div>

// 			<div className="grid grid-cols-2 bg-[var(--cards-bg)] rounded-md">
// 				{fetchingChartData ? (
// 					<p className="flex items-center justify-center text-center h-[400px] col-span-full">Loading...</p>
// 				) : (
// 					chart?.data?.length && (
// 						<>
// 							{barChartDataSupply?.length ? (
// 								<LazyChart>
// 									<StackedBarChart
// 										title="Supply APY"
// 										chartData={barChartDataSupply}
// 										stacks={barChartStacks}
// 										stackColors={stackedBarChartColors}
// 										valueSymbol={'%'}
// 									/>
// 								</LazyChart>
// 							) : null}

// 							<LazyChart>
// 								<StackedBarChart
// 									title="Borrow APY"
// 									chartData={barChartDataBorrow}
// 									stacks={barChartStacks}
// 									stackColors={stackedBarChartColors}
// 									valueSymbol={'%'}
// 								/>
// 							</LazyChart>

// 							{areaChartData?.length ? (
// 								<LazyChart>
// 									<AreaChart
// 										chartData={areaChartData}
// 										title="Pool Liquidity"
// 										customLegendName="Filter"
// 										customLegendOptions={['Supplied', 'Borrowed', 'Available']}
// 										valueSymbol="$"
// 										stackColors={colors}
// 									/>
// 								</LazyChart>
// 							) : null}
// 						</>
// 					)
// 				)}
// 			</div>

// <div className="flex flex-col gap-4 bg-[var(--cards-bg)] rounded-md p-6">

// 					<h3 className="font-semibold text-lg">Protocol Information</h3>
// 					<p className="flex items-center gap-2">
// 						<span>Category</span>
// 						<span>:</span>
// 						<Link href={`/protocols/${category.toLowerCase()}`}>{category}</Link>
// 					</p>

// 					<AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} isLoading={isLoading} />

// 			<div className='flex items-center gap-4 flex-wrap'>
// 						{(url || isLoading) && (
// 							<Link href={url} passHref>
// 								<Button
// 									as="a"
// 									target="_blank"
// 									rel="noopener noreferrer"
// 									useTextColor={true}
// 									color={backgroundColor}
// 									disabled={isLoading}
// 								>
// 									<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
// 								</Button>
// 							</Link>
// 						)}

// 						{twitter && (
// 							<Link href={`https://twitter.com/${twitter}`} passHref>
// 								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
// 									<span>Twitter</span> <Icon name="arrow-up-right" height={14} width={14} />
// 								</Button>
// 							</Link>
// 						)}
// 					</div>
// 				</div>
// 		</>
// 	)
// }

const backgroundColor = '#4f8fea'

const stackedBarChartColors = {
	Base: backgroundColor,
	Reward: '#E59421'
}

const barChartStacks = {
	Base: 'a',
	Reward: 'a'
}

export default function YieldPoolPage(props) {
	return (
		<Layout title={`Yield Chart - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
