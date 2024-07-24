import { QueryClient, QueryClientProvider } from 'react-query'

import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { Header } from '~/Theme'
import type { IChainTvl } from '~/api/types'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'
import Cexs from '~/components/Cexs'
import 'react-datepicker/dist/react-datepicker.css'

const fetch = fetchWithErrorLogging

interface ICex {
	name: string
	slug?: string
	coin?: string
	coinSymbol?: string
	walletsLink?: string
	cgId?: string
	cgDeriv?: string
	lastAuditDate?: number
	auditor?: string | null
	auditLink?: string
}

export const cg_volume_cexs = Object.values({
	Bybit: 'bybit-spot',
	Coinbase: 'gdax',
	Huobi: 'huobi',
	KuCoin: 'kucoin',
	Kraken: 'kraken',
	Binance: 'binance',
	'Binance US': 'binance_us',
	'Crypto.com Exchange': 'crypto_com',
	Bitfinex: 'bitfinex',
	'Gate.io': 'gate',
	Bitget: 'bitget',
	OKX: 'okex',
	BingX: 'bingx',
	Phemex: 'phemex',
	Gemini: 'gemini',
	'MEXC Global': 'mxc',
	WhiteBIT: 'whitebit',
	Upbit: 'upbit',
	BitMart: 'bitmart',
	BTSE: 'btse',
	EXMO: 'exmo',
	CoinEx: 'coinex',
	Bitbank: 'bitbank',
	'WOO X': 'wootrade',
	Bitso: 'bitso',
	'Coins.ph': 'coinspro',
	LBank: 'lbank',
	DigiFinex: 'digifinex',
	Coinsbit: 'coinsbit',
	'XT.COM': 'xt',
	BTCEX: 'btcex',
	P2B: 'p2pb2b',
	Tidex: 'tidex',
	Bithumb: 'bithumb',
	Bitrue: 'bitrue',
	BigONE: 'bigone',
	'Dex-Trade': 'dextrade',
	Coinstore: 'coinstore',
	Poloniex: 'poloniex',
	Paribu: 'paribu',
	'AscendEX (BitMax)': 'bitmax',
	Bitstamp: 'bitstamp',
	bitFlyer: 'bitflyer',
	'BtcTurk PRO': 'btcturk',
	QMall: 'qmall',
	Cryptology: 'cryptology',
	Bitkub: 'bitkub',
	'C-Patex': 'c_patex',
	LATOKEN: 'latoken',
	'Max Maicoin': 'max_maicoin',
	Kanga: 'kanga',
	Luno: 'luno',
	Indodax: 'indodax',
	BTCMarkets: 'btcmarkets',
	Korbit: 'korbit',
	BitoPro: 'bitopro',
	'Bittrex Global': 'bittrex',
	VALR: 'valr',
	'CEX.IO': 'cex',
	'Bitpanda Pro': 'bitpanda',
	'Delta Exchange': 'delta_spot',
	'Blockchain.com': 'blockchain_com',
	Coinmetro: 'coin_metro',
	NiceHash: 'nice_hash',
	BitMEX: 'bitmex_spot',
	Okcoin: 'okcoin',
	Toobit: 'toobit',
	Bitforex: 'bitforex',
	DIFX: 'difx',
	Bitvavo: 'bitvavo',
	Coincheck: 'coincheck',
	'FMFW.io': 'bitcoin_com',
	PointPay: 'pointpay',
	'GMO Japan': 'gmo_japan',
	Bitazza: 'bitazza',
	'Independent Reserve': 'independent_reserve',
	Nominex: 'nominex',
	Coinlist: 'coinlist',
	Fastex: 'fastex',
	'CoinJar Exchange': 'coinjar',
	Zaif: 'zaif',
	WazirX: 'wazirx',
	Bitlo: 'bitlo',
	'Bitcoin.me': 'klever_exchange',
	'CoinTR Pro': 'cointr',
	Pionex: 'pionex',
	Deepcoin: 'deepcoin',
	'ProBit Global': 'probit',
	CoinDCX: 'coindcx',
	Coinone: 'coinone',
	'Bitci TR': 'bitci',
	BIT: 'bit_com',
	Stormgain: 'stormgain',
	BitBNS: 'bitbns',
	Bullish: 'bullish_com',
	TokoCrypto: 'toko_crypto',
	'Currency.com': 'currency',
	Bilaxy: 'bilaxy',
	Tokenize: 'tokenize',
	Coinzoom: 'coinzoom',
	NovaDAX: 'novadax',
	'Deribit Spot': 'deribit_spot',
	Deribit: 'deribit',
	Emirex: 'emirex',
	Bitbuy: 'bitbuy',
	Foxbit: 'foxbit',
	ZBX: 'zbx',
	zipmex: 'zipmex'
})

