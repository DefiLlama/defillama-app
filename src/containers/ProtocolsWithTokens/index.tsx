import { ColumnDef, SortingState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { chainIconUrl, formattedNum, slug } from '~/utils'
import { IProtocolsWithTokensByChainPageData } from './queries'

// Helper to parse exclude query param to Set
const parseExcludeParam = (param: string | string[] | undefined): Set<string> => {
	if (!param) return new Set()
	if (typeof param === 'string') return new Set([param])
	return new Set(param)
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
				header="Protocol Rankings"
				compact
				customFilters={
					<>
						{props.categories.length > 0 && (
							<SelectWithCombobox
								allValues={props.categories}
								selectedValues={selectedCategories}
								includeQueryKey="category"
								excludeQueryKey="excludeCategory"
								nestedMenu={false}
								label={'Category'}
								labelType="smol"
								triggerProps={{
									className:
										'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
								}}
							/>
						)}
					</>
				}
				sortingState={sortingState}
			/>
		</>
	)
}

const getProtocolsByCategory = (
	protocols: IProtocolsWithTokensByChainPageData['protocols'],
	categoriesToFilter: Array<string>
) => {
	const final = []
	const categoriesToFilterSet = new Set(categoriesToFilter)

	for (const protocol of protocols) {
		if (protocol.subRows) {
			const childProtocols = protocol.subRows.filter((childProtocol) =>
				categoriesToFilterSet.has(childProtocol.category)
			)

			if (childProtocols.length) {
				final.push(protocol)
			}

			continue
		}

		if (categoriesToFilterSet.has(protocol.category)) {
			final.push(protocol)
			continue
		}
	}

	return final
}

const chainChartsKeys = {
	mcap: 'chainTokenMcap',
	price: 'chainTokenPrice',
	fdv: 'chainTokenFdv'
}

const protocolChartsKeys = {
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

const defaultColumns = (
	type: IProtocolsWithTokensByChainPageData['type']
): ColumnDef<IProtocolsWithTokensByChainPageData['protocols'][0]>[] => {
	return [
		{
			id: 'name',
			header: 'Name',
			accessorFn: (protocol) => protocol.name,
			enableSorting: false,
			cell: ({ getValue, row }) => {
				const value = getValue() as string

				const basePath = ['Chain', 'Rollup'].includes(row.original.category) ? 'chain' : 'protocol'
				const chartKey =
					(['Chain', 'Rollup'].includes(row.original.category) ? chainChartsKeys[type] : protocolChartsKeys[type]) ??
					null

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

						{row.original.chains.length ? (
							<span className="-my-2 flex flex-col">
								<BasicLink
									href={`/${basePath}/${row.original.slug}${
										chartKey ? `?tvl=false&events=false&${chartKey}=true` : ''
									}`}
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
								href={`/${basePath}/${row.original.slug}?tvl=false&events=false&${chartKey}=true`}
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
			cell: ({ getValue }) =>
				getValue() ? (
					<BasicLink
						href={`/protocols/${slug(getValue() as string)}`}
						className="text-sm font-medium text-(--link-text)"
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
		}
	]
}

const mcapColumns: ColumnDef<IProtocolsWithTokensByChainPageData['protocols'][0]>[] = [
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

const fdvColumns: ColumnDef<IProtocolsWithTokensByChainPageData['protocols'][0]>[] = [
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

const priceColumns: ColumnDef<IProtocolsWithTokensByChainPageData['protocols'][0]>[] = [
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

const outstandingFdvColumns: ColumnDef<IProtocolsWithTokensByChainPageData['protocols'][0]>[] = [
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

function getMetricNameAndColumns(type: IProtocolsWithTokensByChainPageData['type']): {
	columns: ColumnDef<IProtocolsWithTokensByChainPageData['protocols'][0]>[]
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
