import { lazy, Suspense } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { chainIconUrl, formattedNum, formattedPercent, slug } from '~/utils'
import { IPool2ProtocolsTVLByChainPageData } from './queries'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart')) as React.FC<ILineAndBarChartProps>

export function Pool2ProtocolsTVLByChain(props: IPool2ProtocolsTVLByChainPageData) {
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
								<span>Pool2 TVL</span>
								<span className="font-jetbrains min-h-8 overflow-hidden text-2xl font-semibold text-ellipsis whitespace-nowrap">
									{formattedNum(props.pool2Tvl, true)}
								</span>
							</span>
						</p>
						{props.change24h != null ? (
							<p className="relative bottom-0.5 flex flex-nowrap items-center gap-2 text-sm">
								<span
									className={`font-jetbrains text-right text-ellipsis ${
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
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-3">
					<Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
						<LineAndBarChart charts={props.charts} />
					</Suspense>
				</div>
			</div>
			<TableWithSearch
				data={props.protocols}
				columns={columns}
				placeholder={'Search protocols...'}
				columnToSearch={'name'}
				header="Protocol Rankings"
				sortingState={[{ id: 'pool2Tvl', desc: true }]}
			/>
		</>
	)
}

const columns: ColumnDef<IPool2ProtocolsTVLByChainPageData['protocols'][0]>[] = [
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

					<span className="shrink-0">{index + 1}</span>

					<TokenLogo logo={row.original.logo} data-lgonly />

					<span className="-my-2 flex flex-col">
						<BasicLink
							href={`/protocol/${row.original.slug}?pool2=true`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{value}
						</BasicLink>

						<Tooltip content={<Chains />} className="text-[0.7rem] text-(--text-disabled)">
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
		id: 'pool2Tvl',
		header: 'Pool2 TVL',
		accessorFn: (protocol) => protocol.pool2Tvl,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Total value locked in pool2'
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
