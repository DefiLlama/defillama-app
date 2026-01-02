import { useMemo } from 'react'
import { useRouter } from 'next/router'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { CHART_COLORS } from '~/constants/colors'
import { slug, toYearMonth } from '~/utils'

export function useRaisesData({ raises, investors, rounds, sectors, chains }) {
	const { query } = useRouter()

	const { investor, round, sector, chain, minRaised, maxRaised } = query

	const data = useMemo(() => {
		let selectedInvestors = []
		let selectedRounds = []
		let selectedSectors = []
		let selectedChains = []
		const raisesByCategory: { [category: string]: number } = {}
		const fundingRoundsByMonth = {}
		const monthlyInvestment = {}
		const investmentByRounds: { [round: string]: number } = {}

		if (investor) {
			if (typeof investor === 'string') {
				selectedInvestors = investor === 'All' ? [...investors] : investor === 'None' ? [] : [investor]
			} else {
				selectedInvestors = [...investor]
			}
		} else selectedInvestors = [...investors]

		if (round) {
			if (typeof round === 'string') {
				selectedRounds = round === 'All' ? [...rounds] : round === 'None' ? [] : [round]
			} else {
				selectedRounds = [...round]
			}
		} else selectedRounds = [...rounds]

		if (sector) {
			if (typeof sector === 'string') {
				selectedSectors = sector === 'All' ? [...sectors] : sector === 'None' ? [] : [sector]
			} else {
				selectedSectors = [...sector]
			}
		} else selectedSectors = [...sectors]

		if (chain) {
			if (typeof chain === 'string') {
				selectedChains =
					chain === 'All' ? [...chains] : chain === 'None' ? [] : [chains.find((c) => slug(c) === slug(chain)) ?? chain]
			} else {
				const schain = chains.map((c) => slug(c))
				selectedChains = [...chains.filter((c) => schain.includes(slug(c)))]
			}
		} else selectedChains = [...chains]

		const minimumAmountRaised =
			typeof minRaised === 'string' && !Number.isNaN(Number(minRaised)) ? Number(minRaised) : 0

		const maximumAmountRaised =
			typeof maxRaised === 'string' && !Number.isNaN(Number(maxRaised)) ? Number(maxRaised) : 0

		const isValidTvlRange = !!minimumAmountRaised || !!maximumAmountRaised

		const selectedInvestorsSet = new Set(selectedInvestors)
		const selectedChainsSet = new Set(selectedChains)
		const selectedRoundsSet = new Set(selectedRounds)
		const selectedSectorsSet = new Set(selectedSectors)

		const filteredRaisesList = raises.filter((raise) => {
			let toFilter = true

			if (selectedInvestors.length !== investors.length) {
				if (raise.leadInvestors.length === 0 && raise.otherInvestors.length === 0) {
					return false
				}

				let isAnInvestor = false

				raise.leadInvestors.forEach((lead) => {
					if (selectedInvestorsSet.has(lead)) {
						isAnInvestor = true
					}
				})

				raise.otherInvestors.forEach((otherInv) => {
					if (selectedInvestorsSet.has(otherInv)) {
						isAnInvestor = true
					}
				})

				// filter if investor is in either leadInvestors or otherInvestors
				if (!isAnInvestor) {
					toFilter = false
				}
			}

			if (selectedChains.length !== chains.length) {
				// filter raises with no chains
				if (raise.chains.length === 0) {
					toFilter = false
				} else {
					let raiseIncludesChain = false

					raise.chains.forEach((chain) => {
						if (selectedChainsSet.has(chain)) {
							raiseIncludesChain = true
						}
					})

					if (!raiseIncludesChain) {
						toFilter = false
					}
				}
			}

			if (selectedRounds.length !== rounds.length) {
				// filter raises with no round
				if (!raise.round || raise.round === '') {
					toFilter = false
				} else {
					if (!selectedRoundsSet.has(raise.round)) {
						toFilter = false
					}
				}
			}

			if (selectedSectors.length !== sectors.length) {
				// filter raises with no sector
				if (!raise.category || raise.category === '') {
					toFilter = false
				} else {
					if (!selectedSectorsSet.has(raise.category)) {
						toFilter = false
					}
				}
			}

			const raisedAmount = raise.amount ? Number(raise.amount) * 1_000_000 : 0

			const isInRange =
				(minimumAmountRaised != null ? raisedAmount >= minimumAmountRaised : true) &&
				(maximumAmountRaised != null ? raisedAmount <= maximumAmountRaised : true)

			if (isValidTvlRange && !isInRange) {
				toFilter = false
			}

			if (toFilter && raise.category) {
				raisesByCategory[raise.category] = (raisesByCategory[raise.category] || 0) + 1
			}

			return toFilter
		})

		filteredRaisesList.forEach((r) => {
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
		})

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

		const monthlyInvestmentChart: ILineAndBarChartProps['charts'] = {
			'Funding Amount': {
				name: 'Funding Amount',
				stack: 'Funding Amount',
				data: finalMonthlyInvestment,
				color: CHART_COLORS[0],
				type: 'bar'
			}
		}

		const fundingRoundsByMonthChart: ILineAndBarChartProps['charts'] = {
			'Funding Rounds': {
				name: 'Funding Rounds',
				stack: 'Funding Rounds',
				data: finalFundingRoundsByMonth,
				color: CHART_COLORS[0],
				type: 'bar'
			}
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
	}, [investor, investors, round, rounds, sector, sectors, chain, chains, raises, minRaised, maxRaised])

	return data
}
