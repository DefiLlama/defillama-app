import * as React from 'react'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { RowLinksWithDropdown } from '~/components/Filters/common/RowLinksWithDropdown'
import { IParentProtocol } from '~/api/types'
import { formatProtocolsList } from '~/hooks/data/defi'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { ProtocolsTableWithSearch } from '~/components/Table/Defi/Protocols'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { LayoutWrapper } from '~/containers/ChainContainer'
import { chainIconUrl, formattedNum, getPercentChange, slug } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { Name } from '~/layout/ProtocolAndPool'
import { RowWithSubRows } from '~/containers/Defi/Protocol/RowWithSubRows'
import { categoryProtocolsColumns } from '~/components/Table/Defi/Protocols/columns'
import { IOverviewProps } from '~/api/categories/adaptors'
import { CompareProtocols } from '~/containers/CompareProtocols'
import { ButtonDark } from '~/components/ButtonStyled'
import { Icon } from '~/components/Icon'
import { Dialog, DialogDismiss, DialogHeading, useDialogState } from 'ariakit'

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

	const dialogState = useDialogState()

	return (
		<>
			<ProtocolsChainsSearch
				step={{
					category: category || 'Home',
					name: routeName,
					route: 'categories'
				}}
			/>
			<div className="flex gap-2">
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
					<nav className="flex items-center gap-5 overflow-hidden">
						<RowLinksWithDropdown links={chainOptions} activeLink={chain} />
					</nav>
				)}
				{category ? (
					<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl py-4 px-2 min-h-[394px]">
						<div className="flex flex-col gap-8 p-6 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
							{chain !== 'All' && chain && (
								<Name data-chainname>
									<TokenLogo logo={chainIconUrl(chain)} size={24} />
									<span>{chain}</span>
								</Name>
							)}
							<details className="group text-base">
								<summary className="flex items-center">
									<Icon
										name="chevron-right"
										height={20}
										width={20}
										className="-ml-5 -mb-5 group-open:rotate-90 transition-transform duration-100"
									/>
									<span className="flex flex-col">
										<span className="text-[#545757] dark:text-[#cccccc]">Total Value Locked</span>
										<span className="font-semibold text-2xl font-jetbrains min-h-8">{tvl}</span>
									</span>
								</summary>
								<p className="flex items-center flex-wrap justify-between gap-2 mt-3">
									<span className="text-[#545757] dark:text-[#cccccc]">Change (24h)</span>
									<span className="font-jetbrains">{percentChange || 0}%</span>
								</p>
								<p className="flex items-center flex-wrap justify-between gap-2 my-1">
									<span className="text-[#545757] dark:text-[#cccccc]">{topToken.name} Dominance</span>
									<span className="font-jetbrains">{dominance}%</span>
								</p>
							</details>
							<table>
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
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																Volume (7d)
															</th>
															<td className="text-sm text-right">{formattedNum(totals.volume_7d, true)}</td>
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
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																Fees (7d)
															</th>
															<td className="text-sm text-right">{formattedNum(totals.fees_7d, true)}</td>
														</tr>
													) : null}
													{totals.fees_30d ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																Fees (30d)
															</th>
															<td className="text-sm text-right">{formattedNum(totals.fees_30d, true)}</td>
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
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																Revenue (7d)
															</th>
															<td className="text-sm text-right">{formattedNum(totals.revenue_7d, true)}</td>
														</tr>
													) : null}
													{totals.revenue_30d ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																Revenue (30d)
															</th>
															<td className="text-sm text-right">{formattedNum(totals.revenue_30d, true)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : null}
								</tbody>
							</table>
						</div>
						{router.isReady && categoryChart ? <ChainChart datasets={datasets} title="" isThemeDark={isDark} /> : null}
					</div>
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
				<ButtonDark className="fixed bottom-4 right-4" onClick={dialogState.toggle}>
					Compare Protocols ({compareProtocols.length})
				</ButtonDark>
			)}

			<Dialog state={dialogState} className="dialog sm:max-w-[70vw]">
				<span className="flex items-center justify-center gap-1 w-full relative">
					<DialogHeading className="font-medium text-xl">Compare Protocols</DialogHeading>
					<DialogDismiss className="absolute right-0 top-0">
						<Icon name="x" height={16} width={16} />
						<span className="sr-only">Close dialog</span>
					</DialogDismiss>
				</span>
				<CompareProtocols protocols={compareProtocols.map(slug)} chain={chain} />
			</Dialog>
		</>
	)
}
export function ProtocolList(props: IAllTokensPageProps) {
	return <Container {...props} />
}
