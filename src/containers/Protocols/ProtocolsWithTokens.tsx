import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { chainIconUrl, formattedNum, slug } from '~/utils'
import type { IProtocolsWithTokensByChainPageData, ITokenMetricProtocolRow, TokenMetricType } from './types'
import { parseExcludeParam } from './utils'

const chainLikeCategories = new Set(['Chain', 'Rollup'])

function getCsvHeaderLabel(columnId: string, header: unknown): string {
	if (typeof header === 'string') return header
	if (typeof header === 'number' || typeof header === 'boolean') return String(header)
	return columnId
}

function getCsvCellValue(value: unknown): string | number | boolean {
	if (value == null) return ''
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
	if (Array.isArray(value)) return value.join(', ')
	return JSON.stringify(value)
}

export function ProtocolsWithTokens(props: IProtocolsWithTokensByChainPageData) {
	const router = useRouter()

	const { category, excludeCategory } = router.query
	const hasCategoryParam = Object.prototype.hasOwnProperty.call(router.query, 'category')

	const { selectedCategories, protocols } = useMemo(() => {
		const excludeSet = parseExcludeParam(excludeCategory)

		let selectedCategories =
			props.categories.length > 0 && hasCategoryParam && category === ''
				? []
				: category
					? typeof category === 'string'
						? [category]
						: category
					: props.categories

		// Filter out excludes
		selectedCategories = excludeSet.size > 0 ? selectedCategories.filter((c) => !excludeSet.has(c)) : selectedCategories

		const categoriesToFilter = selectedCategories.filter((c) => c.toLowerCase() !== 'all' && c.toLowerCase() !== 'none')

		const protocols =
			props.categories.length === 0
				? props.protocols
				: selectedCategories.length === 0
					? []
					: categoriesToFilter.length > 0
						? getProtocolsByCategory(props.protocols, categoriesToFilter)
						: props.protocols

		return {
			selectedCategories,
			protocols
		}
	}, [category, excludeCategory, hasCategoryParam, props.categories, props.protocols])

	const { columns, sortingState } = getMetricNameAndColumns(props.type)

	return (
		<>
			<RowLinksWithDropdown links={props.chains} activeLink={props.chain} />
			<TableWithSearch
				data={protocols}
				columns={columns}
				placeholder={'Search protocols...'}
				columnToSearch={'name'}
				compact
				customFilters={({ instance }) => (
					<>
						{props.categories.length > 0 ? (
							<SelectWithCombobox
								allValues={props.categories}
								selectedValues={selectedCategories}
								includeQueryKey="category"
								excludeQueryKey="excludeCategory"
								nestedMenu={false}
								label={'Category'}
								labelType="smol"
								variant="filter-responsive"
							/>
						) : null}
						<CSVDownloadButton
							prepareCsv={() => {
								const visibleColumns = instance
									.getAllLeafColumns()
									.filter((column) => column.getIsVisible() && !column.columnDef.meta?.hidden)
								const headers = visibleColumns.map((column) => getCsvHeaderLabel(column.id, column.columnDef.header))
								const rows = instance
									.getRowModel()
									.rows.map((row) => visibleColumns.map((column) => getCsvCellValue(row.getValue(column.id))))

								return {
									filename: `protocols-with-tokens-${props.type}-${slug(props.chain)}.csv`,
									rows: [headers, ...rows]
								}
							}}
							smol
						/>
					</>
				)}
				sortingState={sortingState}
			/>
		</>
	)
}

function getProtocolsByCategory(
	protocols: IProtocolsWithTokensByChainPageData['protocols'],
	categoriesToFilter: Array<string>
): ITokenMetricProtocolRow[] {
	const final: ITokenMetricProtocolRow[] = []
	const categoriesToFilterSet = new Set(categoriesToFilter)

	for (const protocol of protocols) {
		if (protocol.subRows) {
			const childProtocols = protocol.subRows.filter((childProtocol) =>
				categoriesToFilterSet.has(childProtocol.category ?? '')
			)

			if (childProtocols.length) {
				final.push({
					...protocol,
					subRows: childProtocols
				})
			}

			continue
		}

		if (categoriesToFilterSet.has(protocol.category ?? '')) {
			final.push(protocol)
			continue
		}
	}

	return final
}

