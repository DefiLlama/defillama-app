import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'react-feather'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import QuestionHelper from '~/components/QuestionHelper'
import TokenLogo from '~/components/TokenLogo'
import { formattedNum, formattedPercent, slug } from '~/utils'
import { AccordionButton, Name } from '../../shared'
import { IDexsRow } from '../types'

export const NameColumn = (type: string, allChains?: boolean, size = 240): ColumnDef<IDexsRow> => ({
	header: () => <Name>Name</Name>,
	accessorKey: 'displayName',
	enableSorting: false,
	cell: ({ getValue, row, table }) => {
		const value = getValue() as string
		const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
		return (
			<Name depth={row.depth}>
				{row.subRows?.length > 0 && (
					<AccordionButton
						{...{
							onClick: row.getToggleExpandedHandler()
						}}
					>
						{row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
					</AccordionButton>
				)}
				<span>{index + 1}</span>
				<TokenLogo logo={row.original.logo} data-lgonly />
				<CustomLink href={`/${type}/${allChains ? 'chains/' : ''}${slug(row.original.name)}`}>{`${value}`}</CustomLink>
				{row.original.disabled && <QuestionHelper text={`This protocol has been disabled`} />}
			</Name>
		)
	},
	size
})
export const ChainsColumn = (type: string): ColumnDef<IDexsRow> => ({
	header: 'Chains',
	accessorKey: 'chains',
	enableSorting: false,
	cell: (info) => <IconsRow links={info.getValue() as Array<string>} url={`/${type}/chains`} iconType="chain" />,
	meta: {
		align: 'end'
	},
	size: 140
})

export const Change1dColumn: ColumnDef<IDexsRow> = {
	header: '1d Change',
	accessorKey: 'change_1d',
	cell: (info) => <>{formattedPercent(info.getValue())}</>,
	size: 140,
	meta: {
		align: 'end'
	}
}
export const Change7dColumn: ColumnDef<IDexsRow> = {
	header: '7d Change',
	accessorKey: 'change_7d',
	enableSorting: true,
	cell: (info) => <>{formattedPercent(info.getValue())}</>,
	size: 140,
	meta: {
		align: 'end'
	}
}
export const Change1mColumn: ColumnDef<IDexsRow> = {
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
): ColumnDef<IDexsRow> => ({
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
): ColumnDef<IDexsRow> => ({
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
	hideNull = false
): ColumnDef<IDexsRow> => {
	const accessor = alternativeAccessor ?? 'total24h'
	return {
		header: header ?? `${type} (24h)`,
		accessorKey: accessor,
		enableSorting: true,
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
			return (
				<span style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
					{methodology ? <QuestionHelper text={methodology} textAlign="center" /> : null}
					<span>${formattedNum(value)}</span>
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
): ColumnDef<IDexsRow> => {
	const accessor = alternativeAccessor ?? 'totalAllTime'
	return {
		header: `Cumulative ${type}`,
		accessorKey: accessor,
		enableSorting: true,
		cell: (info) => {
			if (Number.isNaN(formattedNum(info.getValue())) || formattedNum(info.getValue()) === '0') return <></>
			const rawMethodology = typeof info.row.original.methodology === 'object' ? info.row.original.methodology : {}
			const methodology = Object.entries(rawMethodology).find(([name]) => accessor.includes(name))?.[1]
			return (
				<span style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
					{methodology ? <QuestionHelper text={methodology} textAlign="center" /> : null}
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
export const VolumeTVLColumn: ColumnDef<IDexsRow> = {
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
export const DominanceColumn: ColumnDef<IDexsRow> = {
	header: '% of total',
	accessorKey: 'dominance',
	enableSorting: true,
	cell: (info) => <>{formattedPercent(info.getValue(), true)}</>,
	size: 140,
	meta: {
		align: 'end',
		headerHelperText: '% of the 24h total volume'
	}
}

export const CategoryColumn: ColumnDef<IDexsRow> = {
	header: 'Category',
	accessorKey: 'category',
	size: 140,
	meta: {
		align: 'end'
	}
}
export const TVLColumn: ColumnDef<IDexsRow> = {
	header: 'TVL',
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
