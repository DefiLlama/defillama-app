import { useMemo } from 'react'
import { useRouter } from 'next/router'
import Layout from '~/layout'
import { FormSubmitBtn } from '~/components'
import { RecentlyListedProtocolsTable } from '~/components/Table/Defi/Protocols'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { TVLRange } from '~/components/Filters/protocols/TVLRange'
import { HideForkedProtocols } from '~/components/Filters/protocols/HideForkedProtocols'
import { FiltersByChain } from '~/components/Filters/common/FiltersByChain'
import { useCalcStakePool2Tvl } from '~/hooks/data'
import { download, getPercentChange } from '~/utils'
import { ButtonLight } from '~/components/ButtonStyled'
import { useDialogState, Dialog } from 'ariakit/dialog'
import { useMutation } from '@tanstack/react-query'
import { airdropsEligibilityCheck } from './airdrops'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'

function getSelectedChainFilters(chainQueryParam, allChains) {
	if (chainQueryParam) {
		if (typeof chainQueryParam === 'string') {
			return chainQueryParam === 'All' ? [...allChains] : chainQueryParam === 'None' ? [] : [chainQueryParam]
		} else {
			return [...chainQueryParam]
		}
	} else return [...allChains]
}

interface IRecentProtocolProps {
	title: string
	name: string
	header: string
	protocols: any
	chainList: string[]
	forkedList?: { [name: string]: boolean }
	claimableAirdrops?: Array<{ name: string; page: string; title?: string }>
}

