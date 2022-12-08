import Layout from '~/layout'
import { revalidate } from '~/api'
import { Header } from '~/Theme'
import { CEXTable } from '~/components/Table/Defi'

const cexData = [
	{
		name: 'Binance',
		slug: 'Binance-CEX',
		coin: 'binancecoin',
		coinSymbol: 'BNB',
		walletsLink: 'https://www.binance.com/en/blog/community/our-commitment-to-transparency-2895840147147652626'
	},
	{
		name: 'OKX',
		slug: 'okx',
		coin: null,
		walletsLink: 'https://twitter.com/okx/status/1590812545346330624'
	},
	{
		name: 'Bitfinex',
		slug: 'bitfinex',
		coin: null,
		walletsLink: 'https://github.com/bitfinexcom/pub/blob/main/wallets.txt'
	},
	{
		name: 'Crypto.com',
		slug: 'Crypto-com',
		coin: 'CRO',
		coinSymbol: 'CRO',
		walletsLink: 'https://twitter.com/kris/status/1591036632664518657'
	},
	{
		name: 'Huobi',
		slug: 'Huobi',
		coin: 'HT',
		coinSymbol: 'HT',
		walletsLink: 'https://www.huobi.com/support/en-us/detail/24922606430831'
	},
	{
		name: 'Kucoin',
		slug: 'kucoin',
		coin: 'KCS',
		coinSymbol: 'KCS',
		walletsLink: 'https://www.kucoin.com/blog/transparency-and-trust-a-detailed-list-of-kucoin-s-wallets'
	},
	{
		name: 'Bybit',
		slug: 'Bybit',
		coin: 'BIT',
		coinSymbol: 'BIT',
		walletsLink: 'https://twitter.com/benbybit/status/1592797790518018048'
	},
	{
		name: 'Gate.io',
		slug: 'Gate-io',
		coin: 'GT',
		coinSymbol: 'GT',
		walletsLink: 'https://github.com/gateio/proof-of-reserves'
	},
	{
		name: 'Deribit',
		slug: 'deribit',
		coin: null,
		walletsLink: 'https://insights.deribit.com/exchange-updates/deribit-wallet-holdings/'
	},
	{
		name: 'Bitmex',
		slug: 'bitmex',
		coin: null,
		walletsLink: 'https://github.com/BitMEX/proof-of-reserves-liabilities'
	},
	{
		name: 'Swissborg',
		slug: 'swissborg',
		coin: 'CHSB',
		coinSymbol: 'CHSB',
		walletsLink: 'https://github.com/swissborg/pub'
	},
	{
		name: 'Korbit',
		slug: 'korbit',
		coin: null,
		walletsLink: 'https://korbit.co.kr/reserve'
	},
	{
		name: 'Coinsquare',
		slug: 'coinsquare',
		coin: null,
		walletsLink: 'https://twitter.com/Coinsquare/status/1594176519986810881'
	},
	{
		name: 'MaskEX',
		slug: 'maskex',
		coin: null,
		walletsLink: 'https://news.bitcoin.com/a-message-from-maskex/'
	},
	{
		name: 'Firi',
		slug: 'firi',
		coin: null,
		walletsLink: null
	},
	{
		name: 'CoinDCX',
		slug: 'coindcx',
		coin: null,
		walletsLink: 'https://twitter.com/smtgpt/status/1595745395787071497'
	},
	{
		name: 'Cake DeFi',
		slug: 'cake-defi',
		coin: null,
		walletsLink: 'https://blog.cakedefi.com/proof-of-reserves'
	},
	{
		name: 'NBX',
		slug: 'nbx',
		coin: null,
		walletsLink: 'https://nbx.com/en/proof-of-reserves'
	},
	{
		name: 'Coinbase',
		lastAuditDate: 1640908800,
		auditor: 'Deloitte',
		auditLink: 'https://d18rn0p25nwr6d.cloudfront.net/CIK-0001679788/8e5e0508-da75-434d-9505-cba99fa00147.pdf'
	},
	{
		name: 'Kraken',
		lastAuditDate: 1656547200,
		auditor: 'ArmaninoLLP',
		auditLink: 'https://proof-of-reserves.trustexplorer.io/clients/kraken/'
	},
	{
		name: 'Coinone',
		lastAuditDate: 1666369050,
		auditor: null,
		auditLink: 'https://coinone.co.kr/info/notice/1967'
	},
	{
		name: 'NEXO'
	},
	{
		name: 'CoinEx'
	},
	{
		name: 'Gemini'
	},
	{
		name: 'Coincheck'
	},
	{
		name: 'Bitstamp'
	},
	{
		name: 'Bithumb'
	},
	{
		name: 'Bitget'
	},
	{
		name: 'Poloniex'
	},
	{
		name: 'Upbit'
	},
	{
		name: 'Bitmart'
	},
	{
		name: 'Bittrex'
	}
]

export async function getStaticProps() {
	const cexs = await Promise.all(
		cexData.map(async (c) => {
			if (c.slug === undefined) {
				return c
			} else {
				const { tvl, tokensInUsd } = await fetch(`https://api.llama.fi/updatedProtocol/${c.slug}`).then((r) => r.json())
				const cexTvl = tvl ? tvl[tvl.length - 1].totalLiquidityUSD : 0
				const ownToken = tokensInUsd ? tokensInUsd[tokensInUsd.length - 1].tokens[c.coin] ?? 0 : 0
				return {
					...c,
					tvl: cexTvl,
					cleanTvl: cexTvl - ownToken
				}
			}
		})
	)
	return {
		props: {
			cexs
		},
		revalidate: revalidate()
	}
}

export default function Protocols({ cexs }) {
	return (
		<Layout title={`CEX Transparency - DefiLlama`} defaultSEO>
			<Header>CEX Transparency</Header>

			<CEXTable data={cexs} />
		</Layout>
	)
}
