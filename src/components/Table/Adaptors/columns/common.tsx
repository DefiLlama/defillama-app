import { ChevronDown, ChevronRight } from 'react-feather'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { formattedNum, formattedPercent, slug } from '~/utils'
import { AccordionButton, Name } from '../../shared'

export const NameColumn = (type: string) => ({
	header: () => <Name>Name</Name>,
	accessorKey: 'displayName',
	enableSorting: false,
	cell: ({ getValue, row, table }) => {
		const value = getValue() as string
		const splittedName = value.split(' - ')
		const name = splittedName.length > 1 ? splittedName.slice(0, splittedName.length - 1).join('') : value
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
				<CustomLink href={`/${type}/${slug(name)}`}>{`${value}`}</CustomLink>
			</Name>
		)
	},
	size: 240
})
export const ChainsColumn = (type: string) => ({
	header: 'Chains',
	accessorKey: 'chains',
	enableSorting: false,
	cell: (info) => <IconsRow links={info.getValue() as Array<string>} url={`${type}/chain`} iconType="chain" />,
	meta: {
		align: 'end' as 'end'
	},
	size: 140
})

export const Change1dColumn = {
	header: '1d Change',
	accessorKey: 'change_1d',
	cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
	size: 140,
	meta: {
		align: 'end' as 'end'
	}
}
export const Change7dColumn = {
	header: '7d Change',
	accessorKey: 'change_7d',
	enableSorting: true,
	cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
	size: 140,
	meta: {
		align: 'end' as 'end'
	}
}
export const Change1mColumn = {
	header: '1m Change',
	accessorKey: 'change_1m',
	enableSorting: true,
	cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
	size: 140,
	meta: {
		align: 'end' as 'end'
	}
}
export const Total24hColumn = (type: string, alternativeAccessor?: string, helperText?: string) => ({
	header: `24h ${type}`,
	accessorKey: alternativeAccessor ?? 'total24h',
	enableSorting: true,
	cell: (info) => {
		return <>${formattedNum(info.getValue())}</>
	},
	size: 140,
	meta: {
		align: 'end' as 'end',
		headerHelperText: helperText
	}
})
export const VolumeTVLColumn = {
	header: 'Volume/TVL',
	accessorKey: 'volumetvl',
	enableSorting: true,
	cell: (info) => <>{formattedNum(info.getValue())}</>,
	size: 140,
	meta: {
		align: 'end' as 'end',
		headerHelperText: 'This ratio can be interpreted as capital efficiency'
	}
}
export const DominanceColumn = {
	header: '% of total',
	accessorKey: 'dominance',
	enableSorting: true,
	cell: (info) => <>{formattedPercent(info.getValue(), true, 400)}</>,
	size: 140,
	meta: {
		align: 'end' as 'end'
	}
}

export const CategoryColumn = {
	header: 'Category',
	accessorKey: 'category',
	size: 140,
	meta: {
		align: 'end' as 'end'
	}
}
