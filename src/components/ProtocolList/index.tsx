import * as React from 'react'
import { Header } from '~/Theme'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { IParentProtocol } from '~/api/types'
import { formatProtocolsList } from '~/hooks/data/defi'
import CSVDownloadButton from '../ButtonStyled/CsvButton'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { ProtocolsTableWithSearch } from '../Table/Defi/Protocols'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'

const ChainChart: any = dynamic(() => import('~/components/ECharts/ChainChart'), {
	ssr: false
})

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
	categoryChart?: Array<[number, number]>
}

function ProtocolList({
	title,
	category,
	chain = 'All',
	chains = [],
	filteredProtocols,
	showChainList = true,
	parentProtocols,
	csvDownload = false,
	categoryChart
}: IAllTokensPageProps) {
	const [isDark] = useDarkModeManager()

	const router = useRouter()
	const handleRouting = (chain) => {
		if (chain === 'All') return `/protocols/${category}`
		return `/protocols/${category}/${chain}`
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
				{csvDownload ? (
					<CSVDownloadButton
						style={{ marginLeft: 'auto' }}
						onClick={() => {
							window.open(
								`https://api.llama.fi/simpleChainDataset/All?category=${category}&${Object.entries(extraTvlsEnabled)
									.filter((t) => t[1] === true)
									.map((t) => `${t[0]}=true`)
									.join('&')}`
							)
						}}
					/>
				) : null}
			</div>

			{showChainList && (
				<RowLinksWrapper>
					<RowLinksWithDropdown links={chainOptions} activeLink={chain} />
				</RowLinksWrapper>
			)}

			{router.isReady && categoryChart ? (
				<ChainChart datasets={[{ globalChart: categoryChart }]} title="" isThemeDark={isDark} hideTooltip />
			) : null}

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
