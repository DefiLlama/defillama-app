import type { IIcon } from '~/components/Icon'

export interface Capability {
	key: string
	name: string
	icon: IIcon['name']
	description: string
	prompts: string[]
	badge?: string
}

export const CAPABILITIES: Capability[] = [
	// ── Featured ─────────────────────────────────────────────
	{
		key: 'trade_thesis',
		name: 'Trade Thesis',
		icon: 'activity',
		badge: 'HOT',
		description:
			'Get a data-backed buy/sell verdict on any token — fundamentals, momentum, risk, and a conviction score.',
		prompts: [
			'Should I buy ETH right now? Give me a full thesis with conviction score',
			'AAVE vs Morpho — compare fundamentals, P/F ratio, revenue growth, and momentum',
			'Screen the top 20 DeFi tokens by P/F ratio under 5 with positive revenue growth',
			'I have $100K split across BTC, ETH, SOL, and AVAX — assess my portfolio and suggest rebalancing',
			"What's the probability of SOL reaching $500 this year? Use Monte Carlo + Polymarket",
			'Is Euler viable after the 2023 exploit? Show pre/post metrics and recovery trajectory',
			'Find tokenless protocols generating over $1M monthly revenue — airdrop alpha',
			'Build a 5-token portfolio optimized for risk-adjusted returns with conviction-weighted allocation',
			'Deep thesis on Hyperliquid — fundamentals, token dynamics, on-chain flows, sentiment, and risk'
		]
	},
	{
		key: 'x_data',
		name: 'X / Twitter',
		icon: 'twitter',
		description: 'See what crypto Twitter is saying — track influencers, find project teams, and surface viral takes.',
		prompts: [
			'What has @VitalikButerin tweeted this week about Ethereum?',
			'Look up @DefiLlama followers — who are the most influential accounts following them?',
			'Search tweets mentioning EtherFi with 100+ likes in the last 7 days',
			'Who does @0xngmi follow? Show the overlap with top DeFi accounts',
			'Find tweets from @0xngmi with 50+ likes in the last 30 days',
			'Get the latest tweets from @aaboronkov and show engagement stats',
			'Search for tweets about Pendle with 200+ reposts this month',
			'Who are the most followed accounts tweeting about Hyperliquid?'
		]
	},
	{
		key: 'tradfi',
		name: 'TradFi',
		icon: 'landmark',
		description:
			'Stocks, macro, and earnings alongside crypto — compare Apple vs Bitcoin or check how CPI affects markets.',
		prompts: [
			'Chart Apple stock price vs Bitcoin returns since January 2024',
			'Pull Tesla quarterly earnings for the last 4 quarters and show the trend',
			'How has US CPI inflation moved relative to BTC price over the last 2 years?',
			'Compare S&P 500 vs ETH vs SOL performance since the 2023 bottom',
			'Show the Federal Reserve interest rate history alongside DeFi TVL on the same chart',
			'NVIDIA vs Bitcoin — which performed better over the last 12 months?',
			'Pull MicroStrategy balance sheet and overlay with their BTC purchase history',
			'Gold vs Bitcoin returns during periods of high CPI — historical comparison'
		]
	},
	{
		key: 'yields',
		name: 'Yields',
		icon: 'percent',
		description:
			'Find the highest yields in DeFi and get a strategy — loops, LPs, delta-neutral, or just the best lending rate.',
		prompts: [
			'Best USDC lending rates across all protocols — only show pools with $10M+ TVL',
			'Design a borrow-lend loop strategy for ETH on Aave with safe LTV and net APY calculation',
			'Find the highest stable yields above 8% APY with low volatility (CV under 0.3)',
			'Compare Aave vs Compound vs Morpho borrow rates for ETH — include reward APY',
			'Build a delta-neutral yield strategy for $100K using ETH collateral',
			'Best yield farming opportunities on protocols without a token yet — airdrop + yield',
			'Show me the top 20 pools by APY on Arbitrum with TVL over $5M',
			'I have 50 ETH — what are my options? Staking, LP, lending, or leveraged strategies',
			'Find stablecoin pools with the most consistent APY over 30 days — rank by stability'
		]
	},
	{
		key: 'onchain_analytics',
		name: 'On-Chain Analytics',
		icon: 'chain',
		description: 'Look up any wallet, find top depositors, trace token flows, and query raw on-chain events.',
		prompts: [
			'Who are the top 50 AAVE depositors on Ethereum by wallet address and balance?',
			'Show me all USDC mint events on Ethereum in the last 30 days with amounts',
			'Find wallets holding more than $1M in USDC on Arbitrum',
			'Pull individual CowSwap trades in the last 24 hours with USD values',
			'List all Uniswap V3 pools for WETH sorted by liquidity',
			'Which addresses deposited the most into Lido in the last week?',
			'Show me the top ETH stakers by address and their total staked amount',
			'Track large USDT transfers (>$1M) on Ethereum in the past 7 days',
			'Find the biggest liquidity providers on Curve across all pools'
		]
	},
	// ── Explore ──────────────────────────────────────────────
	{
		key: 'price_forecast',
		name: 'Price Forecast',
		icon: 'trending-up',
		description: 'See where prices could go — simulated forecasts with confidence bands and momentum signals.',
		prompts: [
			'Run a 90-day Monte Carlo forecast for ETH with 10,000 simulations and show p5/p50/p95 bands',
			'Is BTC in an uptrend or downtrend? Show TSMOM signal across multiple timeframes',
			'Forecast SOL price for next 30 days — what probability does it hit $300?',
			'Compare Monte Carlo forecast vs Polymarket odds for ETH reaching $5K',
			'Run momentum analysis on the top 10 tokens by market cap — who has the strongest trend?',
			'BTC price forecast with 2x volatility multiplier to stress-test downside scenarios'
		]
	},
	{
		key: 'wallet_xray',
		name: 'Wallet X-Ray',
		icon: 'wallet',
		description: 'Paste any wallet or ENS and instantly see holdings, DeFi positions, and full transaction history.',
		prompts: [
			'Full portfolio breakdown for vitalik.eth — tokens, DeFi positions, and NFTs',
			'Decode this transaction and explain what happened step by step: 0x...',
			'Show all DeFi positions for this wallet across every chain — lending, staking, LPs',
			'What tokens did this wallet receive or send in the last 30 days?',
			'Show me all DeFi positions for vitalik.eth — lending, staking, and LP positions',
			'Compare holdings of these 3 wallets side by side'
		]
	},
	{
		key: 'research',
		name: 'Research',
		icon: 'sparkles',
		description:
			'Get an in-depth research report on any protocol, narrative, or market trend — powered by multiple AI agents.',
		prompts: [
			'Deep dive report on Lido — competitive position, tokenomics, risks, and catalysts',
			'Comprehensive landscape analysis of all lending protocols — market share, growth, and differentiation',
			'Research the restaking narrative — key players, risks, total value, and where it goes next',
			'Full report on Uniswap vs competitors — volume trends, fee capture, governance, and moat analysis',
			'What are the top emerging narratives in DeFi right now? Rank by capital flows and attention',
			'Research report on the state of L2s — compare Arbitrum, Optimism, Base, and zkSync by all metrics',
			'Investigate the RWA tokenization trend — protocols, TVL, institutional adoption, and regulatory risks'
		]
	},
	{
		key: 'risk',
		name: 'Risk',
		icon: 'alert-triangle',
		description:
			'Know before you ape — get a full risk breakdown covering smart contract, economic, oracle, and liquidity risks.',
		prompts: [
			'Full 5-dimension risk assessment for Aave — smart contract, economic, oracle, liquidity, centralization',
			'Compare risk profiles of Curve vs Uniswap vs Balancer side by side',
			'Is it safe to deposit $500K into Morpho? What are the specific risks?',
			'Which lending protocols have been hacked? Show exploit history with amounts and recovery',
			'Risk assessment for providing liquidity on Pendle — what could go wrong?',
			'Analyze the oracle dependency risk for the top 10 DeFi protocols by TVL'
		]
	},
	{
		key: 'charts',
		name: 'Charts',
		icon: 'bar-chart-2',
		description:
			'Generate any chart on the fly — candlesticks with indicators, protocol comparisons, TVL trends, and more.',
		prompts: [
			'BTC candlestick chart with RSI and MACD indicators over 90 days',
			'Top 15 protocols by monthly fees — horizontal bar chart',
			'ETH vs SOL vs AVAX price comparison normalized to the same start date',
			'DeFi TVL by chain over time — stacked area chart for the top 10 chains',
			'Lending protocol revenue comparison — grouped bar chart by quarter',
			'Stablecoin market cap dominance pie chart — USDT vs USDC vs DAI vs others'
		]
	},
	{
		key: 'alerts',
		name: 'Alerts',
		icon: 'calendar-plus',
		description: 'Set it and forget it — get daily or weekly DeFi reports delivered straight to your inbox.',
		prompts: [
			'Send me a daily report of the top 10 DeFi protocols by fees with 24h change',
			'Weekly summary of stablecoin supply changes across all chains to my email',
			'Alert me daily with ETH lending rates across Aave, Compound, and Morpho',
			'Weekly portfolio tracker — TVL, price, and revenue for AAVE, UNI, MKR, and LDO',
			'Daily report of tokens with the biggest price moves (>10%) and their fundamentals'
		]
	},
	{
		key: 'governance',
		name: 'Governance',
		icon: 'graduation-cap',
		description: 'Stay on top of DAO governance — active proposals, fee switch votes, buybacks, and voting outcomes.',
		prompts: [
			'Show all active governance proposals for Aave with voting status and deadline',
			'Which DeFi protocols have proposed or passed fee switch votes in the last 90 days?',
			'Uniswap governance activity — recent proposals, quorum status, and vote breakdown',
			'Find all buyback or revenue-sharing proposals across major DAOs',
			'Compare governance activity across Aave, Compound, Sky (MakerDAO), and Uniswap',
			'Show recently executed governance proposals that changed protocol parameters'
		]
	},
	{
		key: 'etf',
		name: 'ETF Flows',
		icon: 'banknote',
		description: 'Track institutional money — Bitcoin and Ethereum ETF flows, net inflows, and record-breaking days.',
		prompts: [
			'Bitcoin ETF net inflows/outflows for the last 30 days — chart and breakdown by issuer',
			'Compare BlackRock IBIT vs Fidelity FBTC vs Grayscale GBTC cumulative flows',
			'Which day had the largest single-day Bitcoin ETF inflow ever?',
			'Ethereum ETF flows since launch — is institutional interest growing or declining?',
			'Total cumulative BTC ETF net flows vs BTC price on the same chart',
			'Weekly Bitcoin ETF flow trend — are outflows accelerating or decelerating?'
		]
	},
	{
		key: 'stablecoins',
		name: 'Stablecoins',
		icon: 'dollar-sign',
		description: 'Track stablecoin supply across every chain — market cap, dominance, peg health, and growth trends.',
		prompts: [
			'USDT supply breakdown by chain — which chains are growing fastest?',
			'Total stablecoin market cap over time vs DeFi TVL — show the correlation',
			'Algorithmic vs fiat-backed vs crypto-backed stablecoin market share over time',
			'Which chain gained the most stablecoin supply in the last 30 days?',
			'USDC vs USDT dominance trend — how has the ratio shifted over the last year?',
			'Show all stablecoins with market cap over $100M ranked by 30-day supply growth'
		]
	},
	{
		key: 'income_statement',
		name: 'Income Statement',
		icon: 'file-text',
		description:
			'See if a protocol actually makes money — full P&L with revenue, costs, earnings, and profitability rankings.',
		prompts: [
			"Show me Aave's full income statement — revenue, costs, gross profit, and token holder income",
			'Rank the top 20 most profitable DeFi protocols by quarterly earnings',
			'Uniswap revenue vs incentive spending — is the protocol sustainable without token emissions?',
			'Compare income statements across Aave, Compound, and Sky (MakerDAO) quarter over quarter',
			'Which protocols have the highest gross margin? Show revenue vs cost of revenue',
			'Show Lido earnings trend over the last 4 quarters — is profitability improving?'
		]
	},
	{
		key: 'token_unlocks',
		name: 'Token Unlocks',
		icon: 'linear-unlock',
		description: "Don't get diluted — see upcoming token unlocks, vesting cliffs, and how much supply is about to hit.",
		prompts: [
			'Which tokens have the largest unlock events in the next 30 days as % of circulating supply?',
			'ARB unlock schedule — show cliff dates, amounts, and who receives them (team, investors, ecosystem)',
			'Chart the OP token unlock timeline for the next 12 months with category breakdown',
			'Find tokens where more than 5% of supply unlocks in a single event this quarter',
			'Compare unlock pressure across ARB, OP, STRK, and JUP — who has the most selling risk?',
			'Show all tokens with less than 50% unlocked and their next major unlock date'
		]
	},
	{
		key: 'polymarket',
		name: 'Polymarket',
		icon: 'pie-chart',
		description: 'What does the crowd think? Real-money prediction market odds on crypto prices and events.',
		prompts: [
			'What are the current Polymarket odds for ETH reaching $5,000 this year?',
			'Show all active crypto prediction markets right now',
			'Which crypto price target markets have the highest conviction (>80% yes)?',
			'Find close/uncertain crypto bets (40-60% odds) — where is the market undecided?',
			'Compare Polymarket odds vs Monte Carlo probability for BTC price targets',
			'What prediction markets exist for Solana, Ethereum ETF, or Bitcoin halving effects?'
		]
	},
	{
		key: 'people_search',
		name: 'People Search',
		icon: 'users',
		description: 'Find the people behind any project — founders, team members, investors, and their LinkedIn profiles.',
		prompts: [
			'Who are the founders and key team members at Aave? Include LinkedIn profiles',
			'Find everyone who works at Uniswap Labs — engineering, product, and BD roles',
			'Which VCs invested in EtherFi? Show the round sizes and investor overlap with competitors',
			'Research the Pendle team — backgrounds, previous companies, and X/LinkedIn profiles',
			'Find the common investors between Morpho, Euler, and Aave — who is funding the lending wars?',
			'Show me all OTC funding rounds in the last 6 months with deal sizes'
		]
	},
	{
		key: 'dat',
		name: 'Corporate Holdings',
		icon: 'blocks',
		description:
			'Which public companies hold Bitcoin? Track MicroStrategy, Tesla, and every institutional crypto position.',
		prompts: [
			'How much Bitcoin does MicroStrategy hold? Show purchase history and average cost basis',
			'Top 20 public companies by crypto holdings — rank by total USD value',
			'MicroStrategy mNAV ratio over time — is the stock trading at a premium or discount to BTC holdings?',
			'Which companies have been buying Bitcoin in the last 90 days? Show amounts and prices',
			'Compare MicroStrategy vs Tesla vs Block crypto holdings and investment strategies',
			'Chart cumulative institutional Bitcoin purchases over time alongside BTC price'
		]
	},
	{
		key: 'bridges',
		name: 'Bridges',
		icon: 'repeat',
		description: 'See where capital is flowing — bridge volumes, chain inflows/outflows, and cross-chain movement.',
		prompts: [
			'Which chains had the most net bridge inflows in the last 7 days? Rank by USD amount',
			'Top 10 bridges by volume this month — show per-bridge breakdown',
			'Daily bridge inflows to Arbitrum vs Base vs Optimism over the last 90 days',
			'Is capital flowing into or out of Solana via bridges? Show the daily net flow trend',
			'Compare bridge volume to each L2 — which L2 is attracting the most capital?',
			'Which bridge handles the most Ethereum to L2 volume?'
		]
	},
	{
		key: 'treasury',
		name: 'Treasury',
		icon: 'package',
		description: 'How much runway does a protocol have? Treasury balances, holdings breakdown, and trends over time.',
		prompts: [
			"What's in Uniswap's treasury? Show holdings excluding UNI token",
			'Top 20 protocol treasuries by non-native-token value — who has real runway?',
			'Aave treasury breakdown by chain and token — how diversified is it?',
			'Compare treasury values of Uniswap, Aave, Compound, and Sky (MakerDAO) over the last year',
			'Which protocols have the largest treasury growth over the last 6 months?',
			'Compound treasury over time — is it growing or shrinking?'
		]
	},
	{
		key: 'cex',
		name: 'CEX Data',
		icon: 'bar-chart',
		description:
			'Compare centralized exchanges — trading volume, reserves, leverage, and how they stack up against DEXes.',
		prompts: [
			'Compare Binance vs Coinbase vs OKX — spot volume, derivative volume, and open interest',
			'CEX vs DEX derivative volume over the last 6 months — is DEX market share growing?',
			'What tokens does Binance hold in reserves? Show the full portfolio breakdown',
			'Top 10 exchanges by spot trading volume this week — include 7-day change',
			'Compare CEX vs DEX total volume market share trend over the last year',
			'Which exchange has the highest leverage ratio? Show OI relative to reserves'
		]
	},
	{
		key: 'relative_returns',
		name: 'Token Returns',
		icon: 'flag',
		description: "Who's winning? Compare token returns head-to-head, build custom indices, and rank by performance.",
		prompts: [
			'Compare BTC vs ETH vs SOL vs AVAX returns over 90 days — normalized chart',
			'Top 10 tokens by market cap ranked by 30-day performance with price charts',
			'Build an equal-weight DeFi index (AAVE, UNI, MKR, CRV, LDO) and chart it vs ETH',
			'AI token category vs meme coin category — which sector outperformed over 90 days?',
			'Show the top 5 and bottom 5 performing tokens by 7-day returns with market cap over $100M',
			'Create a market-cap-weighted L2 token index (ARB, OP, STRK, MANTA) and track vs ETH'
		]
	},
	{
		key: 'user_activity',
		name: 'User Activity',
		icon: 'layers',
		description:
			'Are people actually using it? Daily active users, new users, transactions, and gas spend by protocol.',
		prompts: [
			'Top 10 chains by daily active users — show the trend over the last 90 days',
			'Revenue per user for the top DeFi protocols — who extracts the most value?',
			'New user growth on Base vs Arbitrum vs Optimism — who is onboarding faster?',
			'Uniswap daily transactions and unique users over the last 6 months',
			'Which protocols have the highest user retention? Compare DAU to new users ratio',
			'Gas spend per chain over time — where are users spending the most on fees?'
		]
	},
	{
		key: 'token_categories',
		name: 'Token Categories',
		icon: 'tag',
		description:
			'Explore 260+ token categories — meme coins, AI agents, RWA, liquid staking, and every niche in between.',
		prompts: [
			'Top 20 meme coins by market cap — show 7d and 30d performance',
			'AI agent tokens ranked by market cap and 30-day returns — who is leading?',
			'RWA tokens with the highest TVL and protocol revenue — are they generating real yield?',
			'Compare liquid staking tokens — market cap, APY offered, and market share trend',
			'Show all Solana meme coins vs Base meme coins by market cap and volume',
			'Which token categories had the highest aggregate returns this month?'
		]
	},
	{
		key: 'open_interest',
		name: 'Open Interest',
		icon: 'eye',
		description: 'Track where traders are positioned — open interest across perp DEXes, by protocol and chain.',
		prompts: [
			'Total open interest across all perp DEXes — trend over last 90 days',
			'Compare open interest on dYdX vs Hyperliquid vs GMX — who is gaining share?',
			'Top 10 tokenless perp DEXes by open interest — airdrop opportunity screening',
			'Open interest vs daily volume ratio for top derivative protocols — who has sticky positions?',
			'Which chain has the most derivative trading OI? Break down by protocol',
			'Hyperliquid OI trend vs revenue — is growth translating to earnings?'
		]
	},
	{
		key: 'fork',
		name: 'Fork Analysis',
		icon: 'plug',
		description: 'Which forks outperformed the original? Fork TVL, dominance, and the protocols they were built from.',
		prompts: [
			'All Uniswap forks ranked by TVL — which ones actually gained traction?',
			'Show forks that have surpassed their original protocol in TVL — the student beats the master',
			'Fork dominance on Arbitrum — what percentage of TVL comes from forked protocols?',
			'Compare Aave forks across chains — Radiant, Seamless, etc. vs original Aave TVL',
			'Fork-to-nonfork TVL ratio by chain — which chains rely most on forked code?',
			'Top 10 biggest forks across all protocols — show original, fork name, and TVL comparison'
		]
	}
]
