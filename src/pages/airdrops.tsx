import { revalidate, getSimpleProtocolsPageData, basicPropertiesToKeep } from '~/utils/dataApi'
import { RecentProtocols } from '~/components/RecentProtocols'

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
	'Kuu Finance'
]

export async function getStaticProps() {
	const protocols = (await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl', 'listedAt'])).protocols
		.filter((token) => (token.symbol === null || token.symbol === '-') && !exclude.includes(token.name))
		.map((p) => ({ listedAt: 1624728920, ...p }))
		.sort((a, b) => b.listedAt - a.listedAt)
	return {
		props: {
			protocols
		},
		revalidate: revalidate()
	}
}

export default function Protocols({ protocols }) {
	return (
		<RecentProtocols
			protocols={protocols}
			title="Airdroppable protocols - Defi Llama"
			name="Airdrops"
			header="Tokenless protocols that may airdrop 🧑‍🌾"
		/>
	)
}
