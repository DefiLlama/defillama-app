import { RecentProtocols } from '~/components/RecentProtocols'
import { revalidate } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'

const exclude = [
	'DeerFi',
	'FireDAO',
	'Robo-Advisor for Yield',
	'SenpaiSwap',
	'Zunami Protocol',
	'NowSwap',
	'NeoBurger',
	'MochiFi',
	'StakeHound',
	'Mento',
	'Lightning Network',
	'Secret Bridge',
	'Karura Swap',
	'Karura Liquid-Staking',
	'Karura Dollar (kUSD)',
	'Tezos Liquidity Baking',
	'Notional',
	'Tinlake',
	'Kuu Finance',
	'COTI Treasury',
	'Terra Bridge'
]

export async function getStaticProps() {
	const protocolsRaw = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl', 'listedAt', 'chainTvls'])

	const protocols = protocolsRaw.protocols
		.filter((token) => (token.symbol === null || token.symbol === '-') && !exclude.includes(token.name))
		.map((p) => ({ listedAt: 1624728920, ...p }))
		.sort((a, b) => a.listedAt - b.listedAt)

	return {
		props: {
			protocols,
			chainList: protocolsRaw.chains
		},
		revalidate: revalidate()
	}
}

export default function Protocols(props) {
	return (
		<RecentProtocols
			title="Airdroppable protocols - Defi Llama"
			name="Airdrops"
			header="Tokenless protocols that may airdrop 🧑‍🌾"
			{...props}
		/>
	)
}
