import { ColumnDef } from '@tanstack/react-table'
import { lazy, Suspense, useMemo } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { tvlOptions } from '~/components/Filters/options'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { chainIconUrl, download, formattedNum, toNiceCsvDate } from '~/utils'
import { IProtocolByCategoryOrTagPageData } from './types'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart')) as React.FC<ILineAndBarChartProps>

const toggleOptions = tvlOptions.filter((key) => !['doublecounted', 'liquidstaking'].includes(key.key))

const sortByRevenue = ['Trading App']

export function ProtocolsByCategoryOrTag(props: IProtocolByCategoryOrTagPageData) {
	const [tvlSettings] = useLocalStorageSettingsManager('tvl')

	const { finalProtocols, charts } = useMemo(() => {
		const toggledSettings = Object.entries(tvlSettings)
			.filter(([key, value]) => value === true)
			.map(([key]) => key)

		if (toggledSettings.length === 0) return { finalProtocols: props.protocols, charts: props.charts }

		const finalProtocols = props.protocols.map((protocol) => {
			let tvl = protocol.tvl
			for (const setting of toggledSettings) {
				tvl += protocol.extraTvls[setting] ?? 0
			}
			return { ...protocol, tvl }
		})

		const finalChartData = props.charts['TVL'].data.map(([date, tvl]) => {
			let total = tvl
			for (const setting of toggledSettings) {
				total += props.extraTvlCharts[setting]?.[date] ?? 0
			}
			return [date, total] as [number, number]
		})

		return {
			finalProtocols,
			charts: {
				...props.charts,
				TVL: { ...props.charts['TVL'], data: finalChartData }
			} as ILineAndBarChartProps['charts']
		}
	}, [tvlSettings, props])

	const categoryColumns = useMemo(() => {
		return columns(props.category)
	}, [props.category])

	return (
		<>
			<ProtocolsChainsSearch options={toggleOptions} />
			<RowLinksWithDropdown links={props.chains} activeLink={props.chain} />
			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-2">
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					{props.chain !== 'All' && props.chain && (
						<h1 className="flex items-center gap-2">
							<TokenLogo logo={chainIconUrl(props.chain)} size={24} />
							<span className="text-xl font-semibold">{props.chain}</span>
						</h1>
					)}
					{props.charts['TVL']?.data.length > 0 && (
						<p className="flex flex-col">
							<span className="text-[#545757] dark:text-[#cccccc] text-sm">Total Value Locked</span>
							<span className="font-semibold text-2xl font-jetbrains min-h-8">
								{formattedNum(charts['TVL']?.data[charts['TVL']?.data.length - 1][1], true)}
							</span>
						</p>
					)}
					<div className="flex flex-col flex-1 gap-2 mb-auto">
						{props.fees7d != null && (
							<p className="text-base flex items-center gap-4 justify-between flex-wrap">
								<span className="font-normal text-[#545757] dark:text-[#cccccc]">Fees (7d)</span>
								<span className="text-right font-jetbrains">{formattedNum(props.fees7d, true)}</span>
							</p>
						)}
						{props.revenue7d != null && (
							<p className="text-base flex items-center gap-4 justify-between flex-wrap">
								<span className="font-normal text-[#545757] dark:text-[#cccccc]">Revenue (7d)</span>
								<span className="text-right font-jetbrains">{formattedNum(props.revenue7d, true)}</span>
							</p>
						)}
						{props.dexVolume7d != null && ['Dexs', 'DEX Aggregators'].includes(props.category) && (
							<p className="text-base flex items-center gap-4 justify-between flex-wrap">
								<span className="font-normal text-[#545757] dark:text-[#cccccc]">DEX Volume (7d)</span>
								<span className="text-right font-jetbrains">{formattedNum(props.dexVolume7d, true)}</span>
							</p>
						)}
						{props.perpVolume7d != null && ['Derivatives'].includes(props.category) && (
							<p className="text-base flex items-center gap-4 justify-between flex-wrap">
								<span className="font-normal text-[#545757] dark:text-[#cccccc]">Perp Volume (7d)</span>
								<span className="text-right font-jetbrains">{formattedNum(props.perpVolume7d, true)}</span>
							</p>
						)}
						<CSVDownloadButton
							onClick={() => {
								const rows: any = [['Timestamp', 'Date', props.category]]
								for (const item of props.charts['TVL']?.data ?? []) {
									rows.push([item[0], toNiceCsvDate(item[0] / 1000), item[1]])
								}
								download(`${props.category}-TVL.csv`, rows.map((r) => r.join(',')).join('\n'))
							}}
							className="h-[30px] bg-transparent! border border-(--form-control-border) text-[#666]! dark:text-[#919296]! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)! mr-auto mt-auto"
						/>
					</div>
				</div>
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md col-span-2  min-h-[360px] py-2">
					<Suspense fallback={<div className="flex items-center justify-center m-auto min-h-[360px]" />}>
						<LineAndBarChart charts={charts} valueSymbol="$" />
					</Suspense>
				</div>
			</div>
			<TableWithSearch
				data={finalProtocols}
				columns={categoryColumns}
				placeholder="Search protocols..."
				columnToSearch="name"
				header="Protocol Rankings"
				defaultSorting={sortByRevenue.includes(props.category) ? [{ id: 'revenue_7d', desc: true }] : []}
				customFilters={
					<CSVDownloadButton
						onClick={() => {
							const headers = categoryColumns.map((col) => col.header as string)
							const rows = finalProtocols.map((protocol) => {
								return categoryColumns.map((col: any) => {
									const value =
										'accessorFn' in col && col.accessorFn
											? col?.accessorFn?.(protocol)
											: protocol[col.id as keyof typeof protocol]
									if (value === null || value === undefined) return ''
									if (col.id === 'name') return `"${protocol.name}"`
									if (typeof value === 'number') return value
									return String(value).includes(',') ? `"${String(value)}"` : String(value)
								})
							})
							const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
							download(`defillama-${props.category}-${props.chain || 'all'}-protocols.csv`, csvContent)
						}}
						className="h-[30px] bg-transparent! border border-(--form-control-border) text-[#666]! dark:text-[#919296]! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)!"
					/>
				}
			/>
		</>
	)
}

