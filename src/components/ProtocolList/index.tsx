import * as React from 'react'
import { Header } from '~/Theme'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { IParentProtocol } from '~/api/types'
import { formatProtocolsList } from '~/hooks/data/defi'
import { useDefiManager } from '~/contexts/LocalStorage'
import { DownloadIcon } from '..'
import { DownloadButton } from '~/containers/Raises/RaisesTable'
import { ProtocolsTableWithSearch } from '../Table/Defi/Protocols'

interface IAllTokensPageProps {
	title?: string
	category?: string
	chain?: string
	chains?: string[]
	filteredProtocols?: any
	showChainList?: boolean
	defaultSortingColumn?: string
	parentProtocols?: IParentProtocol[]
	chartData?: any
	color?: string
	csvDownload?: boolean
}

function ProtocolList({
	title,
	category,
	chain = 'All',
	chains = [],
	filteredProtocols,
	showChainList = true,
	parentProtocols,
	csvDownload = false
}: IAllTokensPageProps) {
	const handleRouting = (chain) => {
		if (chain === 'All') return `/protocols/${category?.toLowerCase()}`
		return `/protocols/${category?.toLowerCase()}/${chain}`
	}
	const chainOptions = ['All', ...chains].map((label) => ({
		label,
		to: handleRouting(label)
	}))

	const protocols = React.useMemo(() => {
		if (category === 'Lending' || category === 'Undercollateralized Lending') {
			return filteredProtocols.map((p) => {
				const borrowed = p.extraTvl?.borrowed?.tvl ?? null
				const supplied = borrowed ? borrowed + p.tvl : null
				const suppliedTvl = supplied ? supplied / p.tvl : null
				return { ...p, borrowed, supplied, suppliedTvl }
			})
		} else return filteredProtocols
	}, [filteredProtocols, category])

	const [extraTvlsEnabled] = useDefiManager()

	const protocolTotals = React.useMemo(() => {
		const data = formatProtocolsList({ extraTvlsEnabled, protocols, parentProtocols })

		return data
	}, [extraTvlsEnabled, protocols, parentProtocols])

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

			<div style={{ display: 'flex', gap: '8px' }}>
				<Header>{title}</Header>

				{csvDownload === true && (
					<a
						href={`https://api.llama.fi/simpleChainDataset/All?category=${category}&${Object.entries(extraTvlsEnabled)
							.filter((t) => t[1] === true)
							.map((t) => `${t[0]}=true`)
							.join('&')}`}
					>
						<DownloadButton>
							<DownloadIcon />
							<span>&nbsp;&nbsp;.csv</span>
						</DownloadButton>
					</a>
				)}
			</div>

			{showChainList && (
				<RowLinksWrapper>
					<RowLinksWithDropdown links={chainOptions} activeLink={chain} />
				</RowLinksWrapper>
			)}

			<ProtocolsTableWithSearch
				data={protocolTotals}
				addlColumns={
					category === 'Lending' || category === 'Undercollateralized Lending'
						? ['borrowed', 'supplied', 'suppliedTvl']
						: null
				}
				removeColumns={category ? ['category'] : null}
			/>
		</>
	)
}

export default ProtocolList
