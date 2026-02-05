import { useRouter } from 'next/router'
import { useMemo } from 'react'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { CHART_COLORS } from '~/constants/colors'
import { toYearMonth } from '~/utils'

// Helper to parse exclude query param to Set
const parseExcludeParam = (param: string | string[] | undefined): Set<string> => {
	if (!param) return new Set()
	if (typeof param === 'string') return new Set([param])
	return new Set(param)
}

export function useRaisesData({ raises, investors, rounds, sectors, chains }) {
	const { query } = useRouter()

	const {
		investor,
		excludeInvestor,
		round,
		excludeRound,
		sector,
		excludeSector,
		chain,
		excludeChain,
		minRaised,
		maxRaised
	} = query

	const data = useMemo(() => {
		// Parse exclude sets upfront
		// Note: For investors and chains, we need separate exclude sets because we're checking
		// "exclude if ANY item in array matches", which can't be combined with the selection logic
		const excludeInvestorsSet = parseExcludeParam(excludeInvestor)
		const excludeChainsSet = parseExcludeParam(excludeChain)
		const excludeRoundsSet = parseExcludeParam(excludeRound)
		const excludeSectorsSet = parseExcludeParam(excludeSector)

		// Build selectedInvestors
		let selectedInvestors: string[]
		if (investor) {
			if (typeof investor === 'string') {
				selectedInvestors = investor === 'All' ? [...investors] : investor === 'None' ? [] : [investor]
			} else {
				selectedInvestors = [...investor]
			}
		} else {
			selectedInvestors = [...investors]
		}
		// Filter out excludes from selectedInvestors
		selectedInvestors =
			excludeInvestorsSet.size > 0 ? selectedInvestors.filter((i) => !excludeInvestorsSet.has(i)) : selectedInvestors

		// Build selectedRounds and filter out excludes inline
		let selectedRounds: string[]
		if (round) {
			if (typeof round === 'string') {
				selectedRounds = round === 'All' ? [...rounds] : round === 'None' ? [] : [round]
			} else {
				selectedRounds = [...round]
			}
		} else {
			selectedRounds = [...rounds]
		}
		selectedRounds = excludeRoundsSet.size > 0 ? selectedRounds.filter((r) => !excludeRoundsSet.has(r)) : selectedRounds

		// Build selectedSectors and filter out excludes inline
		let selectedSectors: string[]
		if (sector) {
			if (typeof sector === 'string') {
				selectedSectors = sector === 'All' ? [...sectors] : sector === 'None' ? [] : [sector]
			} else {
				selectedSectors = [...sector]
			}
		} else {
			selectedSectors = [...sectors]
		}
		selectedSectors =
			excludeSectorsSet.size > 0 ? selectedSectors.filter((s) => !excludeSectorsSet.has(s)) : selectedSectors

		// Build selectedChains
		let selectedChains: string[]
		if (chain) {
			if (typeof chain === 'string') {
				selectedChains = chain === 'All' ? [...chains] : chain === 'None' ? [] : [chain]
			} else {
				selectedChains = [...chain]
			}
		} else {
			selectedChains = [...chains]
		}
		// Filter out excludes from selectedChains
		selectedChains = excludeChainsSet.size > 0 ? selectedChains.filter((c) => !excludeChainsSet.has(c)) : selectedChains

		const raisesByCategory: { [category: string]: number } = {}
		const fundingRoundsByMonth = {}
		const monthlyInvestment = {}
		const investmentByRounds: { [round: string]: number } = {}

		const minimumAmountRaised =
			typeof minRaised === 'string' && !Number.isNaN(Number(minRaised)) ? Number(minRaised) : 0

		const maximumAmountRaised =
			typeof maxRaised === 'string' && !Number.isNaN(Number(maxRaised)) ? Number(maxRaised) : 0

		const isValidTvlRange = !!minimumAmountRaised || !!maximumAmountRaised

		const isInvestorFilterActive = selectedInvestors.length !== investors.length
		const isChainsFilterActive = selectedChains.length !== chains.length
		const isRoundsFilterActive = selectedRounds.length !== rounds.length
		const isSectorsFilterActive = selectedSectors.length !== sectors.length

		const selectedInvestorsSet = isInvestorFilterActive ? new Set(selectedInvestors) : null
		const selectedChainsSet = isChainsFilterActive ? new Set(selectedChains) : null
		const selectedRoundsSet = isRoundsFilterActive ? new Set(selectedRounds) : null
		const selectedSectorsSet = isSectorsFilterActive ? new Set(selectedSectors) : null

		const filteredRaisesList = raises.filter((raise) => {
			if (isInvestorFilterActive) {
				if (raise.leadInvestors.length === 0 && raise.otherInvestors.length === 0) {
					return false
				}

				let isAnInvestor = false

				for (const lead of raise.leadInvestors) {
					if (selectedInvestorsSet!.has(lead)) {
						isAnInvestor = true
						break
					}
				}

				if (!isAnInvestor) {
					for (const otherInv of raise.otherInvestors) {
						if (selectedInvestorsSet!.has(otherInv)) {
							isAnInvestor = true
							break
						}
					}
				}

				if (!isAnInvestor) {
					return false
				}
			}

			if (isChainsFilterActive) {
				if (raise.chains.length === 0) {
					return false
				}

				let raiseIncludesChain = false

				for (const chain of raise.chains) {
					if (selectedChainsSet!.has(chain)) {
						raiseIncludesChain = true
						break
					}
				}

				if (!raiseIncludesChain) {
					return false
				}
			}

			// selectedRoundsSet already has excludes filtered out
			if (isRoundsFilterActive) {
				if (!raise.round || raise.round === '') {
					return false
				} else {
					if (!selectedRoundsSet!.has(raise.round)) {
						return false
					}
				}
			}

			// selectedSectorsSet already has excludes filtered out
			if (isSectorsFilterActive) {
				if (!raise.category || raise.category === '') {
					return false
				} else {
					if (!selectedSectorsSet!.has(raise.category)) {
						return false
					}
				}
			}

			const raisedAmount = raise.amount ? Number(raise.amount) * 1_000_000 : 0

			const isInRange =
				(minimumAmountRaised ? raisedAmount >= minimumAmountRaised : true) &&
				(maximumAmountRaised ? raisedAmount <= maximumAmountRaised : true)

			if (isValidTvlRange && !isInRange) {
				return false
			}

			if (raise.category) {
				raisesByCategory[raise.category] = (raisesByCategory[raise.category] || 0) + 1
			}

			return true
		})

		for (const r of filteredRaisesList) {
			// split EOS raised amount between 13 months
			if (r.name === 'EOS') {
				for (let month = 0; month < 13; month++) {
					const date = toYearMonth(r.date - month * 2_529_746)
					monthlyInvestment[date] = (monthlyInvestment[date] ?? 0) + (r.amount ?? 0) / 13
					fundingRoundsByMonth[date] = (fundingRoundsByMonth[date] ?? 0) + 1
				}
			} else {
				const monthlyDate = toYearMonth(r.date)

				monthlyInvestment[monthlyDate] = (monthlyInvestment[monthlyDate] ?? 0) + (r.amount ?? 0)
				fundingRoundsByMonth[monthlyDate] = (fundingRoundsByMonth[monthlyDate] ?? 0) + 1
			}

			if (r.round) {
				investmentByRounds[r.round] = (investmentByRounds[r.round] ?? 0) + 1
			}
		}

		const finalMonthlyInvestment = []
		const finalRaisesByCategory = []
		const finalInvestmentByRounds = []
		const finalFundingRoundsByMonth = []
		let totalAmountRaised = 0

		for (const date in monthlyInvestment) {
			finalMonthlyInvestment.push([new Date(date).getTime(), monthlyInvestment[date] * 1e6])
			totalAmountRaised += monthlyInvestment[date] * 1e6
		}
		for (const category in raisesByCategory) {
			finalRaisesByCategory.push({ name: category, value: raisesByCategory[category] })
		}
		for (const round in investmentByRounds) {
			finalInvestmentByRounds.push({ name: round, value: investmentByRounds[round] })
		}
		for (const date in fundingRoundsByMonth) {
			finalFundingRoundsByMonth.push([new Date(date).getTime(), fundingRoundsByMonth[date]])
		}

		const monthlyInvestmentChart: { dataset: MultiSeriesChart2Dataset; charts: IMultiSeriesChart2Props['charts'] } = {
			dataset: {
				source: finalMonthlyInvestment.map(([timestamp, value]) => ({ timestamp, 'Funding Amount': value })),
				dimensions: ['timestamp', 'Funding Amount']
			},
			charts: [
				{
					type: 'bar' as const,
					name: 'Funding Amount',
					encode: { x: 'timestamp', y: 'Funding Amount' },
					color: CHART_COLORS[0],
					stack: 'Funding Amount'
				}
			]
		}

		const fundingRoundsByMonthChart: { dataset: MultiSeriesChart2Dataset; charts: IMultiSeriesChart2Props['charts'] } =
			{
				dataset: {
					source: finalFundingRoundsByMonth.map(([timestamp, value]) => ({ timestamp, 'Funding Rounds': value })),
					dimensions: ['timestamp', 'Funding Rounds']
				},
				charts: [
					{
						type: 'bar' as const,
						name: 'Funding Rounds',
						encode: { x: 'timestamp', y: 'Funding Rounds' },
						color: CHART_COLORS[0],
						stack: 'Funding Rounds'
					}
				]
			}

		return {
			selectedInvestors,
			selectedChains,
			selectedRounds,
			selectedSectors,
			filteredRaisesList,
			raisesByCategory: finalRaisesByCategory.sort((a, b) => b.value - a.value),
			investmentByRounds: finalInvestmentByRounds.sort((a, b) => b.value - a.value),
			monthlyInvestmentChart,
			fundingRoundsByMonthChart,
			totalAmountRaised
		}
	}, [
		investor,
		excludeInvestor,
		investors,
		round,
		excludeRound,
		rounds,
		sector,
		excludeSector,
		sectors,
		chain,
		excludeChain,
		chains,
		raises,
		minRaised,
		maxRaised
	])

	return data
}
