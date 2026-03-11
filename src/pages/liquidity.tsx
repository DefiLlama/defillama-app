import Head from 'next/head'

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
			<iframe
				title="Token Liquidity"
				className="col-span-full -mb-4 h-screen w-full border-0"
				src="https://swap.defillama.com/token-liquidity"
				sandbox="allow-scripts"
			/>
		</>
	)
}
