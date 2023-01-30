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
			}
		]
	},
	images: {
		domains: ['icons.llama.fi', 'assets.coingecko.com', 'yield-charts.llamao.fi', 'icons.llamao.fi']
	},
	compiler: {
		styledComponents: true
	},
	experimental: {
		largePageDataBytes: 2_000_000
	}
}

module.exports = withBundleAnalyzer(nextConfig)
