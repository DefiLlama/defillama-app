import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { Header } from '~/Theme'
import type { IChainTvl } from '~/api/types'
import { withPerformanceLogging } from '~/utils/perf'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { cexColumn } from '~/components/Table/Defi/columns'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export const cexData = [
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
		name: 'OKX',
		slug: 'okx',
		coin: 'OKB',
		coinSymbol: 'OKB',
		walletsLink: 'https://twitter.com/okx/status/1590812545346330624',
		cgId: 'okex',
		cgDeriv: 'okex_swap'
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
		name: 'Crypto.com',
		slug: 'Crypto-com',
		coin: 'CRO',
		coinSymbol: 'CRO',
		walletsLink: 'https://crypto.com/document/proof-of-reserves',
		cgId: 'crypto_com',
		cgDeriv: 'crypto_com_futures'
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
		name: 'Bybit',
		slug: 'Bybit',
		coin: 'BIT',
		coinSymbol: 'BIT',
		walletsLink: 'https://twitter.com/benbybit/status/1592797790518018048',
		cgId: 'bybit_spot',
		cgDeriv: 'bybit'
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
		name: 'Deribit',
		slug: 'deribit',
		coin: null,
		walletsLink: 'https://insights.deribit.com/exchange-updates/deribit-wallet-holdings/',
		cgDeriv: 'deribit'
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
		cgId: 'binance_us'
	},
	{
		name: 'Firi',
		slug: 'firi',
		coin: null,
		walletsLink: null
	},
	{
		name: 'MaskEX',
		slug: 'maskex',
		coin: null,
		walletsLink: 'https://news.bitcoin.com/a-message-from-maskex/'
	},
	{
		name: 'Cake DeFi',
		slug: 'cake-defi',
		coin: null,
		walletsLink: 'https://blog.cakedefi.com/proof-of-reserves'
	},
	{
		name: 'WOO X',
		slug: 'woo-x',
		coin: 'WOO',
		coinSymbol: 'WOO',
		walletsLink: 'https://woo.org/proof-of-reserves'
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
		name: 'CoinDCX',
		slug: 'coindcx',
		coin: null,
		walletsLink: 'https://twitter.com/smtgpt/status/1595745395787071497'
	},
	{
		name: 'Coinsquare',
		slug: 'coinsquare',
		coin: null,
		walletsLink: 'https://twitter.com/Coinsquare/status/1594176519986810881'
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
		name: 'Latoken',
		slug: 'latoken',
		coin: null,
		walletsLink: null
	},
	{
		name: 'BitVenus',
		slug: 'bitvenus',
		coin: null,
		walletsLink: null
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
		auditLink: 'https://coinone.co.kr/info/notice/1967',
		cgId: 'coinone'
	},
	{
		name: 'NEXO'
	},
	{
		name: 'CoinEx',
		cdId: 'coinex',
		cgDeriv: 'coinex_futures'
	},
	{
		name: 'Gemini',
		cgId: 'gemini'
	},
	{
		name: 'Coincheck',
		cgId: 'coincheck'
	},
	{
		name: 'Bitstamp',
		cgId: 'bitstamp'
	},
	{
		name: 'Bithumb',
		cgId: 'bithumb'
	},
	{
		name: 'Poloniex',
		cgId: 'poloniex'
	},
	{
		name: 'Upbit',
		cgId: 'upbit'
	},
	{
		name: 'Bitmart',
		cgId: 'bitmart',
		cgDeriv: 'bitmart_futures'
	},
	{
		name: 'Bittrex',
		cgId: 'bittrex'
	},
	{
		name: 'AscendEX',
		cgId: 'bitmax',
		cgDeriv: 'bitmax_futures'
	},
	{
		name: 'bitFlyer',
		cgId: 'bitflyer',
		cgDeriv: 'bitflyer_futures'
	},
	{
		name: 'LBank',
		cgId: 'lbank'
	},
	{
		name: 'MEXC',
		cgId: 'mxc',
		cgDeriv: 'mxc_futures'
	},
	{
		name: 'BKEX',
		cgId: 'bkex'
	},
	{
		name: 'ProBit',
		cgId: 'probit'
	},
	{
		name: 'BTCEX',
		cgId: 'btcex',
		cgDeriv: 'btcex_futures'
	},
	{
		name: 'Bitrue',
		cgId: 'bitrue',
		cgDeriv: 'bitrue_futures'
	},
	{
		name: 'BTCC',
		cgID: 'btcc',
		cgDeriv: 'btcc_futures'
	},
	{
		name: 'BitVenus'
	},
	{
		name: 'Deepcoin',
		cgId: 'deepcoin'
	}
]

