import { BasicLink } from '~/components/Link'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum, slug } from '~/utils'
import { FeesGeneratedChart } from './FeesGeneratedChart'
import { SmolBarChart } from './SmolBarChart'
import { SmolLineChart } from './SmolLineChart'
import type { IChainOverviewData } from './types'
import { UpcomingUnlocksChart } from './UpcomingUnlocksChart'

export const SmolStats = (props: IChainOverviewData) => {
	return (
		<div className="isolate grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
			{props.chain === 'All' ? (
				<>
					{props.unlocks?.chart?.length > 0 ? (
						<div className="col-span-1 flex max-h-[196px] min-h-[119px] flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:min-h-[71px] xl:flex-row xl:flex-nowrap xl:gap-2 xl:*:last:flex-1">
							<div className="flex flex-col gap-1">
								<Tooltip
									render={<BasicLink href="/unlocks" />}
									className="text-sm font-semibold"
									content="Value of tokens unlocking over the next 14 days"
								>
									Upcoming Unlocks
								</Tooltip>
								{props.unlocks.chart?.length > 0 ? (
									<p className="overflow-hidden text-ellipsis whitespace-nowrap text-(--text-form)">{`${formattedNum(
										props.unlocks.total14d,
										true
									)} over 14 days`}</p>
								) : null}
							</div>
							<UpcomingUnlocksChart
								data={props.unlocks.chart}
								className={'my-auto h-[53px] md:h-[132px] xl:h-[53px]'}
							/>
						</div>
					) : null}
					{props.dexs?.chart?.length > 0 ? (
						<div className="col-span-1 flex max-h-[196px] min-h-[119px] flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:min-h-[71px] xl:flex-row xl:flex-nowrap xl:gap-2 xl:*:last:flex-1">
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
									<p className="overflow-hidden text-ellipsis whitespace-nowrap text-(--text-form)">{`${formattedNum(
										props.dexs.total24h,
										true
									)} (24h)`}</p>
								) : null}
							</div>
							<SmolBarChart
								series={props.dexs.chart}
								className={'my-auto h-[53px] md:h-[132px] xl:h-[53px]'}
							/>
						</div>
					) : null}
					{props.etfs?.length > 0 ? (
						<div className="col-span-1 flex max-h-[196px] min-h-[119px] flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:min-h-[71px] xl:flex-row xl:flex-nowrap xl:gap-2 xl:*:last:flex-1">
							<div className="flex flex-col gap-1">
								<Tooltip
									render={<BasicLink href="/etfs" />}
									className="text-sm font-semibold"
									content="Daily net inflows/outflows into Bitcoin, Ethereum ETFs, showing institutional investment trends"
								>
									ETF Inflows
								</Tooltip>
								{props.etfs?.length > 0 ? (
									<p className="overflow-hidden text-ellipsis whitespace-nowrap text-(--text-form)">{`${formattedNum(
										props.etfs[props.etfs.length - 1][1],
										true
									)} (24h)`}</p>
								) : null}
							</div>
							<SmolBarChart series={props.etfs} className={'my-auto h-[53px] md:h-[132px] xl:h-[53px]'} />
						</div>
					) : null}
					{props.datInflows?.chart?.length > 0 ? (
						<div className="col-span-1 flex max-h-[196px] min-h-[119px] flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
							<div className="flex flex-col gap-1 xl:flex-row xl:items-start xl:justify-between">
								<Tooltip
									render={<BasicLink href="/digital-asset-treasuries" />}
									className="text-sm font-semibold"
									content="Daily net inflows/outflows into Digital Asset Treasury Companies"
								>
									DAT Inflows
								</Tooltip>
								{props.datInflows.chart?.length > 0 ? (
									<p className="overflow-hidden text-ellipsis whitespace-nowrap text-(--text-form)">{`${formattedNum(
										props.datInflows.total30d,
										true
									)} (30d)`}</p>
								) : null}
							</div>
							<SmolBarChart
								series={props.datInflows.chart}
								className={'my-auto h-[53px] md:h-[132px] xl:h-[156px]'}
								groupBy="weekly"
							/>
						</div>
					) : null}
				</>
			) : props.dexs?.chart?.length > 0 ? (
				<div className="col-span-1 flex h-[196px] flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
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
						<p className="overflow-hidden text-ellipsis whitespace-nowrap text-(--text-form)">{`${formattedNum(
							props.dexs.total24h,
							true
						)} (24h)`}</p>
					) : null}
					<SmolBarChart series={props.dexs.chart} />
				</div>
			) : null}
			{props.chainFees?.topProtocolsChart?.length > 0 ? (
				<div className="col-span-1 flex h-[196px] flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<div className="flex items-start justify-between gap-4">
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
							<p className="text-(--text-form)">{`${formattedNum(props.chainFees.feesGenerated24h ?? 0, true)} (24h)`}</p>
						) : null}
					</div>
					<FeesGeneratedChart series={props.chainFees.topProtocolsChart} />
				</div>
			) : null}
			{props.stablecoins?.mcapChartData?.length > 0 ? (
				<div className="col-span-1 flex h-[196px] flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<Tooltip
						placement="top-start"
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
							<p className="overflow-hidden text-ellipsis whitespace-nowrap text-(--text-form)">{`${formattedNum(
								props.stablecoins.mcap,
								true
							)}`}</p>
							<p className="flex items-center gap-1 text-xs">
								<span
									className={`overflow-hidden text-ellipsis whitespace-nowrap ${
										+props.stablecoins.change7d >= 0 ? 'text-(--success)' : 'text-(--error)'
									}`}
								>
									{`${+props.stablecoins.change7d >= 0 ? '+' : ''}${props.stablecoins.change7d}%`}
								</span>
								<span className="text-(--text-form)">7d</span>
							</p>
						</>
					) : null}
					<SmolLineChart
						series={props.stablecoins.mcapChartData}
						color={+props.stablecoins.change7d >= 0 ? 'green' : 'red'}
					/>
				</div>
			) : null}
		</div>
	)
}