export const cexData: Array<ICex> = [
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
		name: 'Robinhood',
		slug: 'robinhood',
		coin: null,
		walletsLink: null,
		cgId: null
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
	/*
	{
		name: 'Kraken',
		slug: 'kraken',
		coin: null,
		walletsLink: null,
		cgId: 'kraken',
		cgDeriv: 'kraken_futures'
	},
	*/
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
		name: 'HTX',
		slug: 'htx',
		coin: 'HT',
		coinSymbol: 'HT',
		walletsLink: 'https://www.huobi.com/support/en-us/detail/24922606430831',
		cgId: 'huobi',
		cgDeriv: 'huobi_dm'
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
		name: 'Bitstamp',
		slug: 'bitstamp',
		coin: null,
		walletsLink: null,
		cgId: 'bitstamp'
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
		name: 'MEXC',
		slug: 'mexc',
		coin: 'MX',
		coinSymbol: 'MX',
		cgId: 'mxc'
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
		coin: 'BORG',
		coinSymbol: 'BORG',
		walletsLink: 'https://github.com/swissborg/pub'
	},
	{
		name: 'MaskEX',
		slug: 'maskex',
		coin: null,
		walletsLink: 'https://blog.maskex.com/news/announcements/embracing-transparency-maskex-reveals-wallet-addresses'
	},
	{
		name: 'Korbit',
		slug: 'korbit',
		coin: null,
		walletsLink: 'https://korbit.co.kr/reserve'
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
		name: 'ProBit',
		slug: 'probit',
		coin: "PROB",
		coinSymbol: 'PROB',
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
		name: 'Cake DeFi',
		slug: 'cake-defi',
		coin: null,
		walletsLink: 'https://blog.cakedefi.com/proof-of-reserves'
	},
	{
		name: 'BingX',
		slug: 'bingx',
		coin: null,
		walletsLink: 'https://bingx.com/en/balance-reserve/',
		cgId: 'bingx',
	},
	{
		name: 'Coinsquare',
		slug: 'coinsquare',
		coin: null,
		walletsLink: 'https://twitter.com/Coinsquare/status/1594176519986810881'
	},
	{
		name: 'CoinW',
		slug: 'coinw',
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
		name: 'Fastex',
		slug: 'fastex',
		coin: 'FTN',
		coinSymbol: 'FTN',
		walletsLink: 'https://www.fastex.com/proof-of-reserves',
		cgId: 'fastex'
	},
	{
		name: 'NBX',
		slug: 'nbx',
		coin: null,
		walletsLink: 'https://nbx.com/en/proof-of-reserves'
	},
	{
		name: 'Okcoin',
		slug: 'okcoin',
		coin: null,
		walletsLink: 'https://www.okcoin.com/proof-of-reserves/download'
	},
	{
		name: 'BitVenus',
		slug: 'bitvenus',
		coin: null,
		walletsLink: null
	},
	{
		name: 'Flipster',
		slug: 'flipster',
		coin: null,
		walletsLink: 'https://flipster.io/support/proof-of-reserves'
	},
	{
		name: 'NonKYC',
		slug: 'nonkyc',
		coin: 'NKYC',
		coinSymbol: 'NKYC',
		walletsLink: 'https://nonkyc.io/allreserves',
		cgId: 'nonkyc_io'
	},
	{
		name: 'Latoken',
		slug: 'latoken',
		coin: null,
		walletsLink: null
	},
	{
		name: 'BitMart',
		slug: 'bitMart',
		coin: 'BMX',
		coinSymbol: 'BMX',
		cgId: 'bitmart',
		cgDeriv: 'bitmart_futures'
	},
	{
		name: 'Klever Exchange',
		slug: 'klever-exchange',
		coin: 'KLV',
		coinSymbol: 'KLV',
		cgId: 'klever_exchange'
	},
	{
		name: 'BTSE',
		slug: 'btse',
		coin: 'BTSE',
		coinSymbol: 'BTSE',
		cgId: 'btse'
	},
	{
		name: 'HashKey Exchange',
		slug: 'hashkey-exchange',
		coin: null,
		walletsLink: null
	},
	{
		name: 'Backpack',
		slug: 'backpack',
		coin: null,
		coinSymbol: null,
		walletsLink: 'https://dune.com/21co/backpack-exchange'
	},
	{
		name: 'HashKey Global',
		slug: 'hashkey-global',
		coin: null,
		coinSymbol: null
	},
	{
		name: 'Bitmake',
		slug: 'bitmake',
		coin: null,
		walletsLink: null
	},
	{
		name: 'Hibt',
		slug: 'hibt',
		coin: null,
		walletsLink: null
	},
	{
		name: 'Hotbit',
		slug: 'hotbit',
		coin: 'HTB',
		coinSymbol: 'HTB'
	},
	{
		name: 'CoinEx',
		slug: 'coinex',
		coin: 'CET',
		coinSymbol: 'CET',
		walletsLink: null,
		cgId: 'coinex',
		cgDeriv: 'coinex_futures'
	},
	/*
	{
		name: 'Binance US',
		slug: 'binance-us',
		coin: 'BNB',
		coinSymbol: 'BNB',
		cgId: 'binance_us'
	},
	*/
	{
		name: 'Coinbase',
		lastAuditDate: 1640908800,
		auditor: 'Deloitte',
		auditLink: 'https://d18rn0p25nwr6d.cloudfront.net/CIK-0001679788/8e5e0508-da75-434d-9505-cba99fa00147.pdf',
		cgId: 'gdax'
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
		name: 'Gemini',
		cgId: 'gemini'
	},
	{
		name: 'Coincheck',
		cgId: 'coincheck'
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
		cgId: 'btcc',
		cgDeriv: 'btcc_futures'
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
				const res = await Promise.all([
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
				]).catch((e) => null)
				if (res === null) {
					return c
				}

				const [{ chainTvls = {} }, inflows24h, inflows7d, inflows1m] = res

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
						extra.spotVolume = spotEx.trade_volume_24h_btc * btcPrice
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

const queryClient = new QueryClient()

export default function Protocols({ cexs }) {
	return (
		<QueryClientProvider client={queryClient}>
			<Layout title={`CEX Transparency - DefiLlama`} defaultSEO>
				<Header>CEX Transparency</Header>
				<Cexs cexs={cexs} />
			</Layout>
		</QueryClientProvider>
	)
}

//trigger server gogogo
