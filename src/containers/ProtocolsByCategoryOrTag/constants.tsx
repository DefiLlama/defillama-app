import { ProtocolChartsQueryParams } from '../ProtocolOverview/Chart/constants'

export const protocolCategories = {
	Dexs: { description: 'Protocols where you can swap/trade cryptocurrency', defaultChart: 'dexVolume' },
	Yield: { description: 'Protocols that pay you a reward for your staking/LP on their platform' },
	Lending: { description: 'Protocols that allow users to borrow and lend assets' },
	'Cross Chain Bridge': {
		description:
			'Protocols that transfer assets between different blockchains through pooled liquidity on each network, instead of relying on mint/burn mechanisms',
		defaultChart: 'bridgeVolume'
	},
	Staking: { description: 'Protocols that allow you to stake assets in exchange of a reward' },
	Services: { description: 'Protocols that provide a service to the user', defaultChart: 'revenue' },
	'Yield Aggregator': { description: 'Protocols that aggregated yield from diverse protocols' },
	Minting: { description: 'Protocols NFT minting Related (in work)' },
	Assets: { description: '(will be removed)' },
	Derivatives: { description: 'Protocols for betting with leverage', defaultChart: 'perpVolume' },
	Payments: { description: 'Protocols that offer the ability to pay/send/receive cryptocurrency' },
	Privacy: { description: 'Protocols that have the intention of hiding information about transactions' },
	Insurance: { description: 'Protocols that are designed to provide monetary protections' },
	Indexes: { description: 'Protocols that have a way to track/created the performance of a group of related assets' },
	Synthetics: { description: 'Protocol that created a tokenized derivative that mimics the value of another asset.' },
	CDP: { description: 'Protocols that mint its own stablecoin using collateralized lending' },
	Bridge: { description: 'Protocols that bridge tokens from one network to another', defaultChart: 'bridgeVolume' },
	'Reserve Currency': {
		description: 'Protocols that use a reserve of valuable assets to back its native token. Includes OHM forks'
	},
	Options: {
		description: 'Protocols that give you the right to buy an asset at a fixed price',
		defaultChart: 'optionsPremiumVolume'
	},
	Launchpad: { description: 'Protocols that launch new projects and coins', defaultChart: 'revenue' },
	Gaming: { description: 'Protocols that have gaming components' },
	'Prediction Market': {
		description: 'Protocols that allow you to wager/bet/buy in future results',
		defaultChart: 'dexVolume'
	},
	'Algo-Stables': { description: 'Protocols that provide algorithmic coins to stablecoins' },
	'NFT Marketplace': { description: 'Protocols where users can buy/sell/rent NFTs', defaultChart: 'revenue' },
	'NFT Lending': {
		description: 'Protocols that allow you to collateralize your NFT for a loan',
		defaultChart: 'revenue'
	},
	RWA: { description: 'Protocols that involve Real World Assets, such as house tokenization' },
	'RWA Lending': {
		description:
			'Protocols that bridge traditional finance and blockchain ecosystems by tokenizing real-world assets for use as collateral or credit assessment, enabling decentralized lending and borrowing opportunities.'
	},
	Farm: { description: 'Protocols that allow users to lock money in exchange for a protocol token' },
	'Liquid Staking': {
		description:
			'Protocols that enable you to earn staking rewards on your tokens while also providing a tradeable and liquid receipt for your staked position'
	},
	Oracle: {
		description: 'Protocols that connect data from the outside world (off-chain) with the blockchain world (on-chain)'
	},
	'Leveraged Farming': { description: 'Protocols that allow you to leverage yield farm with borrowed money' },
	'Options Vault': {
		description: 'Protocols that allow you to deposit collateral into an options strategy',
		defaultChart: 'optionsNotionalVolume'
	},
	'Uncollateralized Lending': {
		description: 'Protocol that allows you to lend against known parties that can borrow without collaterall'
	},
	'Exotic Options': { description: 'Protocols that provide option vaults while also adding borrowing on top' },
	'Liquidity manager': { description: 'Protocols that manage Liquidity Positions in concentrated liquidity AMMs' },
	'Staking Pool': {
		description:
			"Refers to platforms where users stake their assets using smart contracts on native blockchains to help secure the network and earn rewards but don't receive a receipt token to use in other Defi apps like with Liquid Staking projects"
	},
	'Partially Algorithmic Stablecoin': {
		description:
			'Coins pegged to USD through decentralized mechanisms, but uses an algorithmic mechanism to keep it stable'
	},
	SoFi: { description: 'Social Finance Networks', defaultChart: 'revenue' },
	'DEX Aggregator': {
		description:
			'A platform that sources liquidity from various decentralized exchanges to provide optimal trade execution in terms of price and slippage',
		defaultChart: 'dexAggregatorVolume'
	},
	Restaking: { description: 'Protocols that allow you to stake the same ETH natively and in others protocols' },
	'Liquid Restaking': { description: 'Protocols that create a liquid token for restaking' },
	Wallets: {
		description: 'Protocols where you have a form of digital storage to secure access to your crypto.',
		defaultChart: 'revenue'
	},
	NftFi: { description: 'NFT leverage protocols' },
	'Telegram Bot': { description: 'Trading bots for Telegram users', defaultChart: 'revenue' },
	Ponzi: {
		description:
			'Farms promising high rates of return, where the money from new investors is used to pay earlier investors'
	},
	'Basis Trading': {
		description:
			'Projects simultaneously buying and selling crypto futures to profit from price differences between the spot and futures markets'
	},
	MEV: { description: 'MEV Layer' },
	CeDeFi: { description: 'Projects that incorporate elements of centralization within their product strategies' },
	'CDP Manager': { description: 'Protocols that manage CDPs' },
	'Governance Incentives': {
		description:
			'Protocols that facilitate governance participation by offering incentives or rewards for token holders voting power'
	},
	'Security Extension': {
		description: 'A browser extension that protects Web3 users from malicious activities and exploits'
	},
	'AI Agents': {
		description:
			'Smart programs that use AI to handle tasks and make crypto interactions easier for blockchain platforms'
	},
	'Treasury Manager': {
		description:
			'Protocols that help organizations manage and optimize their treasury assets and funds using automated strategies'
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
			'Protocols that lock digital assets like fungible tokens, NFTs, and LP tokens, ensuring restricted access for a set duration'
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
			'Platforms and services providing APIs, integrations, or other resources to facilitate the development and management of blockchain applications'
	},
	'Stablecoin Issuer': {
		description:
			'Company that creates and manages stablecoins designed to maintain a stable value, typically pegged to a fiat like the US dollar',
		defaultChart: 'revenue'
	},
	'Coins Tracker': {
		description:
			'A tool that aggregates and displays real-time token prices, trading volumes, and market trends from decentralized exchanges'
	},
	Domains: { description: 'Decentralized naming services that map human-readable names to blockchain addresses' },
	'NFT Launchpad': { description: 'Platforms that enable creators to mint, manage, and launch NFT collections' },
	'Trading App': {
		description:
			'Apps that simplify trading tokens like memecoins with user-friendly interfaces, real-time updates, self-custodial tools, and direct fiat on-ramps for casual traders'
	},
	Foundation: {
		description:
			'A foundation supporting blockchain ecosystems by funding research, development, and community initiatives'
	},
	Liquidations: {
		description: 'Protocols that enable the purchase of liquidated collateral from lending platforms or CDP protocols'
	},
	'Bridge Aggregator': {
		description:
			'Protocols that consolidate multiple bridging solutions, allowing users to transfer assets across different blockchains by finding the most efficient routes',
		defaultChart: 'bridgeAggregatorVolume'
	},
	'Restaked BTC': {
		description:
			'Protocols that enable users to stake their Bitcoin (BTC) natively, receiving a representative receipt token in return'
	},
	'Decentralized BTC': {
		description:
			'Tokens that represent Bitcoin in a decentralized manner, backed and issued through trustless mechanisms such as smart contracts, without reliance on centralized custodians.'
	},
	'Anchor BTC': {
		description:
			'Tokens indirectly tied to Bitcoin, backed by assets or instruments that are themselves backed by Bitcoin, offering exposure with additional flexibility but not a direct 1:1 representation of BTC.'
	},
	'Portfolio Tracker': { description: 'Tools that monitor token balances and performance' },
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
		description: 'Protocols that manage or leverage on-chain collateral for financial applications'
	},
	Meme: {
		description:
			'Tokens inspired by internet culture, trends, or public figures. Typically community-driven and speculative in nature.'
	},
	'Private Investment Platform': {
		description:
			'Protocols that coordinate private, gated investment opportunities onchain, typically for startups or early-stage projects, often led by curated investor groups'
	},
	'Risk Curators': {
		description:
			'Projects that analyze DeFi risks and help users choose strategies across lending, trading, or staking systems to improve safety and returns.'
	},
	'DAO Service Provider': { description: 'Protocols that provide services to DAOs' },
	'Staking Rental': { description: 'Protocols that facilitate the borrowing or renting of staking rights' },
	'Canonical Bridge': {
		description: 'The official bridge designated by a blockchain for transferring its assets across networks',
		defaultChart: 'bridgeVolume'
	},
	Interface: {
		description: 'Projects that provide a user interface to interact with external protocols',
		defaultChart: 'perpVolume'
	},
	'Video Infrastructure': {
		description:
			'Protocols that provide decentralized tools and infrastructure for video streaming, transcoding, recording, playback, or media processing'
	},
	DePIN: {
		description:
			'Protocols that provide decentralized infrastructure for physical assets, such as sensors, devices, or networks, enabling real-world data collection and processing via on-chain rewards and governance'
	},
	'Dual-Token Stablecoin': {
		description:
			'Protocols that maintain a USD peg through a dual-token system where one token serves as the stablecoin and the other absorbs volatility, using overcollateralized reserves and algorithmic mechanisms to adjust supply and maintain stability'
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
			'Protocols that provide decentralized machine-learning or AI inference networks, allowing models or agents to contribute, evaluate, and serve intelligence on-chain'
	},
	'Identity & Reputation': {
		description:
			'Protocols that provide decentralized identity, credentialing, attestations, or reputation systems used by users and applications to verify trust, eligibility, or behavior on-chain'
	},
	'Gamified Mining': {
		description:
			'Protocols that use probabilistic mining and participant stakes to issue and redistribute native tokens'
	}
} as const satisfies Record<string, { description: string; defaultChart?: ProtocolChartsQueryParams }>
