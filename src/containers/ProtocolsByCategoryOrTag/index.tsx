import { lazy, Suspense, useCallback, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { chainIconUrl, formattedNum, slug, toNiceCsvDate } from '~/utils'
import { IProtocolByCategoryOrTagPageData } from './types'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart')) as React.FC<ILineAndBarChartProps>

const defaultSortingState = {
	'Trading App': [{ id: 'revenue_7d', desc: true }],
	Derivatives: [{ id: 'perp_volume_24h', desc: true }],
	Interface: [{ id: 'perp_volume_24h', desc: true }]
}

export function ProtocolsByCategoryOrTag(props: IProtocolByCategoryOrTagPageData) {
	const name = props.category ?? props.tag ?? ''

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')

	const { finalProtocols, charts } = useMemo(() => {
		const toggledSettings = Object.entries(tvlSettings)
			.filter(([key, value]) => value === true)
			.map(([key]) => key)

		if (toggledSettings.length === 0) return { finalProtocols: props.protocols, charts: props.charts }

		const finalProtocols = props.protocols.map((protocol) => {
			let tvl = protocol.tvl
			for (const setting of toggledSettings) {
				if (protocol.extraTvls[setting] == null) continue
				tvl = (tvl ?? 0) + (protocol.extraTvls[setting] ?? 0)
			}
			return { ...protocol, tvl }
		})

		const finalChartData = props.charts['TVL'].data.map(([date, tvl]) => {
			let total = tvl
			for (const setting of toggledSettings) {
				total = (total ?? 0) + (props.extraTvlCharts[setting]?.[date] ?? 0)
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
		return columns(name, props.isRWA)
	}, [name, props.isRWA])

	const prepareCsv = useCallback(() => {
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

		return {
			filename: `defillama-${name}-${props.chain || 'all'}-protocols.csv`,
			rows: [headers, ...rows] as (string | number | boolean)[][]
		}
	}, [finalProtocols, categoryColumns, name, props.chain])

	const prepareCsvFromChart = useCallback(() => {
		const rows: any = [['Timestamp', 'Date', name]]
		for (const item of props.charts['TVL']?.data ?? []) {
			rows.push([item[0], toNiceCsvDate(item[0] / 1000), item[1]])
		}
		return {
			filename: `${name}-TVL.csv`,
			rows: rows as (string | number | boolean)[][]
		}
	}, [props.charts, name])

	return (
		<>
			{props.chains.length > 1 ? <RowLinksWithDropdown links={props.chains} activeLink={props.chain} /> : null}
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					{props.chain === 'All' ? (
						<h1 className="text-lg font-semibold">{`${name} Protocols`}</h1>
					) : (
						<h1 className="text-lg font-semibold">{`${name} Protocols on ${props.chain}`}</h1>
					)}
					<div className="mb-auto flex flex-1 flex-col gap-2">
						{props.charts['TVL']?.data.length > 0 && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								{props.isRWA ? (
									<Tooltip
										content="Sum of value of all real world assets on chain"
										className="font-normal text-(--text-label) underline decoration-dotted"
									>
										Total RWA Value
									</Tooltip>
								) : (
									<Tooltip
										content="Sum of value of all coins held in smart contracts of all the protocols on the chain"
										className="font-normal text-(--text-label) underline decoration-dotted"
									>
										Total Value Locked
									</Tooltip>
								)}

								<span className="font-jetbrains text-right">
									{formattedNum(charts['TVL']?.data[charts['TVL']?.data.length - 1][1], true)}
								</span>
							</p>
						)}
						{props.fees7d != null && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={`Total fees paid by users when using the ${(name ?? props.tag ?? '').toLowerCase()} protocols on the chain in the last 7 days`}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Fees (7d)
								</Tooltip>
								<span className="font-jetbrains text-right">{formattedNum(props.fees7d, true)}</span>
							</p>
						)}
						{props.revenue7d != null && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={`Total revenue earned by the ${(name ?? props.tag ?? '').toLowerCase()} protocols on the chain in the last 7 days`}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Revenue (7d)
								</Tooltip>
								<span className="font-jetbrains text-right">{formattedNum(props.revenue7d, true)}</span>
							</p>
						)}
						{props.dexVolume7d != null && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={`Total volume of all spot token swaps on protocols on the chain in the last 7 days`}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									DEX Volume (7d)
								</Tooltip>
								<span className="font-jetbrains text-right">{formattedNum(props.dexVolume7d, true)}</span>
							</p>
						)}
						{props.perpVolume7d != null && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={`Notional volume of all perpetual futures trades including leverage on protocols on the chain in the last 7 days`}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Perp Volume (7d)
								</Tooltip>
								<span className="font-jetbrains text-right">{formattedNum(props.perpVolume7d, true)}</span>
							</p>
						)}
						{props.openInterest != null && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={`Total notional value of all outstanding perpetual futures positions, updated daily at 00:00 UTC`}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Open Interest
								</Tooltip>
								<span className="font-jetbrains text-right">{formattedNum(props.openInterest, true)}</span>
							</p>
						)}
						<CSVDownloadButton prepareCsv={prepareCsvFromChart} smol className="mt-auto mr-auto" />
					</div>
				</div>
				<div className="col-span-2 min-h-[370px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
						<LineAndBarChart charts={charts} valueSymbol="$" />
					</Suspense>
				</div>
			</div>
			<TableWithSearch
				data={finalProtocols}
				columns={categoryColumns}
				placeholder="Search protocols..."
				columnToSearch="name"
				header={props.isRWA ? 'Assets Rankings' : 'Protocol Rankings'}
				sortingState={defaultSortingState[name] ?? [{ id: 'tvl', desc: true }]}
				customFilters={<CSVDownloadButton prepareCsv={prepareCsv} />}
			/>
		</>
	)
}

