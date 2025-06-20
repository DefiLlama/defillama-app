import * as React from 'react'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { IParentProtocol } from '~/api/types'
import { formatProtocolsList } from '~/hooks/data/defi'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { ProtocolsTableWithSearch } from '~/components/Table/Defi/Protocols'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { chainIconUrl, formattedNum, getPercentChange, slug } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { RowWithSubRows } from '~/containers/ProtocolOverview/RowWithSubRows'
import { categoryProtocolsColumns } from '~/components/Table/Defi/Protocols/columns'
import { IOverviewProps } from '~/api/categories/adaptors'
import { ButtonDark } from '~/components/ButtonStyled'
import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { fuseProtocolData } from '~/api/categories/protocols'
import { PROTOCOL_API } from '~/constants'
import { fetchApi } from '~/utils/async'
import { formatProtocolsTvlChartData } from '~/containers/ProtocolOverview/Chart/useFetchAndFormatChartData'
import { LocalLoader } from '~/components/LocalLoader'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'

const ChainChart: any = dynamic(() => import('~/containers/ChainOverview/Chart').then((m) => m.ChainChart), {
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

	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const addOrRemoveCompare = (protocol) => {
		setCompareProtocols((prev) =>
			prev.indexOf(protocol) === -1 ? [...prev, protocol] : prev.filter((p) => p !== protocol)
		)
	}

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
	}, [extraTvlsEnabled, protocols, parentProtocols, compareProtocols, fees, volumes])

	const { tvl, dominance, topToken, percentChange, totals } = React.useMemo(() => {
		const tvlVal = protocolTotals?.reduce((acc, protocol) => (acc += protocol.tvl ?? 0), 0)
		const tvl = formattedNum(tvlVal, true)
		const dominance = protocolTotals?.[0]?.tvl && tvlVal ? ((protocolTotals?.[0]?.tvl / tvlVal) * 100).toFixed(2) : 0
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

	const datasets = React.useMemo(() => {
		return [{ globalChart: categoryChart }]
	}, [categoryChart])

	const dialogStore = Ariakit.useDialogStore()

	return (
		<>
			<ProtocolsChainsSearch />

			{showChainList && (
				<div className="bg-[var(--cards-bg)] rounded-md">
					<RowLinksWithDropdown links={chainOptions} activeLink={chain} />
				</div>
			)}

			{category ? (
				<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
					<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
						{chain !== 'All' && chain && (
							<h1 className="flex items-center gap-2">
								<TokenLogo logo={chainIconUrl(chain)} size={24} />
								<span className="text-xl font-semibold">{chain}</span>
							</h1>
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
									<span className="text-[#545757] dark:text-[#cccccc] text-sm">Total Value Locked</span>
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
						<table className="text-base w-full border-collapse">
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
						{csvDownload ? (
							<CSVDownloadButton
								className="mt-auto mr-auto"
								onClick={() => {
									window.open(
										`https://api.llama.fi/simpleChainDataset/${chain}?category=${category}&${Object.entries(
											extraTvlsEnabled
										)
											.filter((t) => t[1] === true)
											.map((t) => `${t[0]}=true`)
											.join('&')}${category === 'Liquid Staking' ? 'liquidstaking=true' : ''}`.replaceAll(' ', '_')
									)
								}}
							/>
						) : null}
					</div>
					<div className="bg-[var(--cards-bg)] min-h-[360px] rounded-md col-span-2">
						{router.isReady && categoryChart ? <ChainChart datasets={datasets} title="" isThemeDark={isDark} /> : null}
					</div>
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

			{compareProtocols.length > 0 && (
				<Ariakit.DialogProvider store={dialogStore}>
					<ButtonDark className="fixed bottom-4 right-4" onClick={dialogStore.toggle}>
						Compare Protocols ({compareProtocols.length})
					</ButtonDark>
					<Ariakit.Dialog className="dialog sm:max-w-[70vw]" unmountOnHide>
						<span className="flex items-center justify-center gap-1 w-full relative">
							<Ariakit.DialogHeading className="font-medium text-xl">Compare Protocols</Ariakit.DialogHeading>
							<Ariakit.DialogDismiss className="absolute right-0 top-0">
								<Icon name="x" height={16} width={16} />
								<span className="sr-only">Close dialog</span>
							</Ariakit.DialogDismiss>
						</span>
						<CompareProtocols protocols={compareProtocols.map(slug)} chain={chain} />
					</Ariakit.Dialog>
				</Ariakit.DialogProvider>
			)}
		</>
	)
}

const useProtocols = (protocols: string[], chain?: string) => {
	const { data, isLoading } = useQuery({
		queryKey: ['compare-protocols' + protocols?.join('')],
		queryFn: () => fetchApi(protocols?.map((p) => `${PROTOCOL_API}/${slug(p)}`)),
		staleTime: 60 * 60 * 1000
	})

	const [extraTvlEnabled] = useLocalStorageSettingsManager('tvl')
	const chartData = React.useMemo(() => {
		try {
			const formattedData =
				data?.map((x) => {
					const { historicalChainTvls } = fuseProtocolData(x)
					return {
						chain: x.name,
						globalChart: formatProtocolsTvlChartData({
							historicalChainTvls:
								chain && chain !== 'All' ? { [chain]: historicalChainTvls[chain] || {} } : historicalChainTvls,
							extraTvlEnabled
						}).filter((x) => +x[0] % 86400 === 0)
					}
				}) ?? []

			return formattedData
		} catch (e) {
			console.error(e)
			return []
		}
	}, [data, extraTvlEnabled])

	return { data, isLoading, chartData }
}

const CompareProtocols = ({ protocols, chain }: { protocols: string[]; chain: string }) => {
	const { isLoading, chartData } = useProtocols(protocols, chain)
	const [isDark] = useDarkModeManager()

	return (
		<>
			{chartData.length > 0 && !isLoading ? (
				<ChainChart datasets={chartData} title="" compareMode isThemeDark={isDark} showLegend />
			) : (
				<div className="flex items-center justify-center m-auto min-h-[360px]">
					<LocalLoader />
				</div>
			)}
		</>
	)
}

export function ProtocolList(props: IAllTokensPageProps) {
	return <Container {...props} />
}
