import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	// Increase timeout for static page generation (default is 60 seconds)
	staticPageGenerationTimeout: 300, // 5 minutes
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
				source: '/swap',
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
			},
			{
				source: '/tokenPnl',
				destination: '/token-pnl',
				permanent: true
			},
			{
				source: '/tokenUsage',
				destination: '/token-usage',
				permanent: true
			},
			{
				source: '/pro-api',
				destination: '/subscription',
				permanent: true
			},
			{
				source: '/lsd',
				destination: '/lst',
				permanent: true
			},
			{
				source: '/protocols/Dexes',
				destination: '/protocols/Dexs',
				permanent: true
			},
			{
				source: '/chain/Optimism',
				destination: '/chain/OP%20Mainnet',
				permanent: true
			},

			{
				source: '/chain/hyperliquid',
				destination: '/chain/hyperliquid-l1',
				permanent: true
			},
			{
				source: '/fees/chains/hyperliquid',
				destination: '/fees/chain/hyperliquid-l1',
				permanent: true
			},
			{
				source: '/fees/chain/hyperliquid',
				destination: '/fees/chain/hyperliquid-l1',
				permanent: true
			},
			{
				source: '/dexs/chains/hyperliquid',
				destination: '/dexs/chain/hyperliquid-l1',
				permanent: true
			},
			{
				source: '/dexs/chain/hyperliquid',
				destination: '/dexs/chain/hyperliquid-l1',
				permanent: true
			},
			{
				source: '/perps/chains/hyperliquid',
				destination: '/perps/chain/hyperliquid-l1',
				permanent: true
			},
			{
				source: '/perps/chain/hyperliquid',
				destination: '/perps/chain/hyperliquid-l1',
				permanent: true
			},
			{
				source: '/protocol',
				destination: '/protocols',
				permanent: true
			},
			{
				source: '/chain',
				destination: '/chains',
				permanent: true
			},
			{
				source: '/stablecoin',
				destination: '/stablecoins',
				permanent: true
			},
			{
				source: '/fee',
				destination: '/fees',
				permanent: true
			},
			{
				source: '/perp',
				destination: '/perps',
				permanent: true
			},
			{
				source: '/unlock',
				destination: '/unlocks',
				permanent: true
			},
			{
				source: '/oracle',
				destination: '/oracles',
				permanent: true
			},
			{
				source: '/fork',
				destination: '/forks',
				permanent: true
			},
			{
				source: '/top-protocol',
				destination: '/top-protocols',
				permanent: true
			},
			{
				source: '/airdrop',
				destination: '/airdrops',
				permanent: true
			},
			{
				source: '/compare-chain',
				destination: '/compare-chains',
				permanent: true
			},
			{
				source: '/category',
				destination: '/categories',
				permanent: true
			},
			{
				source: '/protocol-expense',
				destination: '/protocol-expenses',
				permanent: true
			},
			{
				source: '/yield',
				destination: '/yields',
				permanent: true
			},
			{
				source: '/bridge',
				destination: '/bridges',
				permanent: true
			},
			{
				source: '/fees/simple',
				destination: '/fees',
				permanent: true
			},
			{
				source: '/fees/simple/chains',
				destination: '/fees',
				permanent: true
			},
			{
				source: '/fees/simple/chains/:slug',
				destination: '/fees/chain/:slug',
				permanent: true
			},
			{
				source: '/fees/chains/:slug',
				destination: '/fees/chain/:slug',
				permanent: true
			},
			{
				source: '/dex',
				destination: '/dexs',
				permanent: true
			},
			{
				source: '/dex/chain',
				destination: '/dexs/chains',
				permanent: true
			},
			{
				source: '/dex/chains',
				destination: '/dexs/chains',
				permanent: true
			},
			{
				source: '/dexs/chain',
				destination: '/dexs/chains',
				permanent: true
			},
			{
				source: '/dex/chains/:slug',
				destination: '/dexs/chain/:slug',
				permanent: true
			},
			{
				source: '/dexs/chains/:slug',
				destination: '/dexs/chain/:slug',
				permanent: true
			},
			{
				source: '/derivatives',
				destination: '/perps',
				permanent: true
			},
			{
				source: '/derivatives/chains',
				destination: '/perps/chains',
				permanent: true
			},
			{
				source: '/derivatives/chain/:slug',
				destination: '/perps/chain/:slug',
				permanent: true
			},
			{
				source: '/derivatives/chains/:slug',
				destination: '/perps/chain/:slug',
				permanent: true
			},
			{
				source: '/perp',
				destination: '/perps',
				permanent: true
			},
			{
				source: '/perps/chain',
				destination: '/perps/chains',
				permanent: true
			},
			{
				source: '/perps/chains/:slug',
				destination: '/perps/chain/:slug',
				permanent: true
			},
			{
				source: '/option',
				destination: '/options/premium-volume',
				permanent: true
			},
			{
				source: '/options',
				destination: '/options/premium-volume',
				permanent: true
			},
			{
				source: '/options/chain',
				destination: '/options/premium-volume/chains',
				permanent: true
			},
			{
				source: '/options/chains',
				destination: '/options/premium-volume/chains',
				permanent: true
			},
			{
				source: '/options/chains/:slug',
				destination: '/options/premium-volume/chain/:slug',
				permanent: true
			},
			{
				source: '/aggregator',
				destination: '/dex-aggregators',
				permanent: true
			},
			{
				source: '/aggregators',
				destination: '/dex-aggregators',
				permanent: true
			},
			{
				source: '/aggregators/chain',
				destination: '/dex-aggregators/chains',
				permanent: true
			},
			{
				source: '/aggregators/chains',
				destination: '/dex-aggregators/chains',
				permanent: true
			},
			{
				source: '/aggregators/chain/:slug',
				destination: '/dex-aggregators/chain/:slug',
				permanent: true
			},
			{
				source: '/aggregators/chains/:slug',
				destination: '/dex-aggregators/chain/:slug',
				permanent: true
			},
			{
				source: '/dex-aggregators/chains/:slug',
				destination: '/dex-aggregators/chain/:slug',
				permanent: true
			},
			{
				source: '/derivatives-aggregator',
				destination: '/perps-aggregators',
				permanent: true
			},
			{
				source: '/derivatives-aggregator/chains',
				destination: '/perps-aggregators/chains',
				permanent: true
			},
			{
				source: '/derivatives-aggregator/chain/:slug',
				destination: '/perps-aggregators/chain/:slug',
				permanent: true
			},
			{
				source: '/derivatives-aggregator/chains/:slug',
				destination: '/perps-aggregators/chain/:slug',
				permanent: true
			},
			{
				source: '/perps-aggregator/chains/:slug',
				destination: '/perps-aggregators/chain/:slug',
				permanent: true
			},
			{
				source: '/perps-aggregator',
				destination: '/perps-aggregators',
				permanent: true
			},
			{
				source: '/perps-aggregators/chains/:slug',
				destination: '/perps-aggregators/chain/:slug',
				permanent: true
			},
			{
				source: '/bridge-aggregator',
				destination: '/bridge-aggregators',
				permanent: true
			},
			{
				source: '/bridge-aggregators/chains',
				destination: '/bridge-aggregators',
				permanent: true
			},
			{
				source: '/bridge-aggregators/chains/:slug',
				destination: '/bridge-aggregators/chain/:slug',
				permanent: true
			},
			{
				source: '/etf',
				destination: '/etfs',
				permanent: true
			},
			{
				source: '/raise',
				destination: '/raises',
				permanent: true
			},
			{
				source: '/hack',
				destination: '/hacks',
				permanent: true
			},
			{
				source: '/compare',
				destination: '/comapre-chains',
				permanent: true
			},
			{
				source: '/comparison',
				destination: '/compare-protocols',
				permanent: true
			},
			{
				source: '/compare-chain',
				destination: '/comapre-chains',
				permanent: true
			},
			{
				source: '/compare-protocol',
				destination: '/compare-protocols',
				permanent: true
			},
			{
				source: '/stables',
				destination: '/stablecoins',
				permanent: true
			},
			{
				source: '/docs',
				destination: '/docs/api',
				permanent: true
			},
			{
				source: '/donate',
				destination: '/donations',
				permanent: true
			},
			{
				source: '/subscribe',
				destination: '/subscription',
				permanent: true
			},
			{
				source: '/docs/api',
				destination: 'https://api-docs.defillama.com/',
				permanent: true
			},
			{
				source: '/pro-api/docs',
				destination: 'https://api-docs.defillama.com/',
				permanent: true
			},
			{
				source: '/net-protocol-treasury',
				destination: '/net-project-treasury',
				permanent: true
			},
			{
				source: '/docs',
				destination: 'https://api-docs.defillama.com/',
				permanent: true
			},
			{
				source: '/treasury',
				destination: '/treasuries',
				permanent: true
			},
			{
				source: '/bridged-tvl',
				destination: '/bridged',
				permanent: true
			},
			{
				source: '/digital-asset-treasury',
				destination: '/digital-asset-treasuries',
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
					{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }
				]
			},
			{
				source: '/assets/llamaai.mp4',
				headers: [
					{
						key: 'Accept-Ranges',
						value: 'bytes'
					},
					{
						key: 'Content-Type',
						value: 'video/mp4'
					}
				]
			},
			{
				source: '/api/video/llamaai',
				headers: [
					{
						key: 'Accept-Ranges',
						value: 'bytes'
					},
					{
						key: 'Content-Type',
						value: 'video/mp4'
					},
					{
						key: 'Access-Control-Allow-Origin',
						value: '*'
					},
					{
						key: 'Access-Control-Allow-Methods',
						value: 'GET, HEAD, OPTIONS'
					},
					{
						key: 'Access-Control-Allow-Headers',
						value: 'Range'
					},
					{
						key: 'Access-Control-Expose-Headers',
						value: 'Content-Range, Content-Length, Accept-Ranges'
					}
				]
			}
		]
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'icons.llama.fi'
			},
			{
				protocol: 'https',
				hostname: 'assets.coingecko.com'
			},
			{
				protocol: 'https',
				hostname: 'yield-charts.llama.fi'
			},
			{
				protocol: 'https',
				hostname: 'icons.llamao.fi'
			}
		]
	}
}

export default nextConfig