const columns = (
	category: IProtocolByCategoryOrTagPageData['category']
): ColumnDef<IProtocolByCategoryOrTagPageData['protocols'][0]>[] => [
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
				<span className={`flex items-center gap-2 relative ${row.depth > 0 ? 'pl-8' : 'pl-4'}`}>
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

					<span className="shrink-0" onClick={row.getToggleExpandedHandler()}>
						{index + 1}
					</span>

					<TokenLogo logo={row.original.logo} data-lgonly />

					<span className="flex flex-col -my-2">
						<BasicLink
							href={`/protocol/${row.original.slug}`}
							className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
		id: 'tvl',
		header: 'TVL',
		accessorFn: (protocol) => protocol.tvl,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		id: 'fees_7d',
		header: 'Fees 7d',
		accessorFn: (protocol) => protocol.fees?.total7d,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		id: 'revenue_7d',
		header: 'Revenue 7d',
		accessorFn: (protocol) => protocol.revenue?.total7d,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 128
	},
	...(['Dexs', 'DEX Aggregators'].includes(category)
		? [
				{
					id: 'dex_volume_7d',
					header: 'DEX Volume 7d',
					accessorFn: (protocol) => protocol.dexVolume?.total7d,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end'
					},
					size: 140
				}
		  ]
		: ([] as any)),
	...(['Derivatives'].includes(category)
		? [
				{
					id: 'perp_volume_7d',
					header: 'Perp Volume 7d',
					accessorFn: (protocol) => protocol.perpVolume?.total7d,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end'
					},
					size: 160
				}
		  ]
		: ([] as any)),
	{
		id: 'mcap/tvl',
		header: 'Mcap/TVL',
		accessorFn: (protocol) => (protocol.mcap && protocol.tvl ? (protocol.mcap / protocol.tvl).toFixed(2) : null),
		cell: (info) => <>{info.getValue() != null ? (info.getValue() as number) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		id: 'fees_30d',
		header: 'Fees 30d',
		accessorFn: (protocol) => protocol.fees?.total30d,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		id: 'revenue_30d',
		header: 'Revenue 30d',
		accessorFn: (protocol) => protocol.revenue?.total30d,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 128
	},
	...(['Dexs', 'DEX Aggregators'].includes(category)
		? [
				{
					id: 'dex_volume_30d',
					header: 'DEX Volume 30d',
					accessorFn: (protocol) => protocol.dexVolume?.total30d,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end'
					},
					size: 148
				}
		  ]
		: ([] as any)),
	...(['Derivatives'].includes(category)
		? [
				{
					id: 'perp_volume_30d',
					header: 'Perp Volume 30d',
					accessorFn: (protocol) => protocol.perpVolume?.total30d,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end'
					},
					size: 160
				}
		  ]
		: ([] as any)),
	{
		id: 'fees_24h',
		header: 'Fees 24h',
		accessorFn: (protocol) => protocol.fees?.total24h,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		id: 'revenue_24h',
		header: 'Revenue 24h',
		accessorFn: (protocol) => protocol.revenue?.total24h,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 128
	},
	...(['Dexs', 'DEX Aggregators'].includes(category)
		? [
				{
					id: 'dex_volume_24h',
					header: 'DEX Volume 24h',
					accessorFn: (protocol) => protocol.dexVolume?.total24h,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end'
					},
					size: 148
				}
		  ]
		: ([] as any)),
	...(['Derivatives'].includes(category)
		? [
				{
					id: 'perp_volume_24h',
					header: 'Perp Volume 24h',
					accessorFn: (protocol) => protocol.perpVolume?.total24h,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end'
					},
					size: 160
				}
		  ]
		: ([] as any)),
	...(['Lending'].includes(category)
		? [
				{
					id: 'borrowed',
					header: 'Borrowed',
					accessorFn: (protocol) => protocol.borrowed,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end'
					},
					size: 100
				},
				{
					id: 'supplied',
					header: 'Supplied',
					accessorFn: (protocol) => protocol.supplied,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end'
					},
					size: 100
				},
				{
					id: 'supplied/tvl',
					header: 'Supplied/TVL',
					accessorFn: (protocol) => protocol.suppliedTvl,
					cell: (info) => <>{info.getValue() ?? null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end'
					},
					size: 140
				}
		  ]
		: ([] as any))
]
