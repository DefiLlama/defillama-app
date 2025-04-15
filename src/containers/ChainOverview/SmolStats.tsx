import dynamic from 'next/dynamic'
import { IChainOverviewData } from './types'
import { Suspense } from 'react'
import { formattedNum } from '~/utils'

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

export const SmolStats = (props: IChainOverviewData) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1 isolate">
			{props.chain === 'All' && props.globalmcap?.chart?.length > 0 ? (
				<>
					{props.globalmcap?.chart?.length > 0 ? (
						<div className="col-span-1 min-h-[137px] xl:min-h-[69px] max-h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col xl:flex-row xl:flex-nowrap gap-1 xl:gap-2 last:*:xl:flex-1">
							<div className="flex flex-col gap-1">
								<h3 className="text-sm font-semibold">Crypto Mcap</h3>
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
					) : null}

					<div className="col-span-1 min-h-[137px] xl:min-h-[69px] max-h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col xl:flex-row xl:flex-nowrap gap-1 xl:gap-2 last:*:xl:flex-1">
						<div className="flex flex-col gap-1">
							<h3 className="text-sm font-semibold">DeFi Mcap</h3>
							{props.defimcap?.chart?.length > 0 ? (
								<>
									<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
										props.defimcap.chart[props.defimcap.chart.length - 1][1],
										true
									)}`}</p>
									<p className="text-xs flex items-center gap-1">
										<span
											className={`whitespace-nowrap overflow-hidden text-ellipsis ${
												+props.defimcap.change7d >= 0 ? 'text-[var(--pct-green)]' : 'text-[var(--pct-red)]'
											}`}
										>
											{`${+props.defimcap.change7d >= 0 ? '+' : ''}${props.defimcap.change7d}%`}
										</span>
										<span className="text-[#666] dark:text-[#919296]">7d</span>
									</p>
								</>
							) : null}
						</div>
						{props.defimcap?.chart?.length > 0 ? (
							<Suspense fallback={<></>}>
								<SmolLineChart
									series={props.defimcap.chart}
									color={+props.defimcap.change7d >= 0 ? 'green' : 'red'}
									name="Global Mcap"
									className={'my-auto h-[53px]'}
								/>
							</Suspense>
						) : null}
					</div>

					{props.dexs?.chart?.length > 0 ? (
						<div className="col-span-1 min-h-[137px] xl:min-h-[69px] max-h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col xl:flex-row xl:flex-nowrap gap-1 xl:gap-2 last:*:xl:flex-1">
							<div className="flex flex-col gap-1">
								<h3 className="text-sm font-semibold">DEXs Volume</h3>
								{props.dexs.chart?.length > 0 ? (
									<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
										props.dexs.chart[props.dexs.chart.length - 1][1],
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
						<div className="col-span-1 h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col gap-1">
							<h3 className="text-sm font-semibold">ETF Inflows</h3>
							{props.etfs.length > 0 ? (
								<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
									props.etfs[props.etfs.length - 1][1],
									true
								)} (24h)`}</p>
							) : null}
							<Suspense fallback={<></>}>
								<SmolBarChart series={props.etfs} name="ETF" />
							</Suspense>
						</div>
					) : null}
				</>
			) : props.dexs?.chart?.length > 0 ? (
				<div className="col-span-1 h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col gap-1">
					<h3 className="text-sm font-semibold">DEXs Volume</h3>
					{props.dexs.chart?.length > 0 ? (
						<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
							props.dexs.chart[props.dexs.chart.length - 1][1],
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
					<h3 className="text-sm font-semibold">Fees Generated</h3>
					{props.chainFees.feesGenerated24h != null ? (
						<p className="text-[#666] dark:text-[#919296]">{`${formattedNum(
							props.chainFees.feesGenerated24h ?? 0,
							true
						)} (24h)`}</p>
					) : null}
					<Suspense fallback={<></>}>
						<FeesGeneratedChart series={props.chainFees.topProtocolsChart} />
					</Suspense>
				</div>
			) : null}
			{props.stablecoins?.mcapChartData?.length > 0 ? (
				<div className="col-span-1 h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col gap-1">
					<h3 className="text-sm font-semibold">Stablecoins Market Cap</h3>
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
