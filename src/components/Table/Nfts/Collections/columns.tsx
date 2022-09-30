import { ColumnDef } from '@tanstack/react-table'
import FormattedName from '~/components/FormattedName'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { capitalizeFirstLetter, formattedNum } from '~/utils'
import { Name } from '../../shared'
import type { INftsCollectionRow } from '../types'

export const columns: ColumnDef<INftsCollectionRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ row }) => {
			const item = row.original
			return (
				<Name>
					<TokenLogo address={item.address} logo={item.logo} external />
					{/* <img
						src={logo}
						alt=""
						style={{ height: size, width: size, aspectRatio: '1', borderRadius: '50%', flexShrink: 0 }}
					/> */}
					<CustomLink
						style={{
							marginLeft: '16px',
							whiteSpace: 'nowrap',
							minWidth: '200px'
						}}
						href={'/nfts/collection/' + item.slug}
					>
						<FormattedName text={`${item.name}`} maxCharacters={24} adjustSize={true} link={true} />
					</CustomLink>
				</Name>
			)
		},
		size: 200
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: (info) => {
			const values = info.getValue() as Array<string>
			return <IconsRow links={values.map((x) => capitalizeFirstLetter(x))} url="/nfts/chain" iconType="chain" />
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'MarketPlaces',
		accessorKey: 'marketplaces',
		enableSorting: false,
		cell: (info) => {
			const values = info.getValue() as Array<string>

			return <IconsRow links={values.map((x) => capitalizeFirstLetter(x))} url="/nfts/marketplace" iconType="token" />
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Daily Volume',
		accessorKey: 'dailyVolumeUSD',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <>{getValue() <= 0 ? '--' : formattedNum(getValue(), true)}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Total Volume',
		accessorKey: 'totalVolumeUSD',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <>{getValue() <= 0 ? '--' : formattedNum(getValue(), true)}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Floor',
		accessorKey: 'floor',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <>{getValue() <= 0 ? '--' : formattedNum(getValue(), true)}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Owners',
		accessorKey: 'owners',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <>{getValue() <= 0 ? '--' : formattedNum(getValue(), false)}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	}
]