const chainChartsKeys: Partial<Record<TokenMetricType, string>> = {
	mcap: 'chainTokenMcap',
	price: 'chainTokenPrice',
	fdv: 'chainTokenFdv'
}

const protocolChartsKeys: Partial<Record<TokenMetricType, string>> = {
	mcap: 'mcap',
	price: 'price',
	fdv: 'fdv'
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

function defaultColumns(type: TokenMetricType): ColumnDef<ITokenMetricProtocolRow>[] {
	return [
		{
			id: 'name',
			header: 'Name',
			accessorFn: (protocol) => protocol.name,
			enableSorting: false,
			cell: ({ getValue, row }) => {
				const value = getValue<string>()

				const basePath = chainLikeCategories.has(row.original.category ?? '') ? 'chain' : 'protocol'
				const chartKey =
					(chainLikeCategories.has(row.original.category ?? '') ? chainChartsKeys[type] : protocolChartsKeys[type]) ??
					null
				const chartQuery = chartKey ? `?tvl=false&events=false&${chartKey}=true` : ''

				return (
					<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-6' : 'pl-0'}`}>
						{row.subRows?.length > 0 ? (
							<button
								className="absolute -left-4.5"
								{...{
									onClick: row.getToggleExpandedHandler()
								}}
							>
								{row.getIsExpanded() ? (
									<>
										<Icon name="chevron-down" height={16} width={16} />
										<span className="sr-only">Hide child protocols</span>
									</>
								) : (
									<>
										<Icon name="chevron-right" height={16} width={16} />
										<span className="sr-only">View child protocols</span>
									</>
								)}
							</button>
						) : null}
						<span className="vf-row-index shrink-0" aria-hidden="true" />

						<TokenLogo logo={row.original.logo} data-lgonly />

						{row.original.chains.length ? (
							<span className="-my-2 flex flex-col">
								<BasicLink
									href={`/${basePath}/${row.original.slug}${chartQuery}`}
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
						) : (
							<BasicLink
								href={`/${basePath}/${row.original.slug}${chartQuery}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								{value}
							</BasicLink>
						)}
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
			cell: ({ getValue }) => {
				const value = getValue<string | null>()
				return value ? (
					<BasicLink href={`/protocols/${slug(value)}`} className="text-sm font-medium text-(--link-text)">
						{value}
					</BasicLink>
				) : (
					''
				)
			},
			size: 128,
			meta: {
				align: 'end'
			}
		}
	]
}

const mcapColumns: ColumnDef<ITokenMetricProtocolRow>[] = [
	...defaultColumns('mcap'),
	{
		id: 'mcap',
		header: 'Market Cap',
		accessorFn: (protocol) => protocol.value,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 128
	}
]

const fdvColumns: ColumnDef<ITokenMetricProtocolRow>[] = [
	...defaultColumns('fdv'),
	{
		id: 'fdv',
		header: 'FDV',
		accessorFn: (protocol) => protocol.value,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 128
	}
]

const priceColumns: ColumnDef<ITokenMetricProtocolRow>[] = [
	...defaultColumns('price'),
	{
		id: 'price',
		header: 'Token Price',
		accessorFn: (protocol) => protocol.value,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 128
	}
]

const outstandingFdvColumns: ColumnDef<ITokenMetricProtocolRow>[] = [
	...defaultColumns('outstanding-fdv'),
	{
		id: 'outstanding-fdv',
		header: 'Outstanding FDV',
		accessorFn: (protocol) => protocol.value,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end',
			headerHelperText:
				'Token price multiplied by outstanding supply.\n\nOutstanding supply is the total supply minus the supply that is not yet allocated to anything (eg coins in treasury or reserve).'
		},
		size: 128
	}
]

function getMetricNameAndColumns(type: TokenMetricType): {
	columns: ColumnDef<ITokenMetricProtocolRow>[]
	sortingState: SortingState
} {
	switch (type) {
		case 'mcap':
			return { columns: mcapColumns, sortingState: [{ id: 'mcap', desc: true }] }
		case 'price':
			return { columns: priceColumns, sortingState: [{ id: 'price', desc: true }] }
		case 'fdv':
			return { columns: fdvColumns, sortingState: [{ id: 'fdv', desc: true }] }
		case 'outstanding-fdv':
			return { columns: outstandingFdvColumns, sortingState: [{ id: 'outstanding-fdv', desc: true }] }
		default:
			return { columns: [], sortingState: [] }
	}
}