const Name: ColumnDef<IProtocolByCategoryOrTagPageData['protocols'][0]> = {
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
			<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-8' : 'pl-4'}`}>
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

				<span className="shrink-0" onClick={row.getToggleExpandedHandler()}>
					{index + 1}
				</span>

				<TokenLogo logo={row.original.logo} data-lgonly />

				<span className="-my-2 flex flex-col">
					<BasicLink
						href={`/protocol/${row.original.slug}`}
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
}

const columns = (
	category: IProtocolByCategoryOrTagPageData['category'],
	isRWA: IProtocolByCategoryOrTagPageData['isRWA']
): ColumnDef<IProtocolByCategoryOrTagPageData['protocols'][0]>[] => [
	Name,
	...(['RWA'].includes(category)
		? [
				{
					id: 'asset_class',
					header: 'Asset Class',
					accessorFn: (protocol) => protocol.tvl,
					enableSorting: false,
					cell: (info) => {
						if (info.row.original.tags.length === 0) return null
						return (
							<span className="flex flex-nowrap justify-end gap-1">
								<BasicLink
									href={`/protocols/${slug(info.row.original.tags[0])}`}
									className="text-sm font-medium whitespace-nowrap text-(--link-text) hover:underline"
								>
									{info.row.original.tags[0]}
								</BasicLink>
								{info.row.original.tags.length > 1 && (
									<Tooltip
										content={
											<span className="flex flex-col gap-1">
												{info.row.original.tags.slice(1).map((tag) => (
													<BasicLink
														key={`protocols-${category}-${tag}`}
														href={`/protocols/${slug(tag)}`}
														className="text-sm font-medium whitespace-nowrap text-(--link-text) hover:underline"
													>
														{tag}
													</BasicLink>
												))}
											</span>
										}
									>
										<span className="text-sm font-medium whitespace-nowrap text-(--text-disabled)">
											{`+${info.row.original.tags.length - 1}`}
										</span>
									</Tooltip>
								)}
							</span>
						)
					},
					meta: {
						align: 'end'
					},
					size: 180
				}
			]
		: []),
	...(['Derivatives', 'Interface'].includes(category)
		? [
				{
					id: 'perp_volume_24h',
					header: 'Perp Volume 24h',
					accessorFn: (protocol) => protocol.perpVolume?.total24h,
					cell: (info) => {
						if (info.getValue() == null) return null
						const helpers = []
						if (info.row.original.perpVolume?.zeroFeePerp) {
							helpers.push('This protocol charges no fees for most of its users')
						}
						// if (info.getValue() != null && info.row.original.perpVolume?.doublecounted) {
						// 	helpers.push(
						// 		"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
						// 	)
						// }

						if (helpers.length > 0) {
							return (
								<span className="flex items-center justify-end gap-1">
									{helpers.map((helper) => (
										<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
									))}
									<span className={info.row.original.perpVolume?.doublecounted ? 'text-(--text-disabled)' : ''}>
										{formattedNum(info.getValue(), true)}
									</span>
								</span>
							)
						}

						return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
					},
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Notional volume of all trades in the last 24 hours'
					},
					size: 160
				},
				...(['Interface'].includes(category)
					? []
					: [
							{
								header: 'Open Interest',
								id: 'open_interest',
								accessorFn: (protocol) => protocol.openInterest?.total24h,
								cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
								sortUndefined: 'last',
								sortingFn: 'alphanumericFalsyLast' as any,
								meta: {
									align: 'end',
									headerHelperText:
										'Total notional value of all outstanding perpetual futures positions, updated daily at 00:00 UTC'
								},
								size: 160
							}
						]),
				{
					id: 'perp_volume_7d',
					header: 'Perp Volume 7d',
					accessorFn: (protocol) => protocol.perpVolume?.total7d,
					cell: (info) => {
						if (info.getValue() == null) return null
						const helpers = []
						if (info.row.original.zeroFeePerp) {
							helpers.push('This protocol charges no fees for most of its users')
						}
						// if (info.getValue() != null && info.row.original.perpVolume?.doublecounted) {
						// 	helpers.push(
						// 		"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
						// 	)
						// }

						if (helpers.length > 0) {
							return (
								<span className="flex items-center justify-end gap-1">
									{helpers.map((helper) => (
										<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
									))}
									<span className={info.row.original.doublecounted ? 'text-(--text-disabled)' : ''}>
										{formattedNum(info.getValue(), true)}
									</span>
								</span>
							)
						}

						return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
					},
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Notional volume of all trades in the last 7 days'
					},
					size: 160
				},
				{
					id: 'perp_volume_30d',
					header: 'Perp Volume 30d',
					accessorFn: (protocol) => protocol.perpVolume?.total30d,
					cell: (info) => {
						if (info.getValue() == null) return null
						const helpers = []
						if (info.row.original.zeroFeePerp) {
							helpers.push('This protocol charges no fees for most of its users')
						}
						// if (info.getValue() != null && info.row.original.perpVolume?.doublecounted) {
						// 	helpers.push(
						// 		"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
						// 	)
						// }

						if (helpers.length > 0) {
							return (
								<span className="flex items-center justify-end gap-1">
									{helpers.map((helper) => (
										<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
									))}
									<span className={info.row.original.doublecounted ? 'text-(--text-disabled)' : ''}>
										{formattedNum(info.getValue(), true)}
									</span>
								</span>
							)
						}

						return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
					},
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Notional volume of all trades in the last 30 days'
					},
					size: 160
				}
			]
		: ([] as any)),
	...(['Interface'].includes(category)
		? []
		: [
				{
					id: 'tvl',
					header: isRWA ? 'Total Assets' : 'TVL',
					accessorFn: (protocol) => protocol.tvl,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Sum of value of all coins held in smart contracts of the protocol'
					},
					size: 120
				}
			]),
	...(isRWA
		? [
				{
					id: 'rwa_redeemable',
					header: 'Redeemable',
					accessorFn: (protocol) => protocol.rwaStats?.redeemable,
					cell: (info) => (
						<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
							{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
						</span>
					),
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Whether the asset can be redeemed for the underlying'
					},
					size: 120
				},
				{
					id: 'rwa_attestations',
					header: 'Attestations',
					accessorFn: (protocol) => protocol.rwaStats?.attestations,
					cell: (info) => (
						<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
							{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
						</span>
					),
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Whether the platform publishes holdings reports'
					},
					size: 120
				},
				{
					id: 'rwa_cex_listed',
					header: 'CEX Listed',
					accessorFn: (protocol) => protocol.rwaStats?.cexListed,
					cell: (info) => (
						<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
							{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
						</span>
					),
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Whether the asset is listed on a CEX'
					},
					size: 120
				},
				{
					id: 'rwa_kyc',
					header: 'KYC',
					accessorFn: (protocol) => protocol.rwaStats?.kyc,
					cell: (info) => (
						<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
							{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
						</span>
					),
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Whether the asset requires KYC to mint and redeem'
					},
					size: 80
				},
				{
					id: 'rwa_transferable',
					header: 'Transferable',
					accessorFn: (protocol) => protocol.rwaStats?.transferable,
					cell: (info) => (
						<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
							{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
						</span>
					),
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Whether the asset can be transferred freely to third parties'
					},
					size: 120
				},
				{
					id: 'rwa_self_custody',
					header: 'Self Custody',
					accessorFn: (protocol) => protocol.rwaStats?.selfCustody,
					cell: (info) => (
						<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
							{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
						</span>
					),
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Whether the asset can be self-custodied'
					},
					size: 120
				},
				{
					id: 'rwa_liquidity',
					header: 'Liquidity',
					accessorFn: (protocol) => protocol.rwaStats?.tvlUsd,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Liquidity of the asset in tracked pools'
					},
					size: 120
				},
				{
					id: 'rwa_volume_7d',
					header: 'Volume 7d',
					accessorFn: (protocol) => protocol.rwaStats?.volumeUsd7d,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Volume of trades across tracked pools in the last 7 days'
					},
					size: 120
				},
				{
					id: 'rwa_volume_24h',
					header: 'Volume 24h',
					accessorFn: (protocol) => protocol.rwaStats?.volumeUsd1d,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Volume of trades across tracked pools in the last 24 hours'
					},
					size: 120
				}
			]
		: ([] as any)),
	{
		id: 'fees_7d',
		header: 'Fees 7d',
		accessorFn: (protocol) => protocol.fees?.total7d,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Fees paid by users in the last 7 days'
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
			align: 'end',
			headerHelperText: 'Revenue earned by the protocol in the last 7 days'
		},
		size: 128
	},
	...(['Dexs', 'DEX Aggregators', 'Prediction Market'].includes(category)
		? [
				{
					id: 'dex_volume_7d',
					header: 'DEX Volume 7d',
					accessorFn: (protocol) => protocol.dexVolume?.total7d,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Volume of spot trades in the last 7 days'
					},
					size: 140
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
			align: 'end',
			headerHelperText: 'Market cap / TVL ratio'
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
			align: 'end',
			headerHelperText: 'Fees paid by users in the last 30 days'
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
			align: 'end',
			headerHelperText: 'Revenue earned by the protocol in the last 30 days'
		},
		size: 128
	},
	...(['Dexs', 'DEX Aggregators', 'Prediction Market'].includes(category)
		? [
				{
					id: 'dex_volume_30d',
					header: 'DEX Volume 30d',
					accessorFn: (protocol) => protocol.dexVolume?.total30d,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Volume of spot trades in the last 30 days'
					},
					size: 148
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
			align: 'end',
			headerHelperText: 'Fees paid by users in the last 24 hours'
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
			align: 'end',
			headerHelperText: 'Revenue earned by the protocol in the last 24 hours'
		},
		size: 128
	},
	...(['Dexs', 'DEX Aggregators', 'Prediction Market'].includes(category)
		? [
				{
					id: 'dex_volume_24h',
					header: 'DEX Volume 24h',
					accessorFn: (protocol) => protocol.dexVolume?.total24h,
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					meta: {
						align: 'end',
						headerHelperText: 'Volume of spot trades in the last 24 hours'
					},
					size: 148
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
						align: 'end',
						headerHelperText: 'Total amount borrowed from the protocol'
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
						align: 'end',
						headerHelperText: 'Total amount supplied to the protocol'
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
						align: 'end',
						headerHelperText: '(Total amount supplied / Total value locked) ratio'
					},
					size: 140
				}
			]
		: ([] as any))
]
