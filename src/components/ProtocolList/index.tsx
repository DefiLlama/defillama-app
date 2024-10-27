import * as React from 'react'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { IParentProtocol } from '~/api/types'
import { formatProtocolsList } from '~/hooks/data/defi'
import CSVDownloadButton from '../ButtonStyled/CsvButton'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { ProtocolsTableWithSearch } from '../Table/Defi/Protocols'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { LayoutWrapper, OverallMetricsWrapper } from '~/containers/ChainContainer'
import { StatsSection } from '~/layout/Stats/Medium'
import { chainIconUrl, formattedNum, getPercentChange, slug } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { Name } from '~/layout/ProtocolAndPool'
import { AccordionStat, StatInARow } from '~/layout/Stats/Large'
import { RowWithSubRows, StatsTable2 } from '~/containers/Defi/Protocol'
import { categoryProtocolsColumns } from '../Table/Defi/Protocols/columns'
import { IOverviewProps } from '~/api/categories/adaptors'
import Modal from '../Modal'
import CompareProtocols from '../CompareProtocols'
import { ButtonDark } from '../ButtonStyled'
import { Icon } from '~/components/Icon'

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
	fees?: IOverviewProps['protocols']
	volumes?: IOverviewProps['protocols']
}

function Container({
	title,
	category,
	chain = 'All',
	chains = [],
	filteredProtocols,
	showChainList = true,
	parentProtocols,
	csvDownload = false,
	categoryChart,
	fees,
	volumes
}: IAllTokensPageProps) {
	const [isDark] = useDarkModeManager()
	const router = useRouter()
	const [compareProtocols, setCompareProtocols] = React.useState<string[]>([])
	const [isCompareModalOpen, setIsCompareModalOpen] = React.useState(false)
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
				const borrowed = p.extraTvl?.borrowed?.tvl ?? undefined
				const supplied = borrowed ? borrowed + p.tvl : undefined
				const suppliedTvl = supplied ? supplied / p.tvl : undefined
				return { ...p, borrowed, supplied, suppliedTvl }
			})
		} else return filteredProtocols
	}, [filteredProtocols, category])

	const [extraTvlsEnabled] = useDefiManager()

	React.useEffect(() => {
		setCompareProtocols([])
	}, [chain, category])

	const addOrRemoveCompare = React.useCallback(
		(protocol) => {
			setCompareProtocols((prev) =>
				prev.indexOf(protocol) === -1 ? [...prev, protocol] : prev.filter((p) => p !== protocol)
			)
		},
		[compareProtocols, setCompareProtocols, category, chain]
	)
	const protocolTotals = React.useMemo(() => {
		const data = formatProtocolsList({
			extraTvlsEnabled,
			protocols,
			parentProtocols,
			feesData: fees,
			volumeData: volumes
		})

		return data.map((p) => ({
			...p,
			compare: addOrRemoveCompare,
			isCompared: compareProtocols.includes(p.name)
		}))
	}, [extraTvlsEnabled, protocols, parentProtocols, category, chain, compareProtocols])

	const { tvl, dominance, topToken, percentChange, totals } = React.useMemo(() => {
		const tvlVal = protocolTotals?.reduce((acc, protocol) => acc + protocol.tvl, 0)
		const tvl = formattedNum(tvlVal, true)
		const dominance = protocolTotals?.[0]?.tvl ? ((protocolTotals?.[0]?.tvl / tvlVal) * 100).toFixed(2) : 0
		const topToken = protocolTotals?.[0] ?? { name: '', tvl: 0 }
		const percentChange = getPercentChange(
			categoryChart?.[categoryChart.length - 1]?.[1],
			categoryChart?.[categoryChart.length - 2]?.[1]
		)?.toFixed(2)
		const aggregateField = (protocolTotals, field) =>
			protocolTotals?.reduce((acc, protocol) => acc + (protocol[field] || 0), 0)
		const totals: Record<string, number> = [
			'fees_24h',
			'fees_7d',
			'fees_30d',
			'revenue_24h',
			'revenue_7d',
			'revenue_30d',
			'volume_24h',
			'volume_7d'
		].reduce((acc, field) => {
			acc[field] = aggregateField(protocolTotals, field)
			return acc
		}, {})
		return { tvl, dominance, topToken, percentChange, totals }
	}, [protocolTotals, categoryChart])
	if (!title) {
		title = `TVL Rankings`
		if (category) {
			title = `${category} TVL Rankings`
		}
	}
	const columnsToRemove = React.useMemo(
		() =>
			(category ? ['category'] : []).concat(
				Object.entries(totals)
					.filter((t) => !(t[1] > 0))
					.map((t) => t[0])
			),
		[totals, category]
	)
	const routeName = category ? (chain === 'All' ? 'All Chains' : chain) : 'All Protocols'

	const datasets = React.useMemo(() => {
		return [{ globalChart: categoryChart }]
	}, [categoryChart])

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
				<h1 className="text-2xl font-medium -mb-5">{title}</h1>
				{csvDownload ? (
					<CSVDownloadButton
						style={{ marginLeft: 'auto' }}
						onClick={() => {
							window.open(
								`https://api.llama.fi/simpleChainDataset/All?category=${category}&${Object.entries(extraTvlsEnabled)
									.filter((t) => t[1] === true)
									.map((t) => `${t[0]}=true`)
									.join('&')}${category === 'Liquid Staking' ? 'liquidstaking=true' : ''}`.replaceAll(' ', '_')
							)
						}}
					/>
				) : null}
			</div>

			<LayoutWrapper>
				{showChainList && (
					<RowLinksWrapper style={{ marginBottom: '0px' }}>
						<RowLinksWithDropdown links={chainOptions} activeLink={chain} />
					</RowLinksWrapper>
				)}
				{category ? (
					<StatsSection style={{ padding: '16px 8px', minHeight: '394px' }}>
						<OverallMetricsWrapper>
							{chain !== 'All' && chain && (
								<Name data-chainname>
									<TokenLogo logo={chainIconUrl(chain)} size={24} />
									<span>{chain}</span>
								</Name>
							)}
							<AccordionStat data-tvl>
								<summary>
									<span data-arrowicon>
										<Icon name="chevron-right" height={20} width={20} />
									</span>

									<span data-summaryheader>
										<span>Total Value Locked</span>
										<span>{tvl}</span>
									</span>
								</summary>

								<span style={{ gap: '8px' }}>
									<StatInARow>
										<span>Change (24h)</span>
										<span>{percentChange || 0}%</span>
									</StatInARow>
									<StatInARow>
										<span>{topToken.name} Dominance</span>
										<span>{dominance}%</span>
									</StatInARow>
								</span>
							</AccordionStat>
							<StatsTable2>
								<tbody>
									{totals.volume_24h ? (
										<RowWithSubRows
											rowHeader={'Volume (24h)'}
											rowValue={formattedNum(totals.volume_24h, true)}
											helperText={null}
											protocolName={null}
											dataType={null}
											subRows={
												<>
													{totals.volume_7d ? (
														<tr>
															<th>Volume (7d)</th>
															<td>{formattedNum(totals.volume_7d, true)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : null}
									{totals.fees_24h ? (
										<RowWithSubRows
											rowHeader={'Fees (24h)'}
											rowValue={formattedNum(totals.fees_24h, true)}
											helperText={null}
											protocolName={null}
											dataType={null}
											subRows={
												<>
													{totals.fees_7d ? (
														<tr>
															<th>Fees (7d)</th>
															<td>{formattedNum(totals.fees_7d, true)}</td>
														</tr>
													) : null}
													{totals.fees_30d ? (
														<tr>
															<th>Fees (30d)</th>
															<td>{formattedNum(totals.fees_30d, true)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : null}
									{totals.revenue_24h ? (
										<RowWithSubRows
											rowHeader={'Revenue (24h)'}
											rowValue={formattedNum(totals.revenue_24h, true)}
											helperText={null}
											protocolName={null}
											dataType={null}
											subRows={
												<>
													{totals.revenue_7d ? (
														<tr>
															<th>Revenue (7d)</th>
															<td>{formattedNum(totals.revenue_7d, true)}</td>
														</tr>
													) : null}
													{totals.revenue_30d ? (
														<tr>
															<th>Revenue (30d)</th>
															<td>{formattedNum(totals.revenue_30d, true)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : null}
								</tbody>
							</StatsTable2>
						</OverallMetricsWrapper>
						{router.isReady && categoryChart ? (
							<ChainChart datasets={datasets} title="" isThemeDark={isDark} hideTooltip={false} />
						) : null}
					</StatsSection>
				) : null}

				<ProtocolsTableWithSearch
					data={protocolTotals}
					columns={categoryProtocolsColumns}
					addlColumns={
						category === 'Lending' || category === 'Undercollateralized Lending'
							? ['borrowed', 'supplied', 'suppliedTvl']
							: null
					}
					removeColumns={columnsToRemove}
				/>
			</LayoutWrapper>
			{compareProtocols.length > 0 && (
				<ButtonDark className="fixed bottom-4 right-4" onClick={() => setIsCompareModalOpen(true)}>
					Compare Protocols ({compareProtocols.length})
				</ButtonDark>
			)}
			<Modal isOpen={isCompareModalOpen} onClose={() => setIsCompareModalOpen(false)} title="Compare Protocols">
				<CompareProtocols protocols={compareProtocols.map(slug)} chain={chain} />
			</Modal>
		</>
	)
}
export function ProtocolList(props: IAllTokensPageProps) {
	return <Container {...props} />
}
