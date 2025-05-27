import { PROTOCOLS_TREASURY } from '~/constants'
import { slug } from '~/utils'

export interface INetProjectTreasuryByChain {
	protocols: Array<{ name: string; logo: string; slug: string; netTreasury: number }>
}

export async function getNetProjectTreasuryByChain(): Promise<INetProjectTreasuryByChain> {
	const treasuries = await fetch(PROTOCOLS_TREASURY).then((res) => res.json())

	return {
		protocols: treasuries
			.map((t) => {
				let netTreasury = 0
				for (const category in t.tokenBreakdowns) {
					if (category !== 'ownTokens') {
						netTreasury += t.tokenBreakdowns[category]
					}
				}
				return {
					name: t.name,
					logo: `${t.logo.replace('https://icons.llama.fi', 'https://icons.llamao.fi/icons/protocols')}?w=48&h=48`,
					slug: slug(t.name),
					netTreasury
				}
			})
			.filter((t) => t.netTreasury > 0)
			.sort((a, b) => b.netTreasury - a.netTreasury)
	}
}
