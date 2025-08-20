import * as React from 'react'
import Layout from '~/layout'
import { FormattedName } from '~/components/FormattedName'
import { TokenLogo } from '~/components/TokenLogo'
import { SEO } from '~/components/SEO'
import { QuestionHelper } from '~/components/QuestionHelper'
import { useCalcGroupExtraPeggedByDay, useCalcCirculating, useGroupBridgeData } from '~/hooks/data/stablecoins'
import { UNRELEASED, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import {
	capitalizeFirstLetter,
	toNiceCsvDate,
	formattedNum,
	download,
	getBlockExplorer,
	peggedAssetIconUrl,
	preparePieChartData
} from '~/utils'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { PeggedAssetByChainTable } from './Table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'
import { buildStablecoinChartData } from '~/containers/Stablecoins/utils'
import { Tooltip } from '~/components/Tooltip'
import { Menu } from '~/components/Menu'
import { TagGroup } from '~/components/TagGroup'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const risksHelperTexts = {
	algorithmic:
		'Algorithmic assets have their pegs maintained by mechanisms that influence supply and demand. They may be partially collateralized or over-collateralized, but usually do not have a redemption mechanism for their reserve assets. Risks of algorithmic assets include smart contract risk, price collapse due to bank run or other mechanism failure, and de-pegging.',
	'fiat-backed':
		'Fiat-backed assets are backed 1:1 by a reserve of fiat assets controlled by the issuer. Risks of fiat-backed assets include counterparty risk against the issuer, asset freezing and regulations, and risk of insufficient backing.',
	'crypto-backed':
		'Crypto-backed assets are backed by cryptoassets locked in a smart contract as collateral. Risks of crypto-backed assets include smart contract risk, collateral volatility and liquidation, and de-pegging.'
}

export default function PeggedContainer(props) {
	let { name } = props.peggedAssetData

	return (
		<Layout title={`${name}: Circulating and stats - DefiLlama`}>
			<SEO
				stablePage={true}
				cardName={name}
				token={name}
				logo={props.logo}
				tvl={formattedNum(props.mcap, true)?.toString()}
			/>
			<PeggedAssetInfo {...props} />
		</Layout>
	)
}

const totalChartTooltipLabel = ['Circulating']

export const PeggedAssetInfo = ({
	chainsUnique,
	chainCirculatings,
	peggedAssetData,
	totalCirculating,
	unreleased,
	mcap,
	bridgeInfo,
	backgroundColor
}) => {
	let {
		name,
		onCoinGecko,
		gecko_id,
		symbol,
		description,
		mintRedeemDescription,
		address,
		url,
		pegMechanism,
		twitter,
		auditLinks,
		price
	} = peggedAssetData
	const logo = peggedAssetIconUrl(name)

	const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

	const [chartType, setChartType] = React.useState('Pie')
	const defaultSelectedId = 'default-selected-tab'

	const chainsData: any[] = chainsUnique.map((elem: string) => {
		return peggedAssetData.chainBalances[elem].tokens
	})

	const { peggedAreaChartData, peggedAreaTotalData, stackedDataset } = React.useMemo(
		() =>
			buildStablecoinChartData({
				chartDataByAssetOrChain: chainsData,
				assetsOrChainsList: chainsUnique,
				filteredIndexes: [...Array(chainsUnique.length).keys()],
				issuanceType: 'circulating',
				selectedChain: undefined,
				totalChartTooltipLabel: totalChartTooltipLabel[0]
			}),
		[chainsData, chainsUnique]
	)

	const extraPeggeds = [UNRELEASED]
	const [extraPeggedsEnabled, updater] = useLocalStorageSettingsManager('stablecoins')

	const chainTotals = useCalcCirculating(chainCirculatings)

	const chainsCirculatingValues = React.useMemo(() => {
		return preparePieChartData({ data: chainTotals, sliceIdentifier: 'name', sliceValue: 'circulating', limit: 10 })
	}, [chainTotals])

	const { data: stackedData, dataWithExtraPeggedAndDominanceByDay } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const groupedChains = useGroupBridgeData(chainTotals, bridgeInfo)

	const downloadCsv = () => {
		const rows = [['Timestamp', 'Date', ...chainsUnique, 'Total']]
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([
					day.date,
					toNiceCsvDate(day.date),
					...chainsUnique.map((chain) => day[chain] ?? ''),
					chainsUnique.reduce((acc, curr) => {
						return (acc += day[curr] ?? 0)
					}, 0)
				])
			})
		download('stablecoinsChains.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1">
					<Ariakit.TabProvider defaultSelectedId={defaultSelectedId}>
						<Ariakit.TabList aria-label="Pegged Tabs" className="flex">
							<Ariakit.Tab
								className="flex-1 rounded-tl-md border-b border-(--bg-border) px-6 py-2 whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg) aria-selected:border-b-(--primary)"
								id={defaultSelectedId}
							>
								Stats
							</Ariakit.Tab>
							<Ariakit.Tab className="flex-1 border-b border-l border-(--bg-border) px-6 py-2 whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg) aria-selected:border-b-(--primary)">
								Info
							</Ariakit.Tab>
							<Ariakit.Tab className="flex-1 rounded-tr-xl border-b border-l border-(--bg-border) px-6 py-2 whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg) aria-selected:border-b-(--primary) xl:rounded-none">
								Links
							</Ariakit.Tab>
						</Ariakit.TabList>

						<Ariakit.TabPanel tabId={defaultSelectedId}>
							<div className="flex flex-col gap-6 overflow-x-auto p-5">
								<h1 className="flex items-center gap-2 text-xl">
									<TokenLogo logo={logo} size={24} />
									<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
									<span className="mr-auto font-normal">{symbol && symbol !== '-' ? `(${symbol})` : ''}</span>
									{peggedAssetData.deprecated ? (
										<span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
											<Tooltip
												content="Deprecated"
												className="flex h-3 w-3 items-center justify-center rounded-full bg-red-600 text-[10px] text-white dark:bg-red-400"
											>
												!
											</Tooltip>
											<span>Deprecated</span>
										</span>
									) : null}
								</h1>

								<p className="flex flex-col gap-1">
									<span className="text-base text-(--text-label)">Market Cap</span>
									<span className="font-jetbrains min-h-8 text-2xl font-semibold">
										{formattedNum(mcap || '0', true)}
									</span>
								</p>

								<p className="flex flex-wrap items-center justify-between gap-2 text-base">
									<span className="text-(--text-label)">Price</span>
									<span className="font-jetbrains">{price === null ? '-' : formattedNum(price, true)}</span>
								</p>

								{totalCirculating && (
									<table className="w-full border-collapse text-base">
										<caption className="pb-1 text-left text-xs text-(--text-label)">Issuance Stats</caption>
										<tbody>
											<tr>
												<th className="text-left font-normal text-(--text-label)">Total Circulating</th>
												<td className="font-jetbrains text-right">{formattedNum(totalCirculating)}</td>
											</tr>
										</tbody>
									</table>
								)}

								{extraPeggeds.length > 0 && (
									<table className="w-full border-collapse text-base">
										<caption className="flex flex-wrap items-center gap-1 pb-1 text-left text-xs text-(--text-label)">
											<span>Optional Circulating Counts</span>
											<QuestionHelper text="Use this option to choose whether to include coins that have been minted but have never been circulating." />
										</caption>
										<tbody>
											{extraPeggeds.map((option) => (
												<tr key={option}>
													<th className="text-left font-normal text-(--text-label)">
														<label className="flex cursor-pointer items-center gap-2">
															<input
																type="checkbox"
																value={option}
																checked={extraPeggedsEnabled[option]}
																onChange={() => updater(option)}
															/>
															<span style={{ opacity: extraPeggedsEnabled[option] ? 1 : 0.7 }}>
																{capitalizeFirstLetter(option)}
															</span>
														</label>
													</th>
													<td className="font-jetbrains text-right">{formattedNum(unreleased)}</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
								<CSVDownloadButton
									onClick={downloadCsv}
									smol
									className="mt-auto mr-auto h-[30px] border border-(--form-control-border) bg-transparent! text-(--text-form)! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)!"
								/>
							</div>
						</Ariakit.TabPanel>

						<Ariakit.TabPanel>
							<div className="flex flex-col gap-6 overflow-auto p-5">
								{description && (
									<p className="flex flex-col gap-2">
										<span className="font-medium">Description</span>
										<span>{description}</span>
									</p>
								)}

								{pegMechanism && (
									<p className="flex items-center gap-2">
										<span className="font-medium">Category</span>
										<span>:</span>
										<span>{pegMechanism}</span>
										<QuestionHelper text={risksHelperTexts[pegMechanism]} />
									</p>
								)}

								{mintRedeemDescription && (
									<p className="flex flex-col gap-2">
										<span className="font-medium">Minting and Redemption</span>
										<span>{mintRedeemDescription}</span>
									</p>
								)}
								<p className="flex items-center gap-1">
									<span className="flex flex-nowrap items-center gap-1">
										<span>Audits</span>
										<QuestionHelper text="Audits are not a security guarantee" />
										<span>:</span>
									</span>
									{pegMechanism === 'fiat-backed' && auditLinks?.length > 0 ? (
										<Menu
											name="Yes"
											options={auditLinks}
											isExternal
											className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
										/>
									) : (
										<span>No</span>
									)}
								</p>
							</div>
						</Ariakit.TabPanel>

						<Ariakit.TabPanel>
							<div className="flex flex-wrap items-center gap-6 overflow-auto p-5">
								{blockExplorerLink !== undefined && (
									<span>
										<a
											href={blockExplorerLink}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
										>
											<span>View on {blockExplorerName}</span> <Icon name="arrow-up-right" height={14} width={14} />
										</a>
									</span>
								)}

								{url && (
									<span>
										<a
											href={url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
										>
											<span>Website</span>
											<Icon name="arrow-up-right" height={14} width={14} />
										</a>
									</span>
								)}

								{twitter && (
									<span>
										<a
											href={twitter}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
										>
											<span>Twitter</span>
											<Icon name="arrow-up-right" height={14} width={14} />
										</a>
									</span>
								)}

								{onCoinGecko === 'true' && (
									<span>
										<a
											href={`https://www.coingecko.com/en/coins/${gecko_id}`}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
										>
											<span>CoinGecko</span>
											<Icon name="arrow-up-right" height={14} width={14} />
										</a>
									</span>
								)}

								<a
									href={`https://github.com/DefiLlama/peggedassets-server/tree/master/src/adapters/peggedAssets/${gecko_id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
								>
									<span>Check the code</span>
									<Icon name="arrow-up-right" height={14} width={14} />
								</a>
							</div>
						</Ariakit.TabPanel>
					</Ariakit.TabProvider>
				</div>

				<div className="col-span-2 flex min-h-[416px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<TagGroup
						setValue={setChartType}
						selectedValue={chartType}
						values={['Total Circ', 'Pie', 'Dominance', 'Area']}
						className="m-2 max-sm:w-full"
						triggerClassName="inline-flex max-sm:flex-1 items-center justify-center whitespace-nowrap"
					/>

					{chartType === 'Total Circ' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title={`Total ${symbol} Circulating`}
								chartData={peggedAreaTotalData}
								stacks={totalChartTooltipLabel}
								color={backgroundColor}
								hideDefaultLegend={true}
							/>
						</React.Suspense>
					)}
					{chartType === 'Area' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title=""
								chartData={peggedAreaChartData}
								stacks={chainsUnique}
								valueSymbol="$"
								hideDefaultLegend={true}
							/>
						</React.Suspense>
					)}
					{chartType === 'Dominance' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title=""
								valueSymbol="%"
								chartData={dataWithExtraPeggedAndDominanceByDay}
								stacks={chainsUnique}
								hideDefaultLegend={true}
							/>
						</React.Suspense>
					)}
					{chartType === 'Pie' && (
						<React.Suspense fallback={<></>}>
							<PieChart chartData={chainsCirculatingValues} />
						</React.Suspense>
					)}
				</div>
			</div>

			<PeggedAssetByChainTable data={groupedChains} />
		</>
	)
}
