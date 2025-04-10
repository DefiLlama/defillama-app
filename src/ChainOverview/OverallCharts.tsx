import dynamic from 'next/dynamic'
import { IChainOverviewData } from './types'
import { Suspense } from 'react'
import { formattedNum } from '~/utils'

const FeesGeneratedChart: any = dynamic(() => import('~/ChainOverview/Chart').then((m) => m.FeesGeneratedChart), {
	ssr: false
})

const StablecoinMcapChart: any = dynamic(() => import('~/ChainOverview/Chart').then((m) => m.StablecoinMcapChart), {
	ssr: false
})

const SmolBarChart: any = dynamic(() => import('~/ChainOverview/Chart').then((m) => m.SmolBarChart), {
	ssr: false
})

export const OverallCharts = (props: IChainOverviewData) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1 isolate">
			{props.chain === 'All' ? (
				<>
					<div className="col-span-1 min-h-[69px] max-h-[196px] bg-[var(--cards-bg)] rounded-md p-2">
						<h3 className="text-sm font-semibold">Crypto Mcap</h3>
					</div>
					<div className="col-span-1 min-h-[69px] max-h-[196px] bg-[var(--cards-bg)] rounded-md p-2">
						<h3 className="text-sm font-semibold">DeFi Mcap</h3>
					</div>
					{props.dexs.chart.length > 0 ? (
						<div className="col-span-1 min-h-[69px] max-h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col xl:flex-row xl:flex-nowrap gap-1">
							<div className="flex flex-col gap-1">
								<h3 className="text-sm font-semibold">DEX Volumes</h3>
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
									name="DEX Volume"
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
			) : props.dexs.chart.length > 0 ? (
				<div className="col-span-1 h-[196px] bg-[var(--cards-bg)] rounded-md p-2 flex flex-col gap-1">
					<h3 className="text-sm font-semibold">DEX Volumes</h3>
					{props.dexs.chart?.length > 0 ? (
						<p className="text-[#666] dark:text-[#919296] whitespace-nowrap overflow-hidden text-ellipsis">{`${formattedNum(
							props.dexs.chart[props.dexs.chart.length - 1][1],
							true
						)} (24h)`}</p>
					) : null}
					<Suspense fallback={<></>}>
						<SmolBarChart series={props.dexs.chart} name="DEX Volume" />
					</Suspense>
				</div>
			) : null}
			{props.chainFees.topProtocolsChart?.length > 0 ? (
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
			{props.stablecoins.mcapChartData?.length > 0 ? (
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
						<StablecoinMcapChart
							series={props.stablecoins.mcapChartData}
							color={+props.stablecoins.change7d >= 0 ? 'green' : 'red'}
						/>
					</Suspense>
				</div>
			) : null}
		</div>
	)
}
