import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useMemo } from 'react'
import { IProtocolByCategoryPageData } from './types'
import { ColumnDef } from '@tanstack/react-table'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { Tooltip } from '~/components/Tooltip'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { Icon } from '~/components/Icon'
import { chainIconUrl, download, formattedNum, toNiceCsvDate } from '~/utils'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import dynamic from 'next/dynamic'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

const LineAndBarChart = dynamic(() => import('~/components/ECharts/LineAndBarChart'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<ILineAndBarChartProps>

export function ProtocolsByCategory(props: IProtocolByCategoryPageData) {
	const [tvlSettings] = useLocalStorageSettingsManager('tvl')

	const finalProtocols = useMemo(() => {
		const toggledSettings = Object.entries(tvlSettings)
			.filter(([key, value]) => value === true)
			.map(([key]) => key)

		if (toggledSettings.length === 0) return props.protocols

		return props.protocols.map((protocol) => {
			let tvl = protocol.tvl
			for (const setting of toggledSettings) {
				tvl += protocol.extraTvls[setting] ?? 0
			}
			return { ...protocol, tvl }
		})
	}, [tvlSettings, props])

	const categoryColumns = useMemo(() => {
		return columns(props.category)
	}, [props.category])

	return (
		<>
			<ProtocolsChainsSearch />
			<RowLinksWithDropdown links={props.chains} activeLink={props.chain} />
			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
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
								{formattedNum(props.charts['TVL']?.data[props.charts['TVL']?.data.length - 1][1], true)}
							</span>
						</p>
					)}
					<div className="flex flex-col flex-1 gap-2 mb-auto">
						{props.fees24h != null && (
							<p className="text-base flex items-center gap-4 justify-between flex-wrap">
								<span className="font-normal text-[#545757] dark:text-[#cccccc]">Fees (7d)</span>
								<span className="text-right font-jetbrains">{formattedNum(props.fees24h, true)}</span>
							</p>
						)}
						{props.revenue24h != null && (
							<p className="text-base flex items-center gap-4 justify-between flex-wrap">
								<span className="font-normal text-[#545757] dark:text-[#cccccc]">Revenue (7d)</span>
								<span className="text-right font-jetbrains">{formattedNum(props.revenue24h, true)}</span>
							</p>
						)}
						{props.dexVolume24h != null && ['Dexs', 'DEX Aggregators'].includes(props.category) && (
							<p className="text-base flex items-center gap-4 justify-between flex-wrap">
								<span className="font-normal text-[#545757] dark:text-[#cccccc]">DEX Volume (7d)</span>
								<span className="text-right font-jetbrains">{formattedNum(props.dexVolume24h, true)}</span>
							</p>
						)}
						{props.perpVolume24h != null && ['Derivatives'].includes(props.category) && (
							<p className="text-base flex items-center gap-4 justify-between flex-wrap">
								<span className="font-normal text-[#545757] dark:text-[#cccccc]">Perp Volume (7d)</span>
								<span className="text-right font-jetbrains">{formattedNum(props.perpVolume24h, true)}</span>
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
							className="h-[30px] !bg-transparent border border-[var(--form-control-border)] !text-[#666] dark:!text-[#919296] hover:!bg-[var(--link-hover-bg)] focus-visible:!bg-[var(--link-hover-bg)] mr-auto mt-auto"
						/>
					</div>
				</div>
				<div className="bg-[var(--cards-bg)] min-h-[360px] rounded-md col-span-2">
					<LineAndBarChart charts={props.charts} valueSymbol="$" />
				</div>
			</div>
			<TableWithSearch
				data={finalProtocols}
				columns={categoryColumns}
				placeholder="Search protocols..."
				columnToSearch="name"
				header="Protocol Rankings"
			/>
		</>
	)
}

const columns = (
	category: IProtocolByCategoryPageData['category']
): ColumnDef<IProtocolByCategoryPageData['protocols'][0]>[] => [
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

					<span className="flex-shrink-0" onClick={row.getToggleExpandedHandler()}>
						{index + 1}
					</span>

					<TokenLogo logo={row.original.logo} data-lgonly />

					<span className="flex flex-col -my-2">
						<BasicLink
							href={`/protocol/`}
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
