import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'react-feather'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import QuestionHelper from '~/components/QuestionHelper'
import TokenLogo from '~/components/TokenLogo'
import { formattedNum, formattedPercent, slug } from '~/utils'
import { AccordionButton, Name } from '../../shared'
import { IDexsRow } from '../types'

export const NameColumn = (type: string, allChains?: boolean): ColumnDef<IDexsRow> => ({
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
	size: 240
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
	cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
	size: 140,
	meta: {
		align: 'end'
	}
}
export const Change7dColumn: ColumnDef<IDexsRow> = {
	header: '7d Change',
	accessorKey: 'change_7d',
	enableSorting: true,
	cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
	size: 140,
	meta: {
		align: 'end'
	}
}
export const Change1mColumn: ColumnDef<IDexsRow> = {
	header: '1m Change',
	accessorKey: 'change_1m',
	enableSorting: true,
	cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
	size: 140,
	meta: {
		align: 'end'
	}
}
export const Total24hColumn = (
	type: string,
	alternativeAccessor?: string,
	helperText?: string
): ColumnDef<IDexsRow> => ({
	header: `24h ${type}`,
	accessorKey: alternativeAccessor ?? 'total24h',
	enableSorting: true,
	cell: (info) => {
		const value = info.getValue()

		if (value === '' || value === 0 || Number.isNaN(formattedNum(value))) return <></>
		return <>${formattedNum(value)}</>
	},
	size: 140,
	meta: {
		align: 'end',
		headerHelperText: helperText
	}
})
export const TotalAllTimeColumn = (
	type: string,
	alternativeAccessor?: string,
	helperText?: string
): ColumnDef<IDexsRow> => ({
	header: `Total ${type}`,
	accessorKey: alternativeAccessor ?? 'totalAllTime',
	enableSorting: true,
	cell: (info) => {
		if (Number.isNaN(formattedNum(info.getValue()))) return <></>
		return <>${formattedNum(info.getValue())}</>
	},
	size: 140,
	meta: {
		align: 'end',
		headerHelperText: helperText ?? `Cumulative ${type}`
	}
})
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
	cell: (info) => <>{formattedPercent(info.getValue(), true, 400)}</>,
	size: 140,
	meta: {
		align: 'end'
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
