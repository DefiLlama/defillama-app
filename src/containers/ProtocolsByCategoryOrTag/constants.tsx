import type { ProtocolChartsQueryParams } from '~/containers/ProtocolOverview/constants'
import { capitalizeFirstLetter } from '~/utils'

export type ProtocolCategoryChartMetric =
	| 'tvl'
	| 'dexVolume'
	| 'dexAggregatorsVolume'
	| 'perpVolume'
	| 'openInterest'
	| 'optionsPremiumVolume'
	| 'optionsNotionalVolume'
	| 'borrowed'
	| 'staking'

export interface ProtocolCategoryMetrics {
	tvl?: boolean
	dexVolume?: boolean
	dexAggregatorsVolume?: boolean
	perpVolume?: boolean
	openInterest?: boolean
	optionsPremiumVolume?: boolean
	optionsNotionalVolume?: boolean
	borrowed?: boolean
	staking?: boolean
}

export interface ProtocolCategoryConfig {
	description: string
	defaultChart?: ProtocolChartsQueryParams
	headingLabel?: string
	seoLabel?: string
	seoBaseTitle?: string
	seoTitleSuffix?: string
	tableHeader?: string
	searchPlaceholder?: string
	metrics?: ProtocolCategoryMetrics
	columns?: string[]
	defaultSort?: string
}

const DEFAULT_COLUMNS = [
	'name',
	'tvl',
	'fees_7d',
	'revenue_7d',
	'mcap/tvl',
	'fees_30d',
	'revenue_30d',
	'fees_24h',
	'revenue_24h'
]

