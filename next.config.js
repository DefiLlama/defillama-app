// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
const { withSentryConfig } = require('@sentry/nextjs')

const withBundleAnalyzer = require('@next/bundle-analyzer')({
	enabled: process.env.ANALYZE === 'true'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	async redirects() {
		return [
			{
				source: '/home',
				destination: '/',
				permanent: true
			},
			{
				source: '/chain/Binance',
				destination: '/chain/BSC',
				permanent: true
			},
			{
				source: '/chain/Kucoin',
				destination: '/chain/KCC',
				permanent: true
			},
			{
				source: '/chain/Cosmos',
				destination: '/chain/CosmosHub',
				permanent: true
			},
			{
				source: '/chain/Terra',
				destination: '/chain/Terra Classic',
				permanent: true
			},
			{
				source: '/chain/Nova',
				destination: '/chain/Nova Network',
				permanent: true
			},
			{
				source: '/chain/Milkomeda',
				destination: '/chain/Milkomeda C1',
				permanent: true
			},
			{
				source: '/chain/Elrond',
				destination: '/chain/MultiversX',
				permanent: true
			},
			{
				source: '/chain/RSK',
				destination: '/chain/Rootstock',
				permanent: true
			},
			{
				source: '/chain/OKExChain',
				destination: '/chain/OKTChain',
				permanent: true
			},
			{
				source: '/chain/Map',
				destination: '/chain/MAP Protocol',
				permanent: true
			},
			{
				source: '/chain/Pulse',
				destination: '/chain/PulseChain',
				permanent: true
			},
			{
				source: '/chain/WEMIX',
				destination: '/chain/WEMIX3.0',
				permanent: true
			},
			{
				source: '/chain/Umee',
				destination: '/chain/UX',
				permanent: true
			},
			{
				source: '/chain/TomoChain',
				destination: '/chain/Viction',
				permanent: true
			},
			{
				source: '/langs',
				destination: '/languages',
				permanent: true
			},
			{
				source: '/yields/project/:path*',
				destination: '/yields?project=:path*',
				permanent: true
			},
			{
				source: '/yields/token/:path*',
				destination: '/yields?token=:path*',
				permanent: true
			},
			{
				source: '/yields/chain/:path*',
				destination: '/yields?chain=:path*',
				permanent: true
			},
			{
				source: '/recent-noforks',
				destination: '/recent',
				permanent: true
			},
			{
				source: '/liquidations',
				destination: '/liquidations/eth',
				permanent: false
			},
			{
				source: '/yields/optimizer',
				destination: '/borrow',
				permanent: true
			},
			{
				source: '/aggregator',
				destination: 'https://swap.defillama.com/',
				permanent: true
			},
			{
				source: '/protocols/cex',
				destination: '/cexs',
				permanent: true
			},
			{
				source: '/yields/borrow',
				destination: '/yields',
				permanent: true
			},
			{
				source: '/compare-fdv',
				destination: '/compare-tokens',
				permanent: true
			}
		]
	},
	async headers() {
		return [
			{
				source: '/chart/:slug*', // Matches all /chart pages
				headers: [
					{
						key: 'X-Frame-Options',
						value: 'SAMEORIGIN'
					},
					{ key: 'Content-Security-Policy', value: 'frame-ancestors https:' }
				]
			}
		]
	},
	images: {
		domains: ['icons.llama.fi', 'assets.coingecko.com', 'yield-charts.llama.fi', 'icons.llamao.fi']
	},
	compiler: {
		styledComponents: true
	},
	generateBuildId: async () => {
		// get the latest git commit hash here
		const commitHash = Math.random().toString()//require('child_process').execSync('git rev-parse HEAD').toString().trim()
		return commitHash
	},
	experimental: {
		largePageDataBytes: 6_000_000
	}
}

module.exports = withBundleAnalyzer(nextConfig)

// if (process.env.SENTRY_DSN) {
// 	module.exports = withSentryConfig(module.exports, { silent: true }, { hideSourceMaps: true })
// }
