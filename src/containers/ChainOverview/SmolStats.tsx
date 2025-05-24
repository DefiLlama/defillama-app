import dynamic from 'next/dynamic'
import { IChainOverviewData } from './types'
import { Suspense, useMemo } from 'react'
import { formattedNum, getPercentChange, slug } from '~/utils'
import { Tooltip } from '~/components/Tooltip'
import { BasicLink } from '~/components/Link'

const FeesGeneratedChart: any = dynamic(
	() => import('~/containers/ChainOverview/SmolCharts').then((m) => m.FeesGeneratedChart),
	{
		ssr: false
	}
)

const SmolLineChart: any = dynamic(() => import('~/containers/ChainOverview/SmolCharts').then((m) => m.SmolLineChart), {
	ssr: false
})

const SmolBarChart: any = dynamic(() => import('~/containers/ChainOverview/SmolCharts').then((m) => m.SmolBarChart), {
	ssr: false
})

const UpcomingUnlocksChart: any = dynamic(
	() => import('~/containers/ChainOverview/SmolCharts').then((m) => m.UpcomingUnlocksChart),
	{
		ssr: false
	}
)

export const SmolStats = (props: IChainOverviewData) => {
	const rwaTvl = useMemo(() => {
		if (!props.rwaTvlChartData) return null
		const chart = props.rwaTvlChartData.map((item) => [item[0], item[1].tvl])
		return {
			chart,
			change7d: chart.length > 1 ? getPercentChange(chart[chart.length - 1][1], chart[0][1]).toFixed(2) : 0
		}
	}, [props.rwaTvlChartData])

	if (
		props.chain !== 'All' &&
		!props.dexs?.chart?.length &&
		!props.chainFees?.topProtocolsChart?.length &&
		!props.stablecoins?.mcapChartData?.length
	) {
		return null
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1 isolate">
			{props.chain === 'All' ? (
				<>
					{/* {props.globalmcap?.chart?.length > 0 ? (
						<div className="col-span-1 min-h-[137px] xl:min-h-[69px] max-h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col xl:flex-row xl:flex-nowrap gap-1 xl:gap-2 last:*:xl:flex-1">
							<div className="flex flex-col gap-1">
								<Tooltip
									render={<h3 />}
									className="text-sm font-semibold !cursor-default"
									content="Total market cap of all cryptocurrencies across all chains"
								>
									Crypto Mcap
								</Tooltip>
								<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
									props.globalmcap.chart[props.globalmcap.chart.length - 1][1],
									true
								)}`}</p>
								<p className="text-xs flex items-center gap-1">
									<span
										className={`whitespace-nowrap overflow-hidden text-ellipsis ${
											+props.globalmcap.change7d >= 0 ? 'text-[var(--pct-green)]' : 'text-[var(--pct-red)]'
										}`}
									>
										{`${+props.globalmcap.change7d >= 0 ? '+' : ''}${props.globalmcap.change7d}%`}
									</span>
									<span className="text-[#666] dark:text-[#919296]">7d</span>
								</p>
							</div>
							<Suspense fallback={<></>}>
								<SmolLineChart
									series={props.globalmcap.chart}
									color={+props.globalmcap.change7d >= 0 ? 'green' : 'red'}
									name="Global Mcap"
									className={'my-auto h-[53px]'}
								/>
							</Suspense>
						</div>
					) : null} */}
					{props.unlocks?.chart?.length > 0 ? (
						<div className="col-span-1 min-h-[137px] xl:min-h-[69px] max-h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col xl:flex-row xl:flex-nowrap gap-1 xl:gap-2 last:*:xl:flex-1">
							<div className="flex flex-col gap-1">
								<Tooltip
									render={<BasicLink href="/unlocks" />}
									className="text-sm font-semibold"
									content="Value of tokens unlocking over the next 14 days"
								>
									Upcoming Unlocks
								</Tooltip>
								{props.unlocks.chart?.length > 0 ? (
									<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
										props.unlocks.total14d,
										true
									)} over 14 days`}</p>
								) : null}
							</div>
							<Suspense fallback={<></>}>
								<UpcomingUnlocksChart
									data={props.unlocks.chart}
									tokens={props.unlocks.tokens}
									name="Upcoming Unlocks"
									className={'my-auto h-[53px] md:h-[132px] xl:h-[53px]'}
								/>
							</Suspense>
						</div>
					) : null}
					{props.dexs?.chart?.length > 0 ? (
						<div className="col-span-1 min-h-[137px] xl:min-h-[69px] max-h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col xl:flex-row xl:flex-nowrap gap-1 xl:gap-2 last:*:xl:flex-1">
							<div className="flex flex-col gap-1">
								<Tooltip
									render={
										<BasicLink
											href={props.metadata.name === 'All' ? '/dexs' : `/dexs/chain/${slug(props.metadata.name)}`}
										/>
									}
									className="text-sm font-semibold"
									content="Total value of all spot trades executed on decentralized exchanges"
								>
									DEXs Volume
								</Tooltip>
								{props.dexs.chart?.length > 0 ? (
									<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
										props.dexs.total24h,
										true
									)} (24h)`}</p>
								) : null}
							</div>
							<Suspense fallback={<></>}>
								<SmolBarChart
									series={props.dexs.chart}
									name="DEXs Volume"
									className={'my-auto h-[53px] md:h-[132px] xl:h-[53px]'}
								/>
							</Suspense>
						</div>
					) : null}
					{props.etfs?.length > 0 ? (
						<div className="col-span-1 min-h-[137px] xl:min-h-[69px] max-h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col xl:flex-row xl:flex-nowrap gap-1 xl:gap-2 last:*:xl:flex-1">
							<div className="flex flex-col gap-1">
								<Tooltip
									render={<BasicLink href="/etfs" />}
									className="text-sm font-semibold"
									content="Daily net inflows/outflows into Bitcoin, Ethereum ETFs, showing institutional investment trends"
								>
									ETF Inflows
								</Tooltip>
								{props.etfs?.length > 0 ? (
									<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
										props.etfs[props.etfs.length - 1][1],
										true
									)} (24h)`}</p>
								) : null}
							</div>
							<Suspense fallback={<></>}>
								<SmolBarChart series={props.etfs} name="ETF" className={'my-auto h-[53px] md:h-[132px] xl:h-[53px]'} />
							</Suspense>
						</div>
					) : null}
					{rwaTvl ? (
						<div className="col-span-1 h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col gap-1">
							<Tooltip
								render={
									<BasicLink
										href={props.metadata.name === 'All' ? '/protocols/rwa' : `/protocols/RWA/${props.metadata.name}`}
									/>
								}
								className="text-sm font-semibold"
								content="Total Value Locked in protocols that involve Real World Assets, such as house tokenization"
							>
								RWA TVL
							</Tooltip>
							{rwaTvl.chart.length > 0 ? (
								<>
									<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
										rwaTvl.chart[rwaTvl.chart.length - 1][1],
										true
									)}`}</p>
									<p className="text-xs flex items-center gap-1">
										<span
											className={`whitespace-nowrap overflow-hidden text-ellipsis ${
												+rwaTvl.change7d >= 0 ? 'text-[var(--pct-green)]' : 'text-[var(--pct-red)]'
											}`}
										>
											{`${+rwaTvl.change7d >= 0 ? '+' : ''}${rwaTvl.change7d}%`}
										</span>
										<span className="text-[#666] dark:text-[#919296]">7d</span>
									</p>
									<Suspense fallback={<></>}>
										<SmolLineChart
											series={rwaTvl.chart}
											name="RWA TVL"
											color={+rwaTvl.change7d >= 0 ? 'green' : 'red'}
										/>
									</Suspense>
								</>
							) : null}
						</div>
					) : null}
				</>
			) : props.dexs?.chart?.length > 0 ? (
				<div className="col-span-1 h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col gap-1">
					<Tooltip
						render={
							<BasicLink href={props.metadata.name === 'All' ? '/dexs' : `/dexs/chain/${slug(props.metadata.name)}`} />
						}
						className="text-sm font-semibold"
						content={`Total value of all spot trades executed on decentralized exchanges${
							props.metadata.name === 'All' ? '' : ` deployed on ${props.metadata.name}`
						}`}
					>
						DEXs Volume
					</Tooltip>
					{props.dexs.chart?.length > 0 ? (
						<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
							props.dexs.total24h,
							true
						)} (24h)`}</p>
					) : null}
					<Suspense fallback={<></>}>
						<SmolBarChart series={props.dexs.chart} name="DEXs Volume" />
					</Suspense>
				</div>
			) : null}
			{props.chainFees?.topProtocolsChart?.length > 0 ? (
				<div className="col-span-1 h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col gap-1">
					<div className="flex items-start gap-4 justify-between">
						<Tooltip
							render={
								<BasicLink
									href={props.metadata.name === 'All' ? '/fees' : `/fees/chain/${slug(props.metadata.name)}`}
								/>
							}
							className="text-sm font-semibold"
							content={`Total fees paid by protocols on ${
								props.metadata.name === 'All' ? 'all chains' : props.metadata.name
							}`}
						>
							Fees Paid
						</Tooltip>
						{props.chainFees.feesGenerated24h != null ? (
							<p className="text-[#666] dark:text-[#919296]">{`${formattedNum(
								props.chainFees.feesGenerated24h ?? 0,
								true
							)} (24h)`}</p>
						) : null}
					</div>
					<Suspense fallback={<></>}>
						<FeesGeneratedChart series={props.chainFees.topProtocolsChart} />
					</Suspense>
				</div>
			) : null}
			{props.stablecoins?.mcapChartData?.length > 0 ? (
				<div className="col-span-1 h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col gap-1">
					<Tooltip
						render={
							<BasicLink
								href={props.metadata.name === 'All' ? '/stablecoins' : `/stablecoins/${props.metadata.name}`}
							/>
						}
						className="text-sm font-semibold"
						content={`Total market cap of all stablecoins issued on ${
							props.metadata.name === 'All' ? 'all chains' : props.metadata.name
						}`}
					>
						Stablecoins Market Cap
					</Tooltip>
					{props.stablecoins.mcap != null ? (
						<>
							<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
								props.stablecoins.mcap,
								true
							)}`}</p>
							<p className="text-xs flex items-center gap-1">
								<span
									className={`whitespace-nowrap overflow-hidden text-ellipsis ${
										+props.stablecoins.change7d >= 0 ? 'text-[var(--pct-green)]' : 'text-[var(--pct-red)]'
									}`}
								>
									{`${+props.stablecoins.change7d >= 0 ? '+' : ''}${props.stablecoins.change7d}%`}
								</span>
								<span className="text-[#666] dark:text-[#919296]">7d</span>
							</p>
						</>
					) : null}
					<Suspense fallback={<></>}>
						<SmolLineChart
							series={props.stablecoins.mcapChartData}
							color={+props.stablecoins.change7d >= 0 ? 'green' : 'red'}
							name="Stablecoin Mcap"
						/>
					</Suspense>
				</div>
			) : null}
		</div>
	)
}