export const protocolCategoryConfig: Record<string, ProtocolCategoryConfig> = {
	Dexs: {
		description: 'Protocols where you can swap/trade cryptocurrency',
		defaultChart: 'dexVolume',
		seoBaseTitle: 'Crypto DEX Protocols - Volume, TVL, Fees, & Revenue',
		metrics: { dexVolume: true },
		columns: [
			'name',
			'tvl',
			'dex_volume_7d',
			'fees_7d',
			'revenue_7d',
			'mcap/tvl',
			'dex_volume_30d',
			'fees_30d',
			'revenue_30d',
			'dex_volume_24h',
			'fees_24h',
			'revenue_24h'
		],
		defaultSort: 'dex_volume_7d'
	},
	Yield: {
		description: 'Protocols that pay you a reward for your staking/LP on their platform',
		seoBaseTitle: 'Top DeFi Yield Protocols - TVL, Fees, & Revenue'
	},
	Lending: {
		description: 'Protocols that allow users to borrow and lend assets',
		seoBaseTitle: 'DeFi Lending Protocols - TVL, Fees, & Revenue',
		metrics: { borrowed: true },
		columns: [
			'name',
			'tvl',
			'fees_7d',
			'revenue_7d',
			'mcap/tvl',
			'fees_30d',
			'revenue_30d',
			'fees_24h',
			'revenue_24h',
			'borrowed',
			'supplied',
			'supplied/tvl'
		]
	},
	'Cross Chain Bridge': {
		description:
			'Protocols that transfer assets between different blockchains through pooled liquidity on each network, instead of relying on mint/burn mechanisms',
		defaultChart: 'bridgeVolume',
		headingLabel: 'Cross-Chain Bridges',
		seoLabel: 'Cross-Chain Bridges',
		seoBaseTitle: 'Cross-Chain Bridges - TVL, Fees, & Revenue',
		searchPlaceholder: 'Search cross-chain bridges...'
	},
	Staking: { description: 'Protocols that allow you to stake assets in exchange of a reward' },
	Services: {
		description: 'Protocols that provide a service to the user',
		defaultChart: 'revenue',
		defaultSort: 'revenue_7d'
	},
	'Yield Aggregator': {
		description: 'Protocols that aggregated yield from diverse protocols',
		headingLabel: 'Yield Aggregators',
		seoLabel: 'Yield Aggregators',
		seoBaseTitle: 'Top DeFi Yield Aggregators - TVL, Fees, & Revenue',
		searchPlaceholder: 'Search yield aggregators...'
	},
	Minting: { description: 'Protocols NFT minting Related (in work)' },
	Assets: { description: '(will be removed)' },
	Derivatives: {
		description: 'Protocols for betting with leverage',
		defaultChart: 'perpVolume',
		seoBaseTitle: 'Crypto Derivatives Protocols - Volume, Fees, & Revenue',
		metrics: { perpVolume: true, openInterest: true },
		columns: [
			'name',
			'perp_volume_24h',
			'openInterest',
			'perp_volume_7d',
			'perp_volume_30d',
			'tvl',
			'fees_7d',
			'revenue_7d',
			'mcap/tvl',
			'fees_30d',
			'revenue_30d',
			'fees_24h',
			'revenue_24h'
		],
		defaultSort: 'perp_volume_24h'
	},
	Payments: {
		description: 'Protocols that offer the ability to pay/send/receive cryptocurrency',
		seoBaseTitle: 'Crypto Payment Protocols - TVL & Revenue'
	},
	Privacy: {
		description: 'Protocols that have the intention of hiding information about transactions',
		seoBaseTitle: 'Crypto Privacy Protocols - TVL & Revenue'
	},
	Insurance: {
		description: 'Protocols that are designed to provide monetary protections',
		seoBaseTitle: 'DeFi Insurance Protocols - TVL, Fees, & Revenue'
	},
	Indexes: {
		description: 'Protocols that have a way to track/created the performance of a group of related assets',
		seoBaseTitle: 'Crypto Index Protocols - TVL & Revenue'
	},
	Synthetics: {
		description: 'Protocol that created a tokenized derivative that mimics the value of another asset.',
		seoBaseTitle: 'DeFi Synthetic Asset Protocols - TVL & Revenue'
	},
	CDP: {
		description: 'Protocols that mint its own stablecoin using collateralized lending',
		headingLabel: 'CDPs',
		seoLabel: 'CDPs',
		searchPlaceholder: 'Search CDPs...'
	},
	Bridge: {
		description: 'Protocols that bridge tokens from one network to another',
		defaultChart: 'bridgeVolume',
		headingLabel: 'Bridges',
		seoLabel: 'Bridges',
		seoBaseTitle: 'Crypto Bridge Protocols - TVL, Volume, & Fees',
		searchPlaceholder: 'Search bridges...'
	},
	'Reserve Currency': {
		description: 'Protocols that use a reserve of valuable assets to back its native token. Includes OHM forks'
	},
	Options: {
		description: 'Protocols that give you the right to buy an asset at a fixed price',
		defaultChart: 'optionsPremiumVolume',
		seoBaseTitle: 'DeFi Options Protocols - TVL, Volume, Fees, & Revenue',
		metrics: { optionsPremiumVolume: true, optionsNotionalVolume: true },
		columns: [
			'name',
			'tvl',
			'options_premium_7d',
			'options_notional_7d',
			'fees_7d',
			'revenue_7d',
			'mcap/tvl',
			'options_premium_30d',
			'options_notional_30d',
			'fees_30d',
			'revenue_30d',
			'options_premium_24h',
			'options_notional_24h',
			'fees_24h',
			'revenue_24h'
		],
		defaultSort: 'options_premium_7d'
	},
	Launchpad: {
		description: 'Protocols that launch new projects and coins',
		defaultChart: 'revenue',
		headingLabel: 'Launchpads',
		seoLabel: 'Launchpads',
		seoBaseTitle: 'Crypto Launchpad Protocols - Revenue & TVL',
		tableHeader: 'Launchpad Rankings',
		searchPlaceholder: 'Search launchpads...',
		defaultSort: 'revenue_7d'
	},
	Gaming: { description: 'Protocols that have gaming components' },
	'Prediction Market': {
		description: 'Protocols that allow you to wager/bet/buy in future results',
		defaultChart: 'dexVolume',
		metrics: { dexVolume: true },
		headingLabel: 'Prediction Markets',
		seoLabel: 'Prediction Markets',
		seoBaseTitle: 'Top Crypto Prediction Markets - TVL, Volume, & Revenue',
		seoTitleSuffix: 'Rankings',
		tableHeader: 'Market Rankings',
		searchPlaceholder: 'Search markets...',
		columns: [
			'name',
			'tvl',
			'dex_volume_7d',
			'fees_7d',
			'revenue_7d',
			'mcap/tvl',
			'dex_volume_30d',
			'fees_30d',
			'revenue_30d',
			'dex_volume_24h',
			'fees_24h',
			'revenue_24h'
		],
		defaultSort: 'dex_volume_7d'
	},
	'Algo-Stables': { description: 'Protocols that provide algorithmic coins to stablecoins' },
	'NFT Marketplace': {
		description: 'Protocols where users can buy/sell/rent NFTs',
		defaultChart: 'revenue',
		seoBaseTitle: 'Top Crypto NFT Marketplaces - Volume & Revenue',
		defaultSort: 'revenue_7d'
	},
	'NFT Lending': {
		description: 'Protocols that allow you to collateralize your NFT for a loan',
		defaultChart: 'revenue',
		seoBaseTitle: 'NFT Lending Protocols - TVL & Revenue',
		defaultSort: 'revenue_7d'
	},
	RWA: {
		description: 'Protocols that involve Real World Assets, such as house tokenization',
		seoLabel: 'Real World Assets on Chain (RWA)',
		seoTitleSuffix: 'Rankings',
		tableHeader: 'Assets Rankings'
	},
	'RWA Lending': {
		description:
			'Protocols that bridge traditional finance and blockchain ecosystems by tokenizing real-world assets for use as collateral or credit assessment, enabling decentralized lending and borrowing opportunities.'
	},
	Farm: {
		description: 'Protocols that allow users to lock money in exchange for a protocol token',
		headingLabel: 'Farms',
		seoLabel: 'Farms',
		seoBaseTitle: 'DeFi Farms - TVL, Fees, & Revenue',
		searchPlaceholder: 'Search farms...'
	},
	'Liquid Staking': {
		description:
			'Protocols that enable you to earn staking rewards on your tokens while also providing a tradeable and liquid receipt for your staked position',
		seoBaseTitle: 'Liquid Staking Protocols - TVL, Fees, & Revenue',
		metrics: { staking: true }
	},
	Oracle: {
		description: 'Protocols that connect data from the outside world (off-chain) with the blockchain world (Onchain)',
		headingLabel: 'Oracles',
		seoLabel: 'Oracles',
		tableHeader: 'Oracle Rankings',
		searchPlaceholder: 'Search oracles...'
	},
	'Leveraged Farming': {
		description: 'Protocols that allow you to leverage yield farm with borrowed money',
		seoBaseTitle: 'DeFi Leveraged Farming Protocols - TVL & Revenue'
	},
	'Options Vault': {
		description: 'Protocols that allow you to deposit collateral into an options strategy',
		defaultChart: 'optionsNotionalVolume',
		headingLabel: 'Options Vaults',
		seoLabel: 'Options Vaults',
		searchPlaceholder: 'Search options vaults...'
	},
	'Uncollateralized Lending': {
		description: 'Protocol that allows you to lend against known parties that can borrow without collaterall'
	},
	'Exotic Options': { description: 'Protocols that provide option vaults while also adding borrowing on top' },
	'Liquidity Manager': { description: 'Protocols that manage Liquidity Positions in concentrated liquidity AMMs' },
	'Staking Pool': {
		description:
			"Refers to platforms where users stake their assets using smart contracts on native blockchains to help secure the network and earn rewards but don't receive a receipt token to use in other Defi apps like with Liquid Staking projects",
		headingLabel: 'Staking Pools',
		seoLabel: 'Staking Pools',
		searchPlaceholder: 'Search staking pools...'
	},
	'Partially Algorithmic Stablecoin': {
		description:
			'Coins pegged to USD through decentralized mechanisms, but uses an algorithmic mechanism to keep it stable',
		headingLabel: 'Partially Algorithmic Stablecoins',
		seoLabel: 'Partially Algorithmic Stablecoins',
		searchPlaceholder: 'Search partially algorithmic stablecoins...'
	},
	SoFi: {
		description: 'Social Finance Networks',
		defaultChart: 'revenue',
		defaultSort: 'revenue_7d'
	},
	'DEX Aggregator': {
		description:
			'A platform that sources liquidity from various decentralized exchanges to provide optimal trade execution in terms of price and slippage',
		defaultChart: 'dexAggregatorVolume',
		headingLabel: 'DEX Aggregators',
		seoLabel: 'DEX Aggregators',
		seoBaseTitle: 'Crypto DEX Aggregator Protocols - Volume, TVL, & Fees',
		searchPlaceholder: 'Search DEX aggregators...',
		metrics: { dexAggregatorsVolume: true },
		columns: [
			'name',
			'tvl',
			'dex_volume_7d',
			'fees_7d',
			'revenue_7d',
			'mcap/tvl',
			'dex_volume_30d',
			'fees_30d',
			'revenue_30d',
			'dex_volume_24h',
			'fees_24h',
			'revenue_24h'
		],
		defaultSort: 'dex_volume_7d'
	},
	'DEX Aggregators': {
		description:
			'A platform that sources liquidity from various decentralized exchanges to provide optimal trade execution in terms of price and slippage',
		defaultChart: 'dexAggregatorVolume',
		headingLabel: 'DEX Aggregators',
		seoLabel: 'DEX Aggregators',
		seoBaseTitle: 'Crypto DEX Aggregator Protocols - Volume, TVL, & Fees',
		searchPlaceholder: 'Search DEX aggregators...',
		metrics: { dexAggregatorsVolume: true },
		columns: [
			'name',
			'tvl',
			'dex_volume_7d',
			'fees_7d',
			'revenue_7d',
			'mcap/tvl',
			'dex_volume_30d',
			'fees_30d',
			'revenue_30d',
			'dex_volume_24h',
			'fees_24h',
			'revenue_24h'
		],
		defaultSort: 'dex_volume_7d'
	},
	Restaking: {
		description: 'Protocols that allow you to stake the same ETH natively and in others protocols',
		seoBaseTitle: 'Restaking Protocols - TVL & Rewards'
	},
	'Liquid Restaking': {
		description: 'Protocols that create a liquid token for restaking',
		seoBaseTitle: 'Liquid Restaking Protocols - TVL, Fees, & Revenue'
	},
	Wallets: {
		description: 'Protocols where you have a form of digital storage to secure access to your crypto.',
		defaultChart: 'revenue',
		tableHeader: 'Wallets TVL Rankings',
		searchPlaceholder: 'Search wallets...',
		defaultSort: 'revenue_7d'
	},
	NftFi: { description: 'NFT leverage protocols' },
	'Telegram Bot': {
		description: 'Trading bots for Telegram users',
		defaultChart: 'revenue',
		headingLabel: 'Telegram Bots',
		seoLabel: 'Telegram Bots',
		tableHeader: 'Telegram Bot Rankings',
		searchPlaceholder: 'Search telegram bots...',
		defaultSort: 'revenue_7d'
	},
	Ponzi: {
		description:
			'Farms promising high rates of return, where the money from new investors is used to pay earlier investors'
	},
	'Basis Trading': {
		description:
			'Projects simultaneously buying and selling crypto futures to profit from price differences between the spot and futures markets'
	},
	MEV: {
		description: 'MEV Layer',
		seoBaseTitle: 'MEV (Maximal Extractable Value) Protocols - TVL & Revenue'
	},
	CeDeFi: {
		description: 'Projects that incorporate elements of centralization within their product strategies',
		seoBaseTitle: 'CeDeFi (Centralized DeFi) Protocols - TVL & Revenue'
	},
	'CDP Manager': {
		description: 'Protocols that manage CDPs',
		headingLabel: 'CDP Managers',
		seoLabel: 'CDP Managers',
		tableHeader: 'CDP Manager Rankings',
		searchPlaceholder: 'Search CDP managers...'
	},
	'Governance Incentives': {
		description:
			'Protocols that facilitate governance participation by offering incentives or rewards for token holders voting power'
	},
	'Security Extension': {
		description: 'A browser extension that protects Web3 users from malicious activities and exploits',
		headingLabel: 'Security Extensions',
		seoLabel: 'Security Extensions',
		tableHeader: 'Security Extension Rankings',
		searchPlaceholder: 'Search security extensions...'
	},
	'AI Agents': {
		description:
			'Smart programs that use AI to handle tasks and make crypto interactions easier for blockchain platforms',
		tableHeader: 'AI Agents Rankings',
		searchPlaceholder: 'Search AI Agents...'
	},
	'Treasury Manager': {
		description:
			'Protocols that help organizations manage and optimize their treasury assets and funds using automated strategies',
		headingLabel: 'Treasury Managers',
		seoLabel: 'Treasury Managers',
		tableHeader: 'Treasury Manager Rankings',
		searchPlaceholder: 'Search treasury managers...'
	},
	'OTC Marketplace': {
		description:
			'A decentralized platform where users can trade assets directly peer-to-peer, using secure smart contracts'
	},
	'Yield Lottery': {
		description: 'DeFi protocol where users deposit funds for a chance to win the pooled yield as prizes'
	},
	'Token Locker': {
		description:
			'Protocols that lock digital assets like fungible tokens, NFTs, and LP tokens, ensuring restricted access for a set duration',
		headingLabel: 'Token Lockers',
		seoLabel: 'Token Lockers',
		tableHeader: 'Token Locker Rankings',
		searchPlaceholder: 'Search token lockers...'
	},
	'Bug Bounty': {
		description: 'Protocols that incentivize security researchers to find and report vulnerabilities in smart contracts'
	},
	'DCA Tools': {
		description:
			'Protocols that automate dollar-cost averaging, allowing users to make regular crypto investments automatically'
	},
	'Onchain Capital Allocator': {
		description:
			'Protocols where token pools are actively controlled and managed by a designated operator or governance',
		defaultChart: 'fees'
	},
	'Developer Tools': {
		description:
			'Platforms and services providing APIs, integrations, or other resources to facilitate the development and management of blockchain applications',
		defaultSort: 'revenue_7d'
	},
	'Stablecoin Issuer': {
		description:
			'Company that creates and manages stablecoins designed to maintain a stable value, typically pegged to a fiat like the US dollar',
		defaultChart: 'revenue',
		headingLabel: 'Stablecoin Issuers',
		seoLabel: 'Stablecoin Issuers',
		tableHeader: 'Stablecoin Issuer Rankings',
		searchPlaceholder: 'Search stablecoin issuers...',
		defaultSort: 'revenue_7d'
	},
	'Coins Tracker': {
		description:
			'A tool that aggregates and displays real-time token prices, trading volumes, and market trends from decentralized exchanges',
		headingLabel: 'Coin Trackers',
		seoLabel: 'Coin Trackers',
		tableHeader: 'Coin Tracker Rankings',
		searchPlaceholder: 'Search coin trackers...'
	},
	Domains: {
		description: 'Decentralized naming services that map human-readable names to blockchain addresses',
		defaultSort: 'revenue_7d'
	},
	'NFT Launchpad': {
		description: 'Platforms that enable creators to mint, manage, and launch NFT collections',
		defaultSort: 'revenue_7d'
	},
	'Trading App': {
		description:
			'Apps that simplify trading tokens like memecoins with user-friendly interfaces, real-time updates, self-custodial tools, and direct fiat on-ramps for casual traders',
		headingLabel: 'Trading Apps',
		seoLabel: 'Trading Apps',
		tableHeader: 'Trading App Rankings',
		searchPlaceholder: 'Search trading apps...',
		defaultSort: 'revenue_7d'
	},
	Foundation: {
		description:
			'A foundation supporting blockchain ecosystems by funding research, development, and community initiatives',
		headingLabel: 'Foundations',
		seoLabel: 'Foundations',
		tableHeader: 'Foundation Rankings',
		searchPlaceholder: 'Search foundations...'
	},
	Liquidations: {
		description: 'Protocols that enable the purchase of liquidated collateral from lending platforms or CDP protocols'
	},
	'Bridge Aggregator': {
		description:
			'Protocols that consolidate multiple bridging solutions, allowing users to transfer assets across different blockchains by finding the most efficient routes',
		defaultChart: 'bridgeAggregatorVolume',
		headingLabel: 'Bridge Aggregators',
		seoLabel: 'Bridge Aggregators',
		searchPlaceholder: 'Search bridge aggregators...'
	},
	'Restaked BTC': {
		description:
			'Protocols that enable users to stake their Bitcoin (BTC) natively, receiving a representative receipt token in return'
	},
	'Decentralized BTC': {
		description:
			'Tokens that represent Bitcoin in a decentralized manner, backed and issued through trustless mechanisms such as smart contracts, without reliance on centralized custodians.',
		headingLabel: 'Decentralized BTC Tokens',
		seoLabel: 'Decentralized BTC Tokens',
		tableHeader: 'Decentralized BTC Token Rankings',
		searchPlaceholder: 'Search decentralized BTC tokens...'
	},
	'Anchor BTC': {
		description:
			'Tokens indirectly tied to Bitcoin, backed by assets or instruments that are themselves backed by Bitcoin, offering exposure with additional flexibility but not a direct 1:1 representation of BTC.',
		headingLabel: 'Anchor BTC Tokens',
		seoLabel: 'Anchor BTC Tokens',
		tableHeader: 'Anchor BTC Token Rankings',
		searchPlaceholder: 'Search anchor BTC tokens...'
	},
	'Portfolio Tracker': {
		description: 'Tools that monitor token balances and performance',
		headingLabel: 'Portfolio Trackers',
		seoLabel: 'Portfolio Trackers',
		tableHeader: 'Portfolio Tracker Rankings',
		searchPlaceholder: 'Search portfolio trackers...'
	},
	'Liquidity Automation': {
		description: 'Automatically manages and adjusts liquidity in DeFi protocols through smart contracts'
	},
	'Charity Fundraising': {
		description: 'Projects that raise capital for DeFi projects through grants, or community contributions'
	},
	'Volume Boosting': {
		description:
			'Protocols that artificially increase trading volume and liquidity for tokens, boosting market perception'
	},
	DOR: {
		description:
			'Decentralized Offered Rates - The DOR mechanism provides a decentralized benchmark rate for crypto assets'
	},
	'Collateral Management': {
		description: 'Protocols that manage or leverage Onchain collateral for financial applications'
	},
	Meme: {
		description:
			'Tokens inspired by internet culture, trends, or public figures. Typically community-driven and speculative in nature.',
		headingLabel: 'Meme Tokens',
		seoLabel: 'Meme Tokens',
		tableHeader: 'Meme Token Rankings',
		searchPlaceholder: 'Search meme tokens...'
	},
	'Private Investment Platform': {
		description:
			'Protocols that coordinate private, gated investment opportunities onchain, typically for startups or early-stage projects, often led by curated investor groups',
		headingLabel: 'Private Investment Platforms',
		seoLabel: 'Private Investment Platforms',
		tableHeader: 'Private Investment Platform Rankings',
		searchPlaceholder: 'Search private investment platforms...'
	},
	'Risk Curators': {
		description:
			'Projects that analyze DeFi risks and help users choose strategies across lending, trading, or staking systems to improve safety and returns.'
	},
	'DAO Service Provider': {
		description: 'Protocols that provide services to DAOs',
		headingLabel: 'DAO Service Providers',
		seoLabel: 'DAO Service Providers',
		tableHeader: 'DAO Service Provider Rankings',
		searchPlaceholder: 'Search DAO service providers...'
	},
	'Staking Rental': { description: 'Protocols that facilitate the borrowing or renting of staking rights' },
	'Canonical Bridge': {
		description: 'The official bridge designated by a blockchain for transferring its assets across networks',
		defaultChart: 'bridgeVolume',
		headingLabel: 'Canonical Bridges',
		seoLabel: 'Canonical Bridges',
		searchPlaceholder: 'Search canonical bridges...'
	},
	Interface: {
		description: 'Projects that provide a user interface to interact with external protocols',
		defaultChart: 'perpVolume',
		metrics: { perpVolume: true },
		columns: [
			'name',
			'perp_volume_24h',
			'perp_volume_7d',
			'perp_volume_30d',
			'fees_7d',
			'revenue_7d',
			'mcap/tvl',
			'fees_30d',
			'revenue_30d',
			'fees_24h',
			'revenue_24h'
		],
		defaultSort: 'perp_volume_24h'
	},
	'Video Infrastructure': {
		description:
			'Protocols that provide decentralized tools and infrastructure for video streaming, transcoding, recording, playback, or media processing'
	},
	DePIN: {
		description:
			'Protocols that provide decentralized infrastructure for physical assets, such as sensors, devices, or networks, enabling real-world data collection and processing via Onchain rewards and governance'
	},
	'Dual-Token Stablecoin': {
		description:
			'Protocols that maintain a USD peg through a dual-token system where one token serves as the stablecoin and the other absorbs volatility, using overcollateralized reserves and algorithmic mechanisms to adjust supply and maintain stability',
		headingLabel: 'Dual-Token Stablecoins',
		seoLabel: 'Dual-Token Stablecoins',
		searchPlaceholder: 'Search dual-token stablecoins...'
	},
	'Physical TCG': { description: 'Protocols that allow you to trade physical trading cards' },
	'Mining Pools': { description: 'Protocols that coordinate user resources into shared mining pools' },
	'NFT Automated Strategies': {
		description:
			'Protocols that deploy automated trading and capital allocation strategies around NFTs, such as floor buying, relisting, and supply-burn loops'
	},
	'Luck Games': {
		description: 'Protocols that allow you to play games of chance, such as dice, or other games of chance'
	},
	've-Incentive Automator': {
		description:
			'Protocols that automate volume or tax-based flows into vote-escrowed (ve) positions, locks, or burn mechanisms to steer incentives and accrue value'
	},
	'Decentralized AI': {
		description:
			'Protocols that provide decentralized machine-learning or AI inference networks, allowing models or agents to contribute, evaluate, and serve intelligence Onchain'
	},
	'Identity & Reputation': {
		description:
			'Protocols that provide decentralized identity, credentialing, attestations, or reputation systems used by users and applications to verify trust, eligibility, or behavior Onchain'
	},
	'Gamified Mining': {
		description:
			'Protocols that use probabilistic mining and participant stakes to issue and redistribute native tokens'
	},
	'Secondary Debt Markets': {
		description:
			'Markets that allow users to exchange or settle existing debt claims and distressed positions, providing liquidity and price discovery for outstanding obligations'
	},
	'Block Builders': {
		description: 'Block builder APIs for private transaction bundles'
	},
	'Stablecoin Wrapper': {
		description: 'Protocols that lock an existing stablecoin and mint a 1:1 redeemable on-chain wrapper token'
	},
	'Crypto Card Issuer': {
		description:
			'Protocols that issue crypto-linked debit or credit cards for spending through traditional payment networks',
		metrics: { dexVolume: true },
		headingLabel: 'Crypto Card Issuers',
		seoLabel: 'Crypto Card Issuers',
		seoTitleSuffix: 'Rankings',
		tableHeader: 'Issuer Rankings',
		searchPlaceholder: 'Search Issuers...',
		columns: [
			'name',
			'tvl',
			'dex_volume_7d',
			'fees_7d',
			'revenue_7d',
			'mcap/tvl',
			'dex_volume_30d',
			'fees_30d',
			'revenue_30d',
			'dex_volume_24h',
			'fees_24h',
			'revenue_24h'
		],
		defaultSort: 'dex_volume_7d'
	}
}

