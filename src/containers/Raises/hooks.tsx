import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { toYearMonth } from '~/utils'

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
				selectedChains = chain === 'All' ? [...chains] : chain === 'None' ? [] : [chain]
			} else {
				selectedChains = [...chain]
			}
		} else selectedChains = [...chains]

		const minimumAmountRaised =
			typeof minRaised === 'string' && !Number.isNaN(Number(minRaised)) ? Number(minRaised) : 0

		const maximumAmountRaised =
			typeof maxRaised === 'string' && !Number.isNaN(Number(maxRaised)) ? Number(maxRaised) : 0

		const isValidTvlRange = !!minimumAmountRaised || !!maximumAmountRaised

		const filteredRaisesList = raises.filter((raise) => {
			let toFilter = true

			if (selectedInvestors.length !== investors.length) {
				if (raise.leadInvestors.length === 0 && raise.otherInvestors.length === 0) {
					return false
				}

				let isAnInvestor = false

				raise.leadInvestors.forEach((lead) => {
					if (selectedInvestors.includes(lead)) {
						isAnInvestor = true
					}
				})

				raise.otherInvestors.forEach((otherInv) => {
					if (selectedInvestors.includes(otherInv)) {
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
						if (selectedChains.includes(chain)) {
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
					if (!selectedRounds.includes(raise.round)) {
						toFilter = false
					}
				}
			}

			if (selectedSectors.length !== sectors.length) {
				// filter raises with no sector
				if (!raise.category || raise.category === '') {
					toFilter = false
				} else {
					if (!selectedSectors.includes(raise.category)) {
						toFilter = false
					}
				}
			}

			const raisedAmount = raise.amount ? Number(raise.amount) * 1_000_000 : 0

			const isInRange =
				(minimumAmountRaised ? raisedAmount >= minimumAmountRaised : true) &&
				(maximumAmountRaised ? raisedAmount <= maximumAmountRaised : true)

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

		return {
			selectedInvestors,
			selectedChains,
			selectedRounds,
			selectedSectors,
			filteredRaisesList,
			raisesByCategory: Object.entries(raisesByCategory)
				.map(([name, value]) => ({
					name,
					value
				}))
				.sort((a, b) => b.value - a.value),
			investmentByRounds: Object.entries(investmentByRounds)
				.map(([name, value]) => ({
					name,
					value
				}))
				.sort((a, b) => b.value - a.value),
			monthlyInvestment: Object.entries(monthlyInvestment).map((t) => [
				new Date(t[0]).getTime() / 1e3,
				Number.isNaN(Number(t[1])) ? 0 : Number(t[1]) * 1e6
			]),
			fundingRoundsByMonth: Object.entries(fundingRoundsByMonth).map((t) => [new Date(t[0]).getTime() / 1e3, t[1]])
		}
	}, [investor, investors, round, rounds, sector, sectors, chain, chains, raises, minRaised, maxRaised])

	return data
}