export function RecentProtocols({
	title,
	name,
	header,
	protocols,
	chainList,
	forkedList,
	claimableAirdrops
}: IRecentProtocolProps) {
	const { query } = useRouter()
	const { chain, hideForks, minTvl, maxTvl } = query

	const toHideForkedProtocols = hideForks && typeof hideForks === 'string' && hideForks === 'true' ? true : false

	const { selectedChains, data } = useMemo(() => {
		const selectedChains = getSelectedChainFilters(chain, chainList)

		const _chainsToSelect = selectedChains.map((t) => t.toLowerCase())

		const isValidTvlRange =
			(minTvl !== undefined && !Number.isNaN(Number(minTvl))) || (maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

		const data = protocols
			.filter((protocol) => {
				let toFilter = true

				// filter out protocols that are forks
				if (toHideForkedProtocols && forkedList) {
					toFilter = !forkedList[protocol.name]
				}

				let includesChain = false
				protocol.chains.forEach((chain) => {
					// filter if a protocol has at least of one selected chain
					if (!includesChain) {
						includesChain = _chainsToSelect.includes(chain.toLowerCase())
					}
				})

				toFilter = toFilter && includesChain

				return toFilter
			})
			.map((p) => {
				let tvl = 0
				let tvlPrevDay = null
				let tvlPrevWeek = null
				let tvlPrevMonth = null
				let extraTvl = {}

				p.chains.forEach((chainName) => {
					// return if chainsToSelect doesnot include chainName
					if (!_chainsToSelect.includes(chainName.toLowerCase())) {
						return
					}

					for (const sectionName in p.chainTvls) {
						const _sanitisedChainName = sectionName.startsWith(`${chainName}-`)
							? sectionName.split('-')[1]?.toLowerCase()
							: sectionName.toLowerCase()

						// add only if chainsToSelect includes sanitisedChainName and chainName equalt sanitisedChainName
						if (_chainsToSelect.includes(_sanitisedChainName) && chainName.toLowerCase() === _sanitisedChainName) {
							const _values = p.chainTvls[sectionName]

							// only add tvl values where chainName is strictly equal to sectionName, else check if its extraTvl and add
							if (sectionName.startsWith(`${chainName}-`)) {
								const sectionToAdd = sectionName.split('-')[1]
								extraTvl[sectionToAdd] = (extraTvl[sectionToAdd] || 0) + _values
							} else {
								if (_values.tvl) {
									tvl = (tvl || 0) + _values.tvl
								}
								if (_values.tvlPrevDay) {
									tvlPrevDay = (tvlPrevDay || 0) + _values.tvlPrevDay
								}
								if (_values.tvlPrevWeek) {
									tvlPrevWeek = (tvlPrevWeek || 0) + _values.tvlPrevWeek
								}
								if (_values.tvlPrevMonth) {
									tvlPrevMonth = (tvlPrevMonth || 0) + _values.tvlPrevMonth
								}
							}
						}
					}
				})

				return {
					...p,
					tvl,
					tvlPrevDay,
					tvlPrevWeek,
					tvlPrevMonth,
					change_1d: getPercentChange(tvl, tvlPrevDay),
					change_7d: getPercentChange(tvl, tvlPrevWeek),
					change_1m: getPercentChange(tvl, tvlPrevMonth),
					listedAt: p.listedAt
				}
			})

		if (isValidTvlRange) {
			const filteredProtocols = data.filter(
				(protocol) => (minTvl ? protocol.tvl >= minTvl : true) && (maxTvl ? protocol.tvl <= maxTvl : true)
			)

			return { data: filteredProtocols, selectedChains }
		}

		return { data, selectedChains }
	}, [protocols, chain, chainList, forkedList, toHideForkedProtocols, minTvl, maxTvl])

	const protocolsData = useCalcStakePool2Tvl(data)
	const downloadCSV = () => {
		const headers = ['Name', 'Chain', 'TVL', 'Change 1d', 'Change 7d', 'Change 1m', 'Listed At']
		const csvData = protocolsData.map((row) => {
			return {
				Name: row.name,
				Chain: row.chains.join(', '),
				TVL: row.tvl,
				'Change 1d': row.change_1d,
				'Change 7d': row.change_7d,
				'Change 1m': row.change_1m,
				'Listed At': new Date(row.listedAt * 1000).toLocaleDateString()
			}
		})
		download(
			'protocols.csv',
			[headers, ...csvData.map((row) => headers.map((header) => row[header]).join(','))].join('\n')
		)
	}

	const { pathname } = useRouter()

	const airdropCheckerDialog = useDialogState()

	const {
		data: eligibleAirdrops,
		mutate: checkEligibleAirdrops,
		isLoading: fetchingEligibleAirdrops,
		error: errorFetchingEligibleAirdrops,
		reset: resetEligibilityCheck
	} = useMutation({ mutationFn: airdropsEligibilityCheck })

	return (
		<Layout title={title} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: name }} />

			{claimableAirdrops ? (
				<span className="flex items-center gap-2 flex-wrap">
					{claimableAirdrops.map((protocol) => (
						<ButtonLight
							as="a"
							href={protocol.page}
							target="_blank"
							rel="noreferrer noopener"
							key={`claim-${protocol.page}`}
							color="#008000"
							style={{ '--btn2-text': '#00ab00' }}
						>
							<span>{protocol.name}</span>
							<Icon name="arrow-up-right" height={14} width={14} />
						</ButtonLight>
					))}
					<ButtonLight
						onClick={() => {
							resetEligibilityCheck()
							airdropCheckerDialog.toggle()
						}}
					>
						Check airdrops for address
					</ButtonLight>
					{airdropCheckerDialog.mounted ? (
						<Dialog state={airdropCheckerDialog} className="dialog">
							<button
								onClick={() => {
									resetEligibilityCheck()
									airdropCheckerDialog.toggle()
								}}
								className="-mb-6 ml-auto"
							>
								<Icon name="x" height={20} width={20} />
							</button>
							{eligibleAirdrops ? (
								eligibleAirdrops.length === 0 ? (
									<p className="text-red-500 text-center">No airdrops detected for this address</p>
								) : (
									<div className="isolate relative w-full overflow-auto">
										{eligibleAirdrops.map((address) => (
											<table key={`airdrop of ${address[0]}`} className="border-collapse w-full mt-4 first:mt-0">
												<thead>
													<tr>
														<th
															colSpan={2}
															className="p-2 font-semibold text-center whitespace-nowrap border border-black/10 dark:border-white/10"
														>
															{address[0]}
														</th>
													</tr>
													<tr>
														<th className="p-2 font-semibold text-center whitespace-nowrap border border-black/10 dark:border-white/10">
															Protocol Name
														</th>
														<th className="p-2 font-semibold text-center whitespace-nowrap border border-black/10 dark:border-white/10">
															Token Amount
														</th>
													</tr>
												</thead>
												<tbody>
													{address[1].length === 0 ? (
														<tr>
															<td
																colSpan={2}
																className="p-2 font-normal text-center whitespace-nowrap border border-black/10 dark:border-white/10"
															>
																<p className="text-red-500 text-center">No airdrops detected for this address</p>
															</td>
														</tr>
													) : (
														address[1].map((airdrop) => (
															<tr key={`${airdrop.name}:${airdrop.claimableAmount}`}>
																<th className="p-2 font-normal text-center whitespace-nowrap border border-black/10 dark:border-white/10">
																	{airdrop.name}
																</th>
																<td className="p-2 font-normal text-center whitespace-nowrap border border-black/10 dark:border-white/10">
																	{airdrop.isActive ? (
																		<span className="flex items-center justify-center gap-2">
																			<span>{`${airdrop.claimableAmount} ${airdrop.tokenSymbol ?? ''}`}</span>
																			{airdrop.page ? (
																				<ButtonLight
																					as="a"
																					href={airdrop.page}
																					target="_blank"
																					rel="noreferrer noopener"
																					key={`claim-${airdrop.page}`}
																					className="flex items-center justify-center"
																					color="#008000"
																					style={{ padding: '2px 6px', fontSize: '12px', '--btn2-text': '#00ab00' }}
																				>
																					<span>Claim</span>
																					<Icon name="arrow-up-right" height={14} width={14} />
																				</ButtonLight>
																			) : null}
																		</span>
																	) : (
																		<span className="opacity-70">
																			{`${airdrop.claimableAmount} ${airdrop.tokenSymbol ?? ''}`} - Claim Ended
																		</span>
																	)}
																</td>
															</tr>
														))
													)}
												</tbody>
											</table>
										))}
									</div>
								)
							) : (
								<form
									onSubmit={(e) => {
										e.preventDefault()
										const form = e.target as HTMLFormElement
										checkEligibleAirdrops({
											addresses: form.address.value
												.split('\n')
												.join(',')
												.split(',')
												.map((x) => x.trim())
												.filter((x) => x.length > 0)
										})
									}}
									className="flex flex-col gap-2 p-3 sm:p-0"
								>
									<label className="flex flex-col gap-1">
										<span>Provide EVM / SOL address(s) to check airdrops for:</span>
										<textarea
											name="address"
											required
											disabled={fetchingEligibleAirdrops}
											placeholder="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045, 0x71a15Ac12ee91BF7c83D08506f3a3588143898B5"
											className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50"
										/>
									</label>

									<FormSubmitBtn name="submit-btn" disabled={fetchingEligibleAirdrops}>
										{fetchingEligibleAirdrops ? 'Checking...' : 'Check'}
									</FormSubmitBtn>
									{errorFetchingEligibleAirdrops ? (
										<p className="text-red-500 text-center">
											{(errorFetchingEligibleAirdrops as any)?.message ?? 'Failed to fetch'}
										</p>
									) : null}
								</form>
							)}
						</Dialog>
					) : null}
				</span>
			) : null}

			<div className="flex items-center flex-wrap gap-2 -mb-5">
				<h1 className="text-2xl font-medium mr-auto">{header}</h1>

				<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} />
				<TVLRange />
				<CSVDownloadButton onClick={downloadCSV} isLight style={{ color: 'inherit', fontWeight: 'normal' }} />

				{forkedList && <HideForkedProtocols />}
			</div>

			{protocolsData.length > 0 ? (
				<RecentlyListedProtocolsTable data={protocolsData} />
			) : (
				<p className="border border-black/10 dark:border-white/10 p-5 rounded-md text-center">
					Couldn't find any protocols for these filters
				</p>
			)}
		</Layout>
	)
}
