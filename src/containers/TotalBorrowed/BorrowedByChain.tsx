import dynamic from 'next/dynamic'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { Metrics } from '~/components/Metrics'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum } from '~/utils'

const LineAndBarChart = dynamic(() => import('~/components/ECharts/LineAndBarChart'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<ILineAndBarChartProps>

export function BorrowedByChain(props) {
	return (
		<>
			<ProtocolsChainsSearch hideFilters />
			<Metrics currentMetric="Total Borrowed" />
			<RowLinksWithDropdown links={props.chains} activeLink={props.chain} />
			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-3 w-full xl:col-span-1 overflow-x-auto text-base">
					{props.chain !== 'All' && (
						<h1 className="flex items-center flex-nowrap gap-2">
							<TokenLogo logo={chainIconUrl(props.chain)} size={24} />
							<span className="text-xl font-semibold">{props.chain}</span>
						</h1>
					)}
					<div className="flex items-end justify-between gap-4 flex-wrap">
						<p className="flex flex-col">
							<span className="flex flex-col">
								<span>Total Borrowed</span>
								<span className="font-semibold text-2xl font-jetbrains min-h-8 overflow-hidden whitespace-nowrap text-ellipsis">
									{formattedNum(props.totalBorrowed, true)}
								</span>
							</span>
						</p>
						{props.change24h != null ? (
							<p className="flex items-center flex-nowrap gap-2 relative bottom-[2px] text-sm">
								<span
									className={`text-right font-jetbrains text-ellipsis ${
										props.change24h >= 0 ? 'text-[var(--pct-green)]' : 'text-[var(--pct-red)]'
									}`}
								>
									{`${props.change24h >= 0 ? '+' : ''}${props.change24h}%`}
								</span>
								<span className="text-[#545757] dark:text-[#cccccc]">24h</span>
							</p>
						) : null}
					</div>
				</div>
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2 pt-3">
					<LineAndBarChart charts={props.charts} />
				</div>
			</div>
		</>
	)
}
