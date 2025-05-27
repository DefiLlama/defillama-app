import dynamic from 'next/dynamic'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Metrics } from '~/components/Metrics'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { chainIconUrl, formattedNum, formattedPercent, slug } from '~/utils'
import { ITotalBorrowedByChainPageData } from './queries'
import { ColumnDef } from '@tanstack/react-table'

const LineAndBarChart = dynamic(() => import('~/components/ECharts/LineAndBarChart'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<ILineAndBarChartProps>

export function BorrowedByChain(props: ITotalBorrowedByChainPageData) {
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
			<TableWithSearch
				data={props.protocols}
				columns={columns}
				placeholder={'Search protocols...'}
				columnToSearch={'name'}
				header="Protocol Rankings"
			/>
		</>
	)
}

const columns: ColumnDef<ITotalBorrowedByChainPageData['protocols'][0]>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorFn: (protocol) => protocol.name,
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const Chains = () => (
				<span className="flex flex-col gap-1">
					{row.original.chains.map((chain) => (
						<span key={`/chain/${chain}/${row.original.slug}`} className="flex items-center gap-1">
							<TokenLogo logo={chainIconUrl(chain)} size={14} />
							<span>{chain}</span>
						</span>
					))}
				</span>
			)

			return (
				<span className={`flex items-center gap-2 relative ${row.depth > 0 ? 'pl-12' : 'pl-6'}`}>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-[2px]"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							)}
						</button>
					) : null}

					<span className="flex-shrink-0">{index + 1}</span>

					<TokenLogo logo={row.original.logo} data-lgonly />

					<span className="flex flex-col -my-2">
						<BasicLink
							href={`/protocol/${row.original.slug}?borrowed=true`}
							className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
						>
							{value}
						</BasicLink>

						<Tooltip content={<Chains />} className="text-[0.7rem] text-[var(--text-disabled)]">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
				</span>
			)
		},
		size: 280
	},
	{
		id: 'category',
		header: 'Category',
		accessorFn: (protocol) => protocol.category,
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<BasicLink
					href={`/protocols/${slug(getValue() as string)}`}
					className="text-sm font-medium text-[var(--link-text)]"
				>
					{getValue() as string}
				</BasicLink>
			) : (
				''
			),
		size: 128,
		meta: {
			align: 'end'
		}
	},
	{
		id: 'totalBorrowed',
		header: 'Total Borrowed',
		accessorFn: (protocol) => protocol.totalBorrowed,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText:
				'Total fees paid by users when using the protocol in the last 24 hours, updated daily at 00:00 UTC'
		},
		size: 128
	},
	{
		header: 'Change 30d',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	}
]
