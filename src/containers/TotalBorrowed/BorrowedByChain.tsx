import { ColumnDef } from '@tanstack/react-table'
import { lazy, Suspense } from 'react'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { chainIconUrl, formattedNum, renderPercentChange, slug } from '~/utils'
import { ITotalBorrowedByChainPageData } from './queries'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

const DEFAULT_SORTING_STATE = [{ id: 'totalBorrowed', desc: true }]

export function BorrowedProtocolsTVLByChain(props: ITotalBorrowedByChainPageData) {
	return (
		<>
			<RowLinksWithDropdown links={props.chains} activeLink={props.chain} />
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-3 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 text-base xl:col-span-1">
					{props.chain !== 'All' && (
						<h1 className="flex flex-nowrap items-center gap-2">
							<TokenLogo logo={chainIconUrl(props.chain)} size={24} />
							<span className="text-xl font-semibold">{props.chain}</span>
						</h1>
					)}
					<div className="flex flex-wrap items-end justify-between gap-4">
						<p className="flex flex-col">
							<span className="flex flex-col">
								<span>Total Borrowed</span>
								<span className="min-h-8 overflow-hidden font-jetbrains text-2xl font-semibold text-ellipsis whitespace-nowrap">
									{formattedNum(props.totalBorrowed, true)}
								</span>
							</span>
						</p>
						{props.change24h != null ? (
							<p className="relative bottom-0.5 flex flex-nowrap items-center gap-2 text-sm">
								<span
									className={`text-right font-jetbrains text-ellipsis ${
										props.change24h >= 0 ? 'text-(--success)' : 'text-(--error)'
									}`}
								>
									{`${props.change24h >= 0 ? '+' : ''}${props.change24h}%`}
								</span>
								<span className="text-(--text-label)">24h</span>
							</p>
						) : null}
					</div>
				</div>
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<Suspense fallback={<div className="min-h-[398px]" />}>
						<MultiSeriesChart2 exportButtons="auto" dataset={props.dataset} charts={props.charts} />
					</Suspense>
				</div>
			</div>
			<TableWithSearch
				data={props.protocols}
				columns={columns}
				placeholder={'Search protocols...'}
				columnToSearch={'name'}
				header="Protocol Rankings"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}

const ProtocolChainsComponent = ({ chains }: { chains: string[] }) => (
	<span className="flex flex-col gap-1">
		{chains.map((chain) => (
			<span key={`chain${chain}-of-protocol`} className="flex items-center gap-1">
				<TokenLogo logo={chainIconUrl(chain)} size={14} />
				<span>{chain}</span>
			</span>
		))}
	</span>
)

const columns: ColumnDef<ITotalBorrowedByChainPageData['protocols'][0]>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorFn: (protocol) => protocol.name,
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue() as string

			return (
				<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-12' : 'pl-6'}`}>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-0.5"
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

					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo logo={row.original.logo} data-lgonly />

					<span className="-my-2 flex flex-col">
						<BasicLink
							href={`/protocol/${row.original.slug}?borrowed_tvl=true`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{value}
						</BasicLink>

						<Tooltip
							content={<ProtocolChainsComponent chains={row.original.chains} />}
							className="text-[0.7rem] text-(--text-disabled)"
						>
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
				<BasicLink href={`/protocols/${slug(getValue() as string)}`} className="text-sm font-medium text-(--link-text)">
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
		meta: {
			align: 'end',
			headerHelperText: 'Sum of value currently borrowed across all active loans on a Lending protocol'
		},
		size: 128
	},
	{
		header: 'Change 30d',
		accessorKey: 'change_1m',
		cell: (info) => <>{renderPercentChange(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	}
]