export const categoriesPageExcludedExtraTvls = new Set<string>(['doublecounted', 'liquidstaking'])

export function getProtocolCategoryPresentation({
	label,
	effectiveCategory,
	isTagPage = false,
	chain
}: {
	label: string
	effectiveCategory: string | null
	isTagPage?: boolean
	chain?: string
}) {
	const config = effectiveCategory ? protocolCategoryConfig[effectiveCategory] : null

	const defaultSeoLabel = effectiveCategory === 'RWA' && !isTagPage ? 'Real World Assets on Chain (RWA)' : label
	const hasCustomPresentation =
		config != null &&
		(config.headingLabel != null ||
			config.seoLabel != null ||
			config.seoBaseTitle != null ||
			config.searchPlaceholder != null ||
			config.tableHeader != null ||
			config.seoTitleSuffix != null)
	const defaultHeadingLabel = hasCustomPresentation ? label : `${label} Protocols`
	const defaultTitleSuffix = 'Rankings'
	const defaultTableHeader = effectiveCategory === 'RWA' ? 'Assets Rankings' : 'Protocols Rankings'
	const defaultSearchPlaceholder = hasCustomPresentation ? `Search ${label}...` : 'Search Protocols...'
	const normalizedChain = chain?.trim()
	const chainTitleSuffix = normalizedChain && normalizedChain !== 'All' ? ` on ${normalizedChain}` : ''
	const resolvedTitleSuffix = `${config?.seoTitleSuffix ?? defaultTitleSuffix}${chainTitleSuffix}`
	const resolvedSeoLabel = config?.seoLabel ?? defaultSeoLabel
	const seoBaseTitle = config?.seoBaseTitle
	const hasChain = normalizedChain && normalizedChain !== 'All'

	const seoTitle = seoBaseTitle
		? hasChain
			? `${normalizedChain} ${seoBaseTitle}`
			: `${seoBaseTitle}`
		: hasChain
			? `${normalizedChain} ${capitalizeFirstLetter(resolvedSeoLabel)} Rankings`
			: `${capitalizeFirstLetter(resolvedSeoLabel)} Rankings`

	const MAX_DESC_LENGTH = 155
	const baseDesc = hasChain
		? `Track top ${resolvedSeoLabel} on ${normalizedChain} by TVL, volume, and more on DefiLlama.`
		: `Track top ${resolvedSeoLabel} across all chains by TVL, volume, and more on DefiLlama.`
	const categoryDesc = config?.description
	const seoDescription =
		categoryDesc && `${baseDesc} ${categoryDesc}`.length <= MAX_DESC_LENGTH ? `${baseDesc} ${categoryDesc}` : baseDesc

	return {
		headingLabel: config?.headingLabel ?? defaultHeadingLabel,
		seoLabel: resolvedSeoLabel,
		seoDescription,
		seoTitle,
		titleSuffix: resolvedTitleSuffix,
		tableHeader: config?.tableHeader ?? defaultTableHeader,
		searchPlaceholder: config?.searchPlaceholder ?? defaultSearchPlaceholder
	}
}

