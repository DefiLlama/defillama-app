import { lazy, Suspense, useMemo } from 'react'
import { useRouter } from 'next/router'
import { LazyChart } from '~/components/LazyChart'
import { LoadingDots } from '~/components/Loaders'
import {
	useConfigPool,
	useYieldChartData,
	useYieldChartLendBorrow,
	useYieldConfigData
} from '~/containers/Yields/queries/client'
import { calculateLoopAPY } from '~/containers/Yields/queries/index'
import Layout from '~/layout'
import { formattedNum } from '~/utils'

const BarChart = lazy(() => import('~/components/ECharts/BarChart'))

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart'))

const PageView = () => {
	const { query } = useRouter()

	const tokens = query.strat?.split('_')

	const lendToken = tokens?.length ? tokens[0] : ''
	const borrowToken = tokens?.length ? tokens[1] : ''
	const farmToken = tokens?.length ? tokens[2] : ''

	const { data: lendHistory, isLoading: fetchingLendData } = useYieldChartData(lendToken)
	const { data: borrowHistory, isLoading: fetchingBorrowData } = useYieldChartLendBorrow(borrowToken)
	const { data: farmHistory, isLoading: fetchingFarmData } = useYieldChartData(farmToken)
	const { data: configData, isLoading: fetchingConfigData } = useConfigPool(tokens?.length ? tokens.join(',') : '')

	const project = configData?.data?.find((p) => p.config_id === lendToken)?.project

	const { data: config, isLoading: fetchingConfig } = useYieldConfigData(project ?? '')
	const lendProjectCategory = config?.category

	const parseTimestamp = (timestamp) => {
		return new Date(timestamp.split('T')[0]).getTime() / 1000
	}

	const {
		finalChart = [],
		barChartDataSupply = [],
		barChartDataBorrow = [],
		barChartDataFarm = [],
		lendApy,
		borrowApy,
		farmApy,
		finalAPY,
		ltv,
		farmTVL,
		borrowAvailable
	} = useMemo(() => {
		if (!lendHistory || !borrowHistory || !farmHistory || !configData || !lendProjectCategory) return {}

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
		// filter merged to length where all 3 components (lend/borrow/farm values) are not null
		merged = merged.filter(
			(t) => t.lendData.apy !== null && t.borrowData.apyBaseBorrow !== null && t.farmData.apy !== null
		)

		const configs = configData?.data || []

		const ltv = configs?.find((p) => p.config_id === lendToken)?.ltv || 0

		merged = merged.map((t) => ({
			...t,
			strategyAPY:
				t.lendData.apy + (-t.borrowData.apyBaseBorrow + t.borrowData.apyRewardBorrow) * ltv + t.farmData.apy * ltv,
			loopAPY: calculateLoopAPY([{ ...t?.borrowData, apyBaseBorrow: -t?.borrowData?.apyBaseBorrow, ltv }], 10)[0]
				?.loopApy
		}))

		const strategyData = merged.map((t) => [t.timestamp, t?.strategyAPY?.toFixed(2)]).filter((t) => t[1])
		const loopData = merged.map((t) => [t.timestamp, t?.loopAPY?.toFixed(2)]).filter((t) => t[1])

		// make sure this is the most recent value
		const latestValues = merged?.slice(-1)[0] ?? []
		const farmTVL = latestValues?.farmData?.tvlUsd ?? 0
		const borrowAvailable = latestValues?.borrowData?.totalSupplyUsd - latestValues?.borrowData?.totalBorrowUsd ?? 0

		const lendApy = latestValues?.lendData?.apy ?? 0

		const borrowApyBase = latestValues?.borrowData?.apyBaseBorrow ?? 0
		const borrowApyReward = latestValues?.borrowData?.apyRewardBorrow ?? 0
		const borrowApy = -borrowApyBase + borrowApyReward

		const farmApy = latestValues?.farmData?.apy ?? 0

		const strategyAPY = latestValues?.strategyAPY ?? 0
		const loopAPY = latestValues?.loopAPY ?? 0

		const finalAPY = lendToken === borrowToken && lendProjectCategory !== 'CDP' ? loopAPY : strategyAPY
		const finalChart = lendToken === borrowToken && lendProjectCategory !== 'CDP' ? loopData : strategyData

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
					Base: item.farmData?.apyBase?.toFixed(2) ?? item.farmData.apy?.toFixed(2),
					Reward: item.farmData?.apyReward?.toFixed(2)
				}))
			: []

		return {
			finalChart,
			lendApy,
			borrowApy,
			farmApy,
			finalAPY,
			ltv,
			barChartDataSupply,
			barChartDataBorrow,
			barChartDataFarm,
			farmTVL,
			borrowAvailable
		}
	}, [lendHistory, borrowHistory, farmHistory, configData, lendToken, borrowToken, lendProjectCategory])

	const isLoading = fetchingLendData || fetchingBorrowData || fetchingFarmData || fetchingConfigData || fetchingConfig

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 text-base xl:col-span-1">
					<h1 className="text-xl font-bold">APY Breakdown:</h1>
					<h2 className="flex items-center justify-between gap-1">
						<span className="font-bold">Strategy APY</span>
						<span className="font-jetbrains ml-auto">
							{isLoading || finalAPY == null ? '' : `${finalAPY.toFixed(2)}%`}
						</span>
					</h2>
					<div className="flex flex-col gap-1">
						<p className="flex items-center gap-1">
							<span>Supply APY:</span>
							<span className="font-jetbrains ml-auto">
								{isLoading || lendApy == null ? '' : `${lendApy.toFixed(2)}%`}
							</span>
						</p>
						<p className="flex items-center gap-1">
							<span>Borrow APY:</span>
							<span className="font-jetbrains ml-auto">
								{isLoading || borrowApy == null ? '' : `${borrowApy.toFixed(2)}%`}
							</span>
						</p>
						<p className="flex items-center gap-1">
							<span>Farm APY:</span>
							<span className="font-jetbrains ml-auto">
								{isLoading || farmApy == null ? '' : `${farmApy.toFixed(2)}%`}
							</span>
						</p>
						<p className="flex items-center gap-1">
							<span>Max LTV:</span>
							<span className="font-jetbrains ml-auto">
								{isLoading || ltv == null ? '' : `${ltv.toFixed(2) * 100}%`}
							</span>
						</p>
						<p className="flex items-center gap-1">
							<span>Available Borrow Liquidity:</span>
							<span className="font-jetbrains ml-auto">
								{isLoading || borrowAvailable == null ? '' : formattedNum(borrowAvailable, true)}
							</span>
						</p>
						<p className="flex items-center gap-1">
							<span>Farm TVL:</span>
							<span className="font-jetbrains ml-auto">
								{isLoading || farmTVL == null ? '' : formattedNum(farmTVL, true)}
							</span>
						</p>
					</div>
				</div>
				<div className="col-span-2 min-h-[480px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<Suspense fallback={<></>}>
						<AreaChart title="Strategy APY" chartData={finalChart} color={backgroundColor} valueSymbol={'%'} />
					</Suspense>
				</div>
			</div>

			<div className="flex flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<h3 className="font-bold">Steps</h3>
				<p className="flex items-center gap-2">
					<span>1.</span>
					Lend {configData?.data.find((c) => c.config_id === lendToken)?.symbol} as collateral on{' '}
					{configData?.data.find((c) => c.config_id === lendToken)?.project} which earns a Supply APY of{' '}
					{lendApy?.toFixed(2)}%.
				</p>
				<p className="flex items-center gap-2">
					<span>2.</span>
					Borrow{' '}
					{lendProjectCategory !== 'CDP'
						? configData?.data.find((c) => c.config_id === borrowToken)?.symbol
						: configData?.data.find((c) => c.config_id === borrowToken)?.mintedCoin}{' '}
					against your {configData?.data.find((c) => c.config_id === lendToken)?.symbol} collateral with a max LTV of{' '}
					{(ltv * 100).toFixed()}% and a borrow APY of {borrowApy?.toFixed(2)}% (
					{borrowApy > 0 ? 'You get paid by borrowing' : 'The interest you need to pay'}).
				</p>

				{configData?.data.find((c) => c.config_id === borrowToken)?.symbol !==
					configData?.data.find((c) => c.config_id === farmToken)?.symbol && lendProjectCategory !== 'CDP' ? (
					<p className="flex items-center gap-2">
						<span>3.</span>
						Swap borrowed {configData?.data.find((c) => c.config_id === borrowToken)?.symbol} for{' '}
						{configData?.data.find((c) => c.config_id === farmToken)?.symbol}
					</p>
				) : null}

				<p className="flex items-center gap-2">
					{configData?.data.find((c) => c.config_id === borrowToken)?.symbol !==
					configData?.data.find((c) => c.config_id === farmToken)?.symbol ? (
						<span>4.</span>
					) : (
						<span>3.</span>
					)}
					Farm with {configData?.data.find((c) => c.config_id === farmToken)?.symbol} on{' '}
					{configData?.data.find((c) => c.config_id === farmToken)?.project} which earns {farmApy?.toFixed(2)}%.
				</p>

				{configData?.data.find((c) => c.config_id === lendToken)?.symbol ===
				configData?.data.find((c) => c.config_id === borrowToken)?.symbol ? (
					// loop strategies
					<p className="flex items-center gap-2">
						Strategy APY = Recursively lend and borrow {configData?.data.find((c) => c.config_id === lendToken)?.symbol}{' '}
						up to n-times (Strategy APY is calculated assuming 10 loops)
					</p>
				) : (
					// non loop strategies
					<p className="flex items-center gap-2">
						Strategy APY = {lendApy?.toFixed(2)}% {borrowApy > 0 ? `+ ${borrowApy?.toFixed(2)}` : borrowApy?.toFixed(2)}
						% * {ltv?.toFixed(2)} + {farmApy?.toFixed(2)}% * {ltv?.toFixed(2)} = {finalAPY?.toFixed(2)}%
					</p>
				)}
			</div>

			<div className="grid min-h-[408px] grid-cols-2 gap-2 rounded-md">
				{fetchingLendData ? (
					<p className="col-span-full flex h-[408px] items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) text-center">
						Loading
						<LoadingDots />
					</p>
				) : (
					lendHistory?.data?.length && (
						<>
							{barChartDataSupply?.length ? (
								<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<Suspense fallback={<></>}>
										<BarChart
											title="Supply APY"
											chartData={barChartDataSupply}
											stacks={barChartStacks}
											stackColors={barChartColors}
											valueSymbol={'%'}
										/>
									</Suspense>
								</LazyChart>
							) : null}

							{barChartDataBorrow?.length ? (
								<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<Suspense fallback={<></>}>
										<BarChart
											title="Borrow APY"
											chartData={barChartDataBorrow}
											stacks={barChartStacks}
											stackColors={barChartColors}
											valueSymbol={'%'}
										/>
									</Suspense>
								</LazyChart>
							) : null}

							{barChartDataFarm?.length ? (
								<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<Suspense fallback={<></>}>
										<BarChart
											title="Farm APY"
											chartData={barChartDataFarm}
											stacks={barChartStacks}
											stackColors={barChartColors}
											valueSymbol={'%'}
										/>
									</Suspense>
								</LazyChart>
							) : null}
						</>
					)
				)}
			</div>
		</>
	)
}

const backgroundColor = '#4f8fea'

const barChartColors = {
	Base: backgroundColor,
	Reward: '#E59421'
}

const barChartStacks = {
	Base: 'a',
	Reward: 'a'
}

export default function YieldPoolPage(props) {
	return (
		<Layout title={`Yields - DefiLlama`}>
			<PageView {...props} />
		</Layout>
	)
}
