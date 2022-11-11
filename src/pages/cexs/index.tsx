import Layout from '~/layout'
import { revalidate } from '~/api'
import { getProtocolsRaw } from '~/api/categories/protocols'
import { Header } from '~/Theme'
import { CEXTable } from '~/components/Table/Defi'

const cexData = [
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
		name: "Binance",
		slug: "Binance-CEX"
	},
	{
		name: "Crypto.com",
		slug: "Crypto.com",
	},
	{
		name: "Kucoin",
	},
	{
		name: "Bitfinex",
	},
	{
		name: "OKX",
	},
	{
		name: "Bybit",
	},
	{
		name: "NEXO",
		lastAuditDate: 1668173147,
		auditor: "ArmaninoLLP",
		auditLink: "https://real-time-attest.trustexplorer.io/nexo",
	},
]

export async function getStaticProps() {
	const cexs = await Promise.all(cexData.map(async c=>{
		if(c.slug === undefined){
			return c
		} else{
			const {tvl} = await fetch(`https://api.llama.fi/updatedProtocol/${c.slug}`).then(r=>r.json())
			return {...c, tvl: tvl[tvl.length - 1].totalLiquidityUSD}
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
