import { formatProtocolsData } from '~/api/categories/protocols/utils'
import { FORK_API, PROTOCOLS_API } from '~/constants'
import { getColorFromNumber } from '~/utils'
import { fetchWithErrorLogging } from '~/utils/async'

export async function getForkPageData(fork = null) {
	try {
		const [{ chart = {}, forks = {} }, { protocols }] = await Promise.all(
			[FORK_API, PROTOCOLS_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json()))
		)

		const forkExists = !fork || forks[fork]

		if (!forkExists) {
			return null
		}

		let chartData = Object.entries(chart)

		const forksUnique = Object.entries(chartData[chartData.length - 1][1])
			.sort((a, b) => b[1].tvl - a[1].tvl)
			.map((fr) => fr[0])

		const protocolsData = formatProtocolsData({ protocols })

		let parentTokens = []

		if (fork) {
			let data = []
			chartData.forEach(([date, tokens]) => {
				const value = tokens[fork]
				if (value) {
					data.push([date, value])
				}
			})
			chartData = data
			const protocol = protocolsData.find((p) => p.name.toLowerCase() === fork.toLowerCase())
			if (protocol) {
				parentTokens.push(protocol)
			}
		} else {
			forksUnique.forEach((fork) => {
				const protocol = protocolsData.find((p) => p.name.toLowerCase() === fork.toLowerCase())
				if (protocol) {
					parentTokens.push(protocol)
				}
			})
		}

		const forksProtocols = {}

		for (const frk in forks) {
			forksProtocols[frk] = forks[frk]?.length
		}

		let forkLinks = [{ label: 'All', to: `/forks` }].concat(
			forksUnique.map((o: string) => ({ label: o, to: `/forks/${o}` }))
		)

		const filteredProtocols = formatProtocolsData({ fork, protocols })

		const colors = {}

		forksUnique.forEach((chain, index) => {
			colors[chain] = getColorFromNumber(index, 6)
		})

		colors['Others'] = '#AAAAAA'

		return {
			tokens: forksUnique,
			tokenLinks: forkLinks,
			token: fork,
			tokensProtocols: forksProtocols,
			filteredProtocols,
			chartData,
			parentTokens,
			forkColors: colors
		}
	} catch (e) {
		console.log(e)
		return null
	}
}
