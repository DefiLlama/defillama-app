import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { Header } from '~/Theme'
import { CEXTable } from '~/components/Table/Defi'

const cexData = [
	{
		name: 'Binance',
		slug: 'Binance-CEX',
		coin: 'BNB',
		coinSymbol: 'BNB',
		walletsLink: 'https://www.binance.com/en/blog/community/our-commitment-to-transparency-2895840147147652626',
		cgId: 'binance',
		cgDeriv: 'binance_futures'
	},
	{
		name: 'Bitfinex',
		slug: 'bitfinex',
		coin: 'LEO',
		coinSymbol: 'LEO',
		walletsLink: 'https://github.com/bitfinexcom/pub/blob/main/wallets.txt',
		cgId: 'bitfinex',
		cgDeriv: 'bitfinex_futures'
	},
	{
		name: 'OKX',
		slug: 'okx',
		coin: 'OKB',
		coinSymbol: 'OKB',
		walletsLink: 'https://twitter.com/okx/status/1590812545346330624',
		cgId: 'okex',
		cgDeriv: 'okex_swap'
	},
	{
		name: 'Huobi',
		slug: 'Huobi',
		coin: 'HT',
		coinSymbol: 'HT',
		walletsLink: 'https://www.huobi.com/support/en-us/detail/24922606430831',
		cgId: 'huobi',
		cgDeriv: 'huobi_dm'
	},
	{
		name: 'Crypto.com',
		slug: 'Crypto-com',
		coin: 'CRO',
		coinSymbol: 'CRO',
		walletsLink: 'https://crypto.com/document/proof-of-reserves',
		cgId: 'crypto_com',
		cgDeriv: 'crypto_com_futures'
	},
	{
		name: 'Kucoin',
		slug: 'kucoin',
		coin: 'KCS',
		coinSymbol: 'KCS',
		walletsLink: 'https://www.kucoin.com/blog/transparency-and-trust-a-detailed-list-of-kucoin-s-wallets',
		cgId: 'kucoin',
		cgDeriv: 'kumex'
	},
	{
		name: 'Bybit',
		slug: 'Bybit',
		coin: 'BIT',
		coinSymbol: 'BIT',
		walletsLink: 'https://twitter.com/benbybit/status/1592797790518018048',
		cgId: 'bybit_spot',
		cgDeriv: 'bybit'
	},
	{
		name: 'Gate.io',
		slug: 'Gate-io',
		coin: 'GT',
		coinSymbol: 'GT',
		walletsLink: 'https://github.com/gateio/proof-of-reserves',
		cgId: 'gate',
		cgDeriv: 'gate_futures'
	},
	{
		name: 'Deribit',
		slug: 'deribit',
		coin: null,
		walletsLink: 'https://insights.deribit.com/exchange-updates/deribit-wallet-holdings/',
		cgDeriv: 'deribit'
	},
	{
		name: 'Bitget',
		slug: 'bitget',
		coin: 'BGB',
		coinSymbol: 'BGB',
		walletsLink: 'https://twitter.com/bitgetglobal/status/1602256957376794624',
		cgId: 'bitget',
		cgDeriv: 'bitget_futures'
	},
	{
		name: 'Bitmex',
		slug: 'bitmex',
		coin: null,
		walletsLink: 'https://github.com/BitMEX/proof-of-reserves-liabilities',
		cgId: 'bitmex_spot',
		cgDeriv: 'bitmex'
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
		name: 'Binance US',
		slug: 'binance-us',
		coin: 'BNB',
		coinSymbol: 'BNB',
		cgId: 'binance_us',
	},
	{
		name: 'MaskEX',
		slug: 'maskex',
		coin: null,
		walletsLink: 'https://news.bitcoin.com/a-message-from-maskex/'
	},
	{
		name: 'Coinsquare',
		slug: 'coinsquare',
		coin: null,
		walletsLink: 'https://twitter.com/Coinsquare/status/1594176519986810881'
	},
	{
		name: 'Phemex',
		slug: 'phemex',
		coin: null,
		walletsLink: 'https://phemex.com/proof-of-reserves',
		cgId: 'phemex',
		cgDeriv: 'phemex_futures'
	},
	{
		name: 'Firi',
		slug: 'firi',
		coin: null,
		walletsLink: null
	},
	{
		name: 'WOO X',
		slug: 'woo-x',
		coin: 'WOO',
		coinSymbol: 'WOO',
		walletsLink: 'https://woo.org/proof-of-reserves'
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
		name: 'Hotbit',
		slug: 'hotbit',
		coin: 'HTB',
		coinSymbol: 'HTB'
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
		auditLink: 'https://d18rn0p25nwr6d.cloudfront.net/CIK-0001679788/8e5e0508-da75-434d-9505-cba99fa00147.pdf',
		cgId: 'gdax'
	},
	{
		name: 'Kraken',
		lastAuditDate: 1656547200,
		auditor: 'ArmaninoLLP',
		auditLink: 'https://proof-of-reserves.trustexplorer.io/clients/kraken/',
		cgId: 'kraken',
		cgDeriv: 'kraken_futures'
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
		name: 'Gemini',
		cgId: 'gemini'
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
		name: 'Poloniex',
		cgId: 'poloniex'
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

const hour24ms = ((Date.now() - 24 * 60 * 60 * 1000) / 1000).toFixed(0)

const hour7dms = ((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000).toFixed(0)

const hour1mms = ((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000).toFixed(0)

export async function getStaticProps() {
	const [
		spot,
		derivs,
		{
			bitcoin: { usd: btcPrice }
		}
	] = await Promise.all([
		fetch(`https://api.coingecko.com/api/v3/exchanges?per_page=250`).then((r) => r.json()),
		fetch(`https://api.coingecko.com/api/v3/derivatives/exchanges?per_page=1000`).then((r) => r.json()),
		fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`).then((r) => r.json())
	])
	const cexs = await Promise.all(
		cexData.map(async (c) => {
			if (c.slug === undefined) {
				return c
			} else {
				const [{ tvl, tokensInUsd }, inflows24h, inflows7d, inflows1m] = await Promise.all([
					fetch(`https://api.llama.fi/updatedProtocol/${c.slug}`).then((r) => r.json()),
					fetch(`https://api.llama.fi/inflows/${c.slug}/${hour24ms}?tokensToExclude=${c.coin ?? ''}`).then((r) =>
						r.json()
					),
					fetch(`https://api.llama.fi/inflows/${c.slug}/${hour7dms}?tokensToExclude=${c.coin ?? ''}`).then((r) =>
						r.json()
					),
					fetch(`https://api.llama.fi/inflows/${c.slug}/${hour1mms}?tokensToExclude=${c.coin ?? ''}`).then((r) =>
						r.json()
					)
				])

				const cexTvl = tvl ? tvl[tvl.length - 1].totalLiquidityUSD : 0

				const ownToken = tokensInUsd ? tokensInUsd[tokensInUsd.length - 1].tokens[c.coin] ?? 0 : 0
				const cleanTvl = cexTvl - ownToken

				const extra = {} as any
				if (c.cgId) {
					extra.spotVolume = spot.find((ex) => ex.id === c.cgId).trade_volume_24h_btc_normalized * btcPrice
				}
				if (c.cgDeriv) {
					extra.oi = derivs.find((ex) => ex.id === c.cgDeriv).open_interest_btc * btcPrice
					extra.leverage = extra.oi / cleanTvl
				}

				return {
					...c,
					tvl: cexTvl,
					cleanTvl,
					'24hInflows': inflows24h?.outflows ?? null,
					'7dInflows': inflows7d?.outflows ?? null,
					'1mInflows': inflows1m?.outflows ?? null,
					...extra
				}
			}
		})
	)

	return {
		props: {
			cexs
		},
		revalidate: maxAgeForNext([22])
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