const hour24ms = ((Date.now() - 24 * 60 * 60 * 1000) / 1000).toFixed(0)

const hour7dms = ((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000).toFixed(0)

const hour1mms = ((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000).toFixed(0)

export const getStaticProps = withPerformanceLogging('cexs/index', async () => {
	const [
		spot,
		derivs,
		{
			coins: {
				'coingecko:bitcoin': { price: btcPrice }
			}
		}
	] = await Promise.all([
		fetch(`https://pro-api.coingecko.com/api/v3/exchanges?per_page=250&x_cg_pro_api_key=${process.env.CG_KEY}`).then(
			(r) => r.json()
		),
		fetch(
			`https://pro-api.coingecko.com/api/v3/derivatives/exchanges?per_page=1000&x_cg_pro_api_key=${process.env.CG_KEY}`
		).then((r) => r.json()),
		fetch(`https://coins.llama.fi/prices/current/coingecko:bitcoin`).then((r) => r.json())
	])
	const cexs = await Promise.all(
		cexData.map(async (c) => {
			if (c.slug === undefined) {
				return c
			} else {
				const res = await Promise.allSettled([
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

				const [{ chainTvls = {} }, inflows24h, inflows7d, inflows1m] = res.map((r) =>
					r.status === 'fulfilled' ? r.value : {}
				)

				let cexTvl = 0

				let ownToken = 0

				Object.values(chainTvls as IChainTvl).map((item) => {
					if (item.tvl) {
						cexTvl += item.tvl[item.tvl.length - 1]?.totalLiquidityUSD ?? 0
					}

					if (item.tokensInUsd) {
						ownToken += item.tokensInUsd[item.tokensInUsd.length - 1]?.tokens[c.coin] ?? 0 ?? 0
					}
				})

				const cleanTvl = cexTvl - ownToken

				const extra = {} as any
				if (c.cgId) {
					// console.log(c.cgId, spot)
					const spotEx = spot && !spot.status && spot.find((ex) => ex.id === c.cgId)
					if (!spotEx) {
						console.error(c.name + ' is not in spot list')
					} else {
						extra.spotVolume = spotEx.trade_volume_24h_btc_normalized * btcPrice
					}
				}
				if (c.cgDeriv) {
					const _derivs = derivs && !derivs.status && derivs.find((ex) => ex.id === c.cgDeriv)
					// extra.oi = derivs.find((ex) => ex.id === c.cgDeriv).open_interest_btc * btcPrice
					if (!_derivs) {
						console.error(c.name + ' is not in derivs list')
					} else {
						extra.oi = _derivs.open_interest_btc * btcPrice
						extra.leverage = extra.oi / cleanTvl
					}
				}

				if (c.slug === 'Binance-CEX' && Number(hour7dms) < 1681609999) {
					inflows7d.outflows = null
				}
				if (c.slug === 'Binance-CEX' && Number(hour1mms) < 1681609999) {
					inflows1m.outflows = null
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
})

export default function Protocols({ cexs }) {
	return (
		<Layout title={`CEX Transparency - DefiLlama`} defaultSEO>
			<Header>CEX Transparency</Header>

			<TableWithSearch data={cexs} columns={cexColumn} columnToSearch={'name'} placeholder={'Search exchange...'} />
		</Layout>
	)
}
