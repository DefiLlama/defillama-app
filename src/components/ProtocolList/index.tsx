import { useMemo } from 'react'
import { Header } from '~/Theme'
import { ProtocolsTable } from '~/components/VirtualTable'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { useCalcProtocolsTvls } from '~/hooks/data'
import { IParentProtocol } from '~/api/types'

interface IAllTokensPageProps {
	title?: string
	category?: string
	chain?: string
	chains?: string[]
	filteredProtocols?: any
	showChainList?: boolean
	defaultSortingColumn?: string
	parentProtocols?: IParentProtocol[]
}

function ProtocolList({
	title,
	category,
	chain = 'All',
	chains = [],
	filteredProtocols,
	showChainList = true,
	parentProtocols
}: IAllTokensPageProps) {
	const handleRouting = (chain) => {
		if (chain === 'All') return `/protocols/${category?.toLowerCase()}`
		return `/protocols/${category?.toLowerCase()}/${chain}`
	}
	const chainOptions = ['All', ...chains].map((label) => ({
		label,
		to: handleRouting(label)
	}))

	const protocols = useMemo(() => {
		if (category === 'Lending') {
			return filteredProtocols.map((p) => {
				const bTvl = p.extraTvl?.borrowed?.tvl ?? null
				const msizetvl = bTvl ? (bTvl + p.tvl) / p.tvl : null
				return { ...p, msizetvl }
			})
		} else return filteredProtocols
	}, [filteredProtocols, category])

	const protocolTotals = useCalcProtocolsTvls({ protocols, parentProtocols })

	if (!title) {
		title = `TVL Rankings`
		if (category) {
			title = `${category} TVL Rankings`
		}
	}

	const routeName = category ? (chain === 'All' ? 'All Chains' : chain) : 'All Protocols'

	return (
		<>
			<ProtocolsChainsSearch
				step={{
					category: category || 'Home',
					name: routeName,
					route: 'categories'
				}}
			/>
			<Header>{title}</Header>

			{showChainList && (
				<RowLinksWrapper>
					<RowLinksWithDropdown links={chainOptions} activeLink={chain} />
				</RowLinksWrapper>
			)}

			<ProtocolsTable data={protocolTotals} addlColumns={category === 'Lending' ? ['msizetvl'] : null} />
		</>
	)
}

export default ProtocolList
