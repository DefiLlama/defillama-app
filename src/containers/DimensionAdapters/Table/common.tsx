import { ColumnDef } from '@tanstack/react-table'
import { IconsRow } from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, formattedPercent, slug } from '~/utils'
import { Icon } from '~/components/Icon'
import { IAdapterRow } from './types'

export const NameColumn = (type: string, allChains?: boolean, size = 240): ColumnDef<IAdapterRow> => ({
	header: 'Name',
	accessorKey: 'displayName',
	enableSorting: false,
	cell: ({ getValue, row, table }) => {
		const value = getValue() as string
		const isParent = row.original?.subRows?.length > 0
		const Link =
			row.original?.category === 'NFT' ? (
				isParent ? (
					value
				) : (
					<CustomLink
						href={`/nfts/royalties/${row.original.defillamaId}`}
						target="_blank"
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>{`${value}`}</CustomLink>
				)
			) : (
				<CustomLink
					href={`/${type}/${allChains ? 'chains/' : ''}${slug(row.original.name)}`}
					className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
				>{`${value}`}</CustomLink>
			)
		const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
		return (
			<span
				className="flex items-center gap-2 relative"
				style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
			>
				{row.subRows?.length > 0 && (
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
				)}
				<span className="flex-shrink-0">{index + 1}</span>
				<TokenLogo logo={row.original.logo} data-lgonly />
				{Link}
				{row.original.disabled && <QuestionHelper text={`This protocol has been disabled`} />}
			</span>
		)
	},
	size
})
export const ChainsColumn = (type: string): ColumnDef<IAdapterRow> => ({
	header: 'Chains',
	accessorKey: 'chains',
	enableSorting: false,
	cell: (info) => <IconsRow links={info.getValue() as Array<string>} url={`/${type}/chains`} iconType="chain" />,
	meta: {
		align: 'end'
	},
	size: 140
})

export const Change1dColumn: ColumnDef<IAdapterRow> = {
	header: '1d Change',
	accessorKey: 'change_1d',
	cell: (info) => <>{formattedPercent(info.getValue())}</>,
	size: 140,
	meta: {
		align: 'end'
	}
}
export const Change7dColumn: ColumnDef<IAdapterRow> = {
	header: '7d Change',
	accessorKey: 'change_7d',
	enableSorting: true,
	cell: (info) => <>{formattedPercent(info.getValue())}</>,
	size: 140,
	meta: {
		align: 'end'
	}
}
export const Change1mColumn: ColumnDef<IAdapterRow> = {
	header: '1m Change',
	accessorKey: 'change_1m',
	enableSorting: true,
	cell: (info) => <>{formattedPercent(info.getValue())}</>,
	size: 140,
	meta: {
		align: 'end'
	}
}
export const ChangeColumn = (
	header: string,
	accesor: string,
	size?: number,
	headerHelperText?: string
): ColumnDef<IAdapterRow> => ({
	header: header,
	accessorKey: accesor,
	enableSorting: true,
	cell: (info) => <>{formattedPercent(info.getValue())}</>,
	size: size ?? 140,
	meta: {
		align: 'end',
		headerHelperText
	}
})
export const XColumn = (
	header: string,
	accesor: string,
	size?: number,
	headerHelperText?: string
): ColumnDef<IAdapterRow> => ({
	header: header,
	accessorKey: accesor,
	enableSorting: true,
	cell: (info) => {
		if (!info.getValue()) return <></>
		return <>{`${info.getValue()}x`}</>
	},
	size: size ?? 140,
	meta: {
		align: 'end',
		headerHelperText
	}
})
export const Total24hColumn = (
	type: string,
	alternativeAccessor?: string,
	helperText?: string,
	extraWidth?: number,
	header?: string,
	hideNull = true
): ColumnDef<IAdapterRow> => {
	const accessor = alternativeAccessor ?? 'total24h'
	return {
		header: header ?? `${type} (24h)`,
		accessorKey: accessor,
		enableSorting: true,
		sortUndefined: 'last' as any,
		sortingFn: 'alphanumericFalsyLast' as any,
		cell: (info) => {
			const value = info.getValue()
			if (!Number(value) && hideNull) return <></>
			if (value === '' || (value === null && alternativeAccessor === 'mcap') || Number.isNaN(formattedNum(value)))
				return <></>
			const rawMethodology = typeof info.row.original.methodology === 'object' ? info.row.original.methodology : {}
			const methodologyKey = (() => {
				if (accessor.includes('24h')) return type
				else return accessor.slice(5) // ('daily' | 'total').length
			})()
			const methodology = Object.entries(rawMethodology).find(
				([name]) => name.toLowerCase() === methodologyKey.toLowerCase()
			)?.[1]

			if (!methodology) {
				return `$${formattedNum(value)}`
			}

			return (
				<span className="flex items-center justify-end gap-1">
					{methodology ? <QuestionHelper text={methodology} /> : null}
					<span>${formattedNum(info.getValue())}</span>
				</span>
			)
		},
		size: extraWidth ?? 140,
		meta: {
			align: 'end',
			headerHelperText: helperText
		}
	}
}
export const TotalAllTimeColumn = (
	type: string,
	alternativeAccessor?: string,
	helperText?: string
): ColumnDef<IAdapterRow> => {
	const accessor = alternativeAccessor ?? 'totalAllTime'
	return {
		header: `Cumulative ${type}`,
		accessorKey: accessor,
		enableSorting: true,
		cell: (info) => {
			if (Number.isNaN(formattedNum(info.getValue())) || formattedNum(info.getValue()) === '0') return <></>
			const rawMethodology = typeof info.row.original.methodology === 'object' ? info.row.original.methodology : {}
			const methodology = Object.entries(rawMethodology).find(([name]) => accessor.includes(name))?.[1]

			if (!methodology) {
				return `$${formattedNum(info.getValue())}`
			}

			return (
				<span className="flex items-center justify-end gap-1">
					{methodology ? <QuestionHelper text={methodology} /> : null}
					<span>${formattedNum(info.getValue())}</span>
				</span>
			)
		},
		size: 160,
		meta: {
			align: 'end',
			headerHelperText: helperText
		}
	}
}
export const VolumeTVLColumn: ColumnDef<IAdapterRow> = {
	header: 'Volume/TVL',
	accessorKey: 'volumetvl',
	enableSorting: true,
	cell: (info) => {
		const fNum = formattedNum(info.getValue())
		if (Number.isNaN(fNum)) return <></>
		return <>{fNum}</>
	},
	size: 140,
	meta: {
		align: 'end',
		headerHelperText: 'This ratio can be interpreted as capital efficiency'
	}
}
export const DominanceColumn: ColumnDef<IAdapterRow> = {
	header: '% of total',
	accessorKey: 'dominance',
	enableSorting: true,
	cell: (info) => <>{formattedPercent(info.getValue(), true)}</>,
	size: 120,
	meta: {
		align: 'end',
		headerHelperText: '% of the 24h total volume'
	}
}

export const CategoryColumn: ColumnDef<IAdapterRow> = {
	header: 'Category',
	accessorKey: 'category',
	size: 140,
	meta: {
		align: 'end'
	}
}
export const TVLColumn: ColumnDef<IAdapterRow> = {
	header: 'DEX TVL',
	accessorKey: 'tvl',
	enableSorting: true,
	cell: (info) => {
		const fNum = formattedNum(info.getValue())
		if (Number.isNaN(fNum)) return <></>
		return <>{fNum}</>
	},
	size: 100,
	meta: {
		align: 'end'
	}
}
