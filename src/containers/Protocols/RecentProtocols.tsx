import * as Ariakit from '@ariakit/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { Icon } from '~/components/Icon'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { toNumberOrNullFromQueryParam } from '~/utils'
import { airdropsEligibilityCheck } from './airdrops'
import { RecentlyListedProtocolsTable } from './RecentProtocolsTable'
import type { IRecentProtocol, IRecentProtocolsPageData } from './types'
import { applyExtraTvl, getSelectedChainFilters, parseExcludeParam } from './utils'

export function RecentProtocols({ protocols, chainList, forkedList, claimableAirdrops }: IRecentProtocolsPageData) {
	const router = useRouter()
	const { chain, excludeChain, hideForks, minTvl: minTvlQuery, maxTvl: maxTvlQuery, ...queries } = router.query

	const minTvl = toNumberOrNullFromQueryParam(minTvlQuery)
	const maxTvl = toNumberOrNullFromQueryParam(maxTvlQuery)

	const toHideForkedProtocols = hideForks === 'true'

	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const { selectedChains, data } = useMemo(() => {
		const excludeSet = parseExcludeParam(excludeChain)
		let selectedChains = getSelectedChainFilters(chain, chainList)
		selectedChains = excludeSet.size > 0 ? selectedChains.filter((c) => !excludeSet.has(c)) : selectedChains

		const chainsToSelectSet = new Set(selectedChains.map((t) => t.toLowerCase()))

		// TVL range should work with min-only, max-only, or both.
		const isValidTvlRange = minTvl != null || maxTvl != null

		const filteredProtocols: IRecentProtocol[] = []

		for (const protocol of protocols) {
			// filter out forked protocols
			if (toHideForkedProtocols && forkedList?.[protocol.name]) continue

			// filter if a protocol has at least one selected chain
			let includesChain = false
			for (const c of protocol.chains) {
				if (chainsToSelectSet.has(c.toLowerCase())) {
					includesChain = true
					break
				}
			}
			if (!includesChain) continue

			// Recalculate TVLs scoped to selected chains
			let tvl = 0
			let tvlPrevDay: number | null = null
			let tvlPrevWeek: number | null = null
			let tvlPrevMonth: number | null = null
			const extraTvl: Record<
				string,
				{ tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }
			> = {}

			for (const chainName of protocol.chains) {
				if (!chainsToSelectSet.has(chainName.toLowerCase())) continue

				for (const sectionName in protocol.chainTvls) {
					const sanitisedChainName = sectionName.startsWith(`${chainName}-`)
						? sectionName.split('-')[1]?.toLowerCase()
						: sectionName.toLowerCase()

					if (chainsToSelectSet.has(sanitisedChainName ?? '') && chainName.toLowerCase() === sanitisedChainName) {
						const values = protocol.chainTvls[sectionName]

						if (sectionName.startsWith(`${chainName}-`)) {
							const sectionToAdd = sectionName.split('-')[1]
							if (sectionToAdd) {
								if (!extraTvl[sectionToAdd]) {
									extraTvl[sectionToAdd] = { tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0 }
								}
								extraTvl[sectionToAdd].tvl += values.tvl ?? 0
								extraTvl[sectionToAdd].tvlPrevDay += values.tvlPrevDay ?? 0
								extraTvl[sectionToAdd].tvlPrevWeek += values.tvlPrevWeek ?? 0
								extraTvl[sectionToAdd].tvlPrevMonth += values.tvlPrevMonth ?? 0
							}
						} else {
							if (values.tvl) {
								tvl = (tvl ?? 0) + values.tvl
							}
							if (values.tvlPrevDay) {
								tvlPrevDay = (tvlPrevDay ?? 0) + values.tvlPrevDay
							}
							if (values.tvlPrevWeek) {
								tvlPrevWeek = (tvlPrevWeek ?? 0) + values.tvlPrevWeek
							}
							if (values.tvlPrevMonth) {
								tvlPrevMonth = (tvlPrevMonth ?? 0) + values.tvlPrevMonth
							}
						}
					}
				}
			}

			filteredProtocols.push({
				...protocol,
				tvl,
				tvlPrevDay,
				tvlPrevWeek,
				tvlPrevMonth,
				extraTvl
			})
		}

		// Apply extraTvl toggles (staking/pool2/borrowed)
		const withExtraTvl = applyExtraTvl(filteredProtocols, extraTvlsEnabled)

		if (isValidTvlRange) {
			const rangeFiltered = withExtraTvl.filter(
				(p) => (minTvl != null ? p.tvl >= minTvl : true) && (maxTvl != null ? p.tvl <= maxTvl : true)
			)
			return { data: rangeFiltered, selectedChains }
		}

		return { data: withExtraTvl, selectedChains }
	}, [protocols, chain, excludeChain, chainList, forkedList, toHideForkedProtocols, minTvl, maxTvl, extraTvlsEnabled])

	const {
		data: eligibleAirdrops,
		mutate: checkEligibleAirdrops,
		isPending: fetchingEligibleAirdrops,
		error: errorFetchingEligibleAirdrops,
		reset: resetEligibilityCheck
	} = useMutation({ mutationFn: airdropsEligibilityCheck })

	const airdropCheckerDialog = Ariakit.useDialogStore()

	return (
		<>
			{claimableAirdrops ? (
				<span className="flex flex-wrap items-center gap-2">
					{claimableAirdrops.map((protocol) => (
						<a
							href={protocol.page}
							target="_blank"
							rel="noreferrer noopener"
							key={`claim-${protocol.name}`}
							color="#008000"
							className="flex items-center gap-1 rounded-md bg-[#e4efe2] px-2.5 py-1 text-sm font-medium whitespace-nowrap text-[#007c00] dark:bg-[#18221d] dark:text-[#00ab00]"
						>
							<span>{protocol.name}</span>
							<Icon name="arrow-up-right" height={14} width={14} />
						</a>
					))}
					<button
						onClick={() => {
							resetEligibilityCheck()
							airdropCheckerDialog.toggle()
						}}
						className="flex items-center gap-1 rounded-md bg-(--link-button) px-2.5 py-1 text-sm font-medium whitespace-nowrap dark:bg-(--link-hover-bg)"
					>
						Check airdrops for address
					</button>

					<Ariakit.Dialog store={airdropCheckerDialog} className="dialog">
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
								<p className="text-center text-red-500">No airdrops detected for this address</p>
							) : (
								<div className="relative isolate w-full overflow-auto">
									{eligibleAirdrops.map((address) => (
										<table key={`airdrop of ${address[0]}`} className="mt-4 w-full border-collapse first:mt-0">
											<thead>
												<tr>
													<th
														colSpan={2}
														className="border border-(--form-control-border) p-2 text-center font-semibold whitespace-nowrap"
													>
														{address[0]}
													</th>
												</tr>
												<tr>
													<th className="border border-(--form-control-border) p-2 text-center font-semibold whitespace-nowrap">
														Protocol Name
													</th>
													<th className="border border-(--form-control-border) p-2 text-center font-semibold whitespace-nowrap">
														Token Amount
													</th>
												</tr>
											</thead>
											<tbody>
												{address[1].length === 0 ? (
													<tr>
														<td
															colSpan={2}
															className="border border-(--form-control-border) p-2 text-center font-normal whitespace-nowrap"
														>
															<p className="text-center text-red-500">No airdrops detected for this address</p>
														</td>
													</tr>
												) : (
													address[1].map((airdrop) => (
														<tr key={`${airdrop.name}:${airdrop.claimableAmount}`}>
															<th className="border border-(--form-control-border) p-2 text-center font-normal whitespace-nowrap">
																{airdrop.name}
															</th>
															<td className="border border-(--form-control-border) p-2 text-center font-normal whitespace-nowrap">
																{airdrop.isActive ? (
																	<span className="flex items-center justify-center gap-2">
																		<span>{`${airdrop.claimableAmount} ${airdrop.tokenSymbol ?? ''}`}</span>
																		{airdrop.page ? (
																			<a
																				href={airdrop.page}
																				target="_blank"
																				rel="noopener noreferrer"
																				key={`can-claim-${airdrop.name}`}
																				className="shrink-0 rounded-md bg-(--link-button) px-1.5 py-0.5 hover:bg-(--link-button-hover)"
																			>
																				<Icon name="arrow-up-right" height={14} width={14} />
																				<span className="sr-only">open in new tab</span>
																			</a>
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
									const textarea = form.namedItem('address') as HTMLTextAreaElement
									checkEligibleAirdrops({
										addresses: textarea.value
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
										className="rounded-md border border-(--form-control-border) bg-white p-2 text-black disabled:opacity-50 dark:bg-black dark:text-white"
									/>
								</label>
								<button
									name="submit-btn"
									disabled={fetchingEligibleAirdrops}
									className="mt-3 rounded-md bg-(--link-active-bg) p-3 text-white disabled:opacity-50"
								>
									{fetchingEligibleAirdrops ? 'Checking...' : 'Check'}
								</button>
								{errorFetchingEligibleAirdrops ? (
									<p className="text-center text-red-500">
										{errorFetchingEligibleAirdrops instanceof Error
											? errorFetchingEligibleAirdrops.message
											: 'Failed to fetch'}
									</p>
								) : null}
							</form>
						)}
					</Ariakit.Dialog>
				</span>
			) : null}

			<RecentlyListedProtocolsTable
				data={data}
				queries={queries}
				selectedChains={selectedChains}
				chainList={chainList}
				forkedList={forkedList}
			/>
		</>
	)
}
