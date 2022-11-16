import Layout from '~/layout'
import { revalidate } from '~/api'
import { getProtocolsRaw } from '~/api/categories/protocols'
import { Header } from '~/Theme'
import { CEXTable } from '~/components/Table/Defi'

const cexData = [
	{
		name: "Binance",
		slug: "Binance-CEX",
		coin: "binancecoin",
		coinSymbol: "BNB",
		walletsLink: "https://www.binance.com/en/blog/community/our-commitment-to-transparency-2895840147147652626",
	},
	{
		name: "Crypto.com",
		slug: "Crypto-com",
		coin: "CRO",
		coinSymbol: "CRO",
		walletsLink: "https://twitter.com/kris/status/1591036632664518657",
	},
	{
		name: "OKX",
		slug: "okx",
		coin: null,
		walletsLink: "https://twitter.com/okx/status/1590812545346330624",
	},
	{
		name: "Deribit",
		slug: "deribit",
		coin: null,
		walletsLink: "https://insights.deribit.com/exchange-updates/deribit-wallet-holdings/",
	},
	{
		name: "Kucoin",
		slug: "kucoin",
		coin: "kucoin-shares",
		coinSymbol: "KCS",
		walletsLink: "https://www.kucoin.com/blog/transparency-and-trust-a-detailed-list-of-kucoin-s-wallets"
	},
	{
		name: "Bitfinex",
		slug: "bitfinex",
		coin: null,
		walletsLink: "https://github.com/bitfinexcom/pub/blob/main/wallets.txt",
	},
	{
		name: "Huobi",
		slug: "Huobi",
		coin: "HT",
		coinSymbol: "HT",
		walletsLink: "https://www.huobi.com/support/en-us/detail/24922606430831",
	},
	{
		name: "Bybit",
		slug: "Bybit",
		coin: "BIT",
		coinSymbol: 'BIT',
		walletsLink: 'https://twitter.com/benbybit/status/1592797790518018048'
	},
	{
		name: "Coinbase",
		lastAuditDate: 1640908800,
		auditor: "Deloitte",
		auditLink: "https://d18rn0p25nwr6d.cloudfront.net/CIK-0001679788/8e5e0508-da75-434d-9505-cba99fa00147.pdf",
	},
	{
		name: "Kraken",
		lastAuditDate: 1656547200,
		auditor: "ArmaninoLLP",
		auditLink: "https://proof-of-reserves.trustexplorer.io/clients/kraken/",
	},
	{
		name: "Gate.io",
		lastAuditDate: 1666137600,
		auditor: "ArmaninoLLP",
		auditLink: "https://proof-of-reserves.trustexplorer.io/clients/gate.io",
	},
	{
		name: "Bitmex",
		coin: "LEO",
		coinSymbol: "LEO",
		walletsLink: "https://github.com/BitMEX/proof-of-reserves-liabilities",
	},
	{
		name: "NEXO",
	},
	{
		name: "CoinEx",
	},
	{
		name: "Gemini",
	},
	{
		name: "Coincheck",
	},
	{
		name: "Bitstamp",
	},
	{
		name: "Bithumb",
	},
	{
		name: "Bitget",
	},
	{
		name: "Poloniex",
	},
	{
		name: "Upbit",
	},
	{
		name: "Bitmart",
	},
	{
		name: "Bittrex",
	},
	{
		name: "Coinone",
	},
]

export async function getStaticProps() {
	const cexs = await Promise.all(cexData.map(async c=>{
		if(c.slug === undefined){
			return c
		} else{
			const {tvl, tokensInUsd} = await fetch(`https://api.llama.fi/updatedProtocol/${c.slug}`).then(r=>r.json())
			const cexTvl = tvl[tvl.length - 1].totalLiquidityUSD
			const ownToken = tokensInUsd[tokensInUsd.length - 1].tokens[c.coin] ?? 0
			return {
				...c,
				tvl: cexTvl,
				cleanTvl:  cexTvl - ownToken
			}
		}
	}))
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

		<CEXTable
			data={cexs}
		/>
		</Layout>
	)
}
