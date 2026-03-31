import Head from 'next/head'
import { TemporarilyDisabledPage } from '~/components/TemporarilyDisabledPage'

export default function Liquidity() {
	return (
		<>
			<Head>
				<title>Token Liquidity - DefiLlama</title>
				<meta
					name="description"
					content="Check token liquidity and swap depth across decentralized exchanges on DefiLlama."
				/>
			</Head>
			{/* <iframe
				title="Token Liquidity"
				className="col-span-full -mb-4 h-screen w-full border-0"
				src="https://swap.defillama.com/token-liquidity"
				sandbox="allow-scripts"
			/> */}
			<TemporarilyDisabledPage
				title="Token Liquidity"
				description="Check token liquidity and swap depth across decentralized exchanges on DefiLlama."
			>
				<p>Token liquidity data is not available on DefiLlama for the time being.</p>
				<p>We&apos;re working on bringing this page back in a future update.</p>
			</TemporarilyDisabledPage>
		</>
	)
}
