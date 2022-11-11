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
		slug: "Binance CEX"
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
]

export async function getStaticProps() {
	const { protocols } = await getProtocolsRaw()
	const cexTvl = protocols.filter(p=>p.category === "CEX")

	return {
		props: {
			cexs: cexData.map(c=>{
				const tvl = cexTvl.find(p=>p.name === c.slug)?.tvl
				if(tvl !== undefined){
					return {...c, tvl}
				}

				return c
			})
		},
		revalidate: revalidate()
	}
}

export default function Protocols({ cexs }) {
	return (
		<Layout title={`CEX Audits - DefiLlama`} defaultSEO>
			<Header>CEX Audits</Header>

		<CEXTable
			data={cexs}
		/>
		</Layout>
	)
}
