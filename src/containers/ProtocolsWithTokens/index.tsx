import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Metrics, TMetric } from '~/components/Metrics'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { chainIconUrl, formattedNum, slug } from '~/utils'
import { IProtocolsWithTokensByChainPageData } from './queries'
import { ColumnDef } from '@tanstack/react-table'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { useRouter } from 'next/router'
import { useMemo } from 'react'

export function ProtocolsWithTokens(props: IProtocolsWithTokensByChainPageData) {
	const router = useRouter()

	const { category, chain, ...queries } = router.query

	const { selectedCategories, protocols } = useMemo(() => {
		const selectedCategories =
			props.categories.length > 0 && router.query.hasOwnProperty('category') && category === ''
				? []
				: category
					? typeof category === 'string'
						? [category]
						: category
					: props.categories

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
	}, [router.query, props])

	const addCategory = (newCategory) => {
		router.push(
			{
				pathname: router.basePath,
				query: {
					...queries,
					...(!router.basePath.includes('/chain/') && chain ? { chain } : {}),
					category: newCategory
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAllCategories = () => {
		router.push(
			{
				pathname: router.basePath,
				query: {
					...queries,
					...(!router.basePath.includes('/chain/') && chain ? { chain } : {}),
					category: props.categories
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clearAllCategories = () => {
		const newQuery: any = {
			...queries,
			...(!router.basePath.includes('/chain/') && chain ? { chain } : {})
		}

		if (props.categories.length > 0) {
			newQuery.category = ''
		}

		router.push(
			{
				pathname: router.basePath,
				query: newQuery
			},
			undefined,
			{ shallow: true }
		)
	}

	const { metricName, columns } = getMetricNameAndColumns(props.type)

	return (
		<>
			<Metrics currentMetric={metricName} />
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
								setSelectedValues={addCategory}
								selectOnlyOne={addCategory}
								toggleAll={toggleAllCategories}
								clearAll={clearAllCategories}
								nestedMenu={false}
								label={'Category'}
								labelType="smol"
								triggerProps={{
									className:
										'flex items-center justify-between gap-2 px-2 py-[6px] text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
								}}
							/>
						)}
					</>
				}
			/>
		</>
	)
}

const getProtocolsByCategory = (
	protocols: IProtocolsWithTokensByChainPageData['protocols'],
	categoriesToFilter: Array<string>
) => {
	const final = []

	for (const protocol of protocols) {
		if (protocol.subRows) {
			const childProtocols = protocol.subRows.filter((childProtocol) =>
				categoriesToFilter.includes(childProtocol.category)
			)

			if (childProtocols.length) {
				final.push(protocol)
			}

			continue
		}

		if (categoriesToFilter.includes(protocol.category)) {
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

const defaultColumns = (
	type: IProtocolsWithTokensByChainPageData['type']
): ColumnDef<IProtocolsWithTokensByChainPageData['protocols'][0]>[] => {
	return [
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

				const basePath = ['Chain', 'Rollup'].includes(row.original.category) ? 'chain' : 'protocol'
				const chartKey =
					(['Chain', 'Rollup'].includes(row.original.category) ? chainChartsKeys[type] : protocolChartsKeys[type]) ??
					null

				return (
					<span className={`flex items-center gap-2 relative ${row.depth > 0 ? 'pl-6' : 'pl-0'}`}>
						{row.subRows?.length > 0 ? (
							<button
								className="absolute -left-[18px]"
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

						{row.original.chains.length ? (
							<span className="flex flex-col -my-2">
								<BasicLink
									href={`/${basePath}/${row.original.slug}${
										chartKey ? `?tvl=false&events=false&${chartKey}=true` : ''
									}`}
									className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
								>
									{value}
								</BasicLink>

								<Tooltip content={<Chains />} className="text-[0.7rem] text-(--text-disabled)">
									{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
								</Tooltip>
							</span>
						) : (
							<BasicLink
								href={`/${basePath}/${row.original.slug}?tvl=false&events=false&${chartKey}=true`}
								className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
		sortUndefined: 'last',
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
		sortUndefined: 'last',
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
		sortUndefined: 'last',
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
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText:
				'Token price multiplied by outstanding supply.\n\nOutstanding supply is the total supply minus the supply that is not yet allocated to anything (eg coins in treasury or reserve).'
		},
		size: 128
	}
]

function getMetricNameAndColumns(type: IProtocolsWithTokensByChainPageData['type']): {
	metricName: TMetric
	columns: ColumnDef<IProtocolsWithTokensByChainPageData['protocols'][0]>[]
} {
	switch (type) {
		case 'mcap':
			return { metricName: 'Market Cap', columns: mcapColumns }
		case 'price':
			return { metricName: 'Token Price', columns: priceColumns }
		case 'fdv':
			return { metricName: 'FDV', columns: fdvColumns }
		case 'outstanding-fdv':
			return { metricName: 'Outstanding FDV', columns: outstandingFdvColumns }
		default:
			return { metricName: 'TVL', columns: [] }
	}
}
