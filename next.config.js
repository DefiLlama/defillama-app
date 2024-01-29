// This file sets a custom webpack configuration to use your Next.js app
// https://nextjs.org/docs/api-reference/next.config.js/introduction

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
			},
			{
				source: '/yields/borrow',
				destination: '/yields',
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
		const commitHash = require('child_process').execSync('git rev-parse HEAD').toString().trim()
		return commitHash
	},
	cacheMaxMemorySize: 0,
	experimental: {
		largePageDataBytes: 6_000_000
	}
}

module.exports = withBundleAnalyzer(nextConfig)