export function getProtocolCategoryChartMetrics(effectiveCategory: string | null): ProtocolCategoryChartMetric[] {
	if (!effectiveCategory) return ['tvl']
	const m = protocolCategoryConfig[effectiveCategory]?.metrics
	if (!m) return ['tvl']
	const result: ProtocolCategoryChartMetric[] = []
	if (m.tvl !== false) result.push('tvl')
	if (m.dexVolume) result.push('dexVolume')
	if (m.dexAggregatorsVolume) result.push('dexAggregatorsVolume')
	if (m.perpVolume) result.push('perpVolume')
	if (m.openInterest) result.push('openInterest')
	if (m.optionsPremiumVolume) result.push('optionsPremiumVolume')
	if (m.optionsNotionalVolume) result.push('optionsNotionalVolume')
	if (m.borrowed) result.push('borrowed')
	if (m.staking) result.push('staking')
	return result.length > 0 ? result : ['tvl']
}

export function getProtocolCategoryColumns(effectiveCategory: string | null): string[] {
	if (!effectiveCategory) return DEFAULT_COLUMNS
	return protocolCategoryConfig[effectiveCategory]?.columns ?? DEFAULT_COLUMNS
}

export function getProtocolCategoryDefaultSort(effectiveCategory: string | null): string {
	if (!effectiveCategory) return 'tvl'
	return protocolCategoryConfig[effectiveCategory]?.defaultSort ?? 'tvl'
}
