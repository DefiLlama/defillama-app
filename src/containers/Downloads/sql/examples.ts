import type { QueryTableRef } from '../savedDownloads'

export type ExampleSubcategory =
	| 'Leaderboards'
	| 'Cross-joins'
	| 'Time series'
	| 'Concentration'
	| 'Yield hunting'
	| 'Security'
	| 'Fundraising'
	| 'Outliers'

export interface ExampleQuery {
	title: string
	description: string
	subcategory: ExampleSubcategory
	tables: QueryTableRef[]
	sql: string
}

export interface SubcategoryMeta {
	name: ExampleSubcategory
	color: string
	blurb: string
}

// Ordered intentionally — groups render in this order in the panel. Keep
// "Leaderboards" first since it's the easiest on-ramp, tricky analyses later.
export const SUBCATEGORY_META: SubcategoryMeta[] = [
	{ name: 'Leaderboards', color: '#6366f1', blurb: 'Top-N rankings across the DefiLlama catalogue.' },
	{ name: 'Cross-joins', color: '#0ea5e9', blurb: 'Stitch datasets together — the point of SQL.' },
	{ name: 'Time series', color: '#f59e0b', blurb: 'Trends, rolling windows, temporal joins.' },
	{ name: 'Concentration', color: '#10b981', blurb: 'How much of the market sits in how few hands.' },
	{ name: 'Yield hunting', color: '#ec4899', blurb: 'Separate healthy yields from obvious traps.' },
	{ name: 'Security', color: '#ef4444', blurb: 'Hacks, techniques, annual carnage.' },
	{ name: 'Fundraising', color: '#8b5cf6', blurb: 'Who raised, how much, at what valuation.' },
	{ name: 'Outliers', color: '#f97316', blurb: 'Anomalies worth a second look.' }
]

export const EXAMPLE_QUERIES: ExampleQuery[] = [
	// ─── Leaderboards ────────────────────────────────────────────────────────
	{
		title: 'Top fee earners (24h)',
		description: 'Highest-grossing protocols by fees in the last 24 hours.',
		subcategory: 'Leaderboards',
		tables: [{ kind: 'dataset', slug: 'fees' }],
		sql: `SELECT name, category, total24h, total7d, change_7d
FROM fees
WHERE total24h IS NOT NULL
ORDER BY total24h DESC
LIMIT 20`
	},
	{
		title: 'TVL leaderboard (top 25)',
		description: 'Largest protocols by current total value locked.',
		subcategory: 'Leaderboards',
		tables: [{ kind: 'dataset', slug: 'protocols' }],
		sql: `SELECT name, category, chain, tvl, change_7d, change_1m
FROM protocols
WHERE tvl IS NOT NULL
ORDER BY tvl DESC
LIMIT 25`
	},
	{
		title: 'DEX volume leaders (24h)',
		description: 'Busiest decentralised exchanges by on-chain volume.',
		subcategory: 'Leaderboards',
		tables: [{ kind: 'dataset', slug: 'dex-volumes' }],
		sql: `SELECT name, category, total24h, total7d, change_7d
FROM dex_volumes
WHERE total24h IS NOT NULL
ORDER BY total24h DESC
LIMIT 20`
	},
	{
		title: 'Biggest protocol treasuries',
		description: 'Protocols holding the most on-chain treasury value.',
		subcategory: 'Leaderboards',
		tables: [{ kind: 'dataset', slug: 'treasuries' }],
		sql: `SELECT name, chain, tvl, change_1d, change_7d
FROM treasuries
WHERE tvl IS NOT NULL
ORDER BY tvl DESC
LIMIT 20`
	},

	// ─── Cross-joins ─────────────────────────────────────────────────────────
	{
		title: 'Revenue efficiency (rev / TVL)',
		description: 'Which protocols earn the most per dollar of TVL.',
		subcategory: 'Cross-joins',
		tables: [
			{ kind: 'dataset', slug: 'revenue' },
			{ kind: 'dataset', slug: 'protocols' }
		],
		sql: `WITH tvl AS (
  SELECT name, tvl FROM protocols WHERE tvl > 100000000
)
SELECT r.name, r.category,
       r.total30d AS revenue_30d,
       t.tvl,
       (r.total30d / NULLIF(t.tvl, 0)) * 100 AS revenue_pct_of_tvl
FROM revenue r
JOIN tvl t ON t.name = r.name
WHERE r.total30d > 0
ORDER BY revenue_pct_of_tvl DESC
LIMIT 30`
	},
	{
		title: 'Raised capital vs current TVL',
		description: 'TVL built per dollar raised — capital efficiency survivors.',
		subcategory: 'Cross-joins',
		tables: [
			{ kind: 'dataset', slug: 'raises' },
			{ kind: 'dataset', slug: 'protocols' }
		],
		sql: `WITH raised AS (
  SELECT name, SUM(TRY_CAST(amount AS DOUBLE)) * 1e6 AS total_raised_usd
  FROM raises
  WHERE name IS NOT NULL
  GROUP BY name
)
SELECT p.name, p.category, p.tvl, r.total_raised_usd,
       p.tvl / NULLIF(r.total_raised_usd, 0) AS tvl_per_dollar_raised
FROM protocols p
JOIN raised r ON r.name = p.name
WHERE r.total_raised_usd > 5000000 AND p.tvl IS NOT NULL
ORDER BY tvl_per_dollar_raised DESC
LIMIT 30`
	},
	{
		title: 'High fees, low TVL',
		description: 'Protocols that take fees disproportionate to their TVL.',
		subcategory: 'Cross-joins',
		tables: [
			{ kind: 'dataset', slug: 'fees' },
			{ kind: 'dataset', slug: 'protocols' }
		],
		sql: `SELECT f.name, f.category,
       f.total30d AS fees_30d,
       p.tvl,
       f.total30d / NULLIF(p.tvl, 0) AS fee_to_tvl_ratio
FROM fees f
JOIN protocols p ON p.name = f.name
WHERE f.total30d > 1000000 AND p.tvl < 50000000 AND p.tvl > 0
ORDER BY fee_to_tvl_ratio DESC
LIMIT 30`
	},
	{
		title: 'Hacked protocols still alive',
		description: 'Protocols that were exploited yet still hold meaningful TVL.',
		subcategory: 'Cross-joins',
		tables: [
			{ kind: 'dataset', slug: 'hacks' },
			{ kind: 'dataset', slug: 'protocols' }
		],
		sql: `SELECT h.name,
       to_timestamp(TRY_CAST(h.date AS DOUBLE))::TIMESTAMP::DATE AS hack_date,
       TRY_CAST(h.amount AS DOUBLE) AS stolen,
       h.technique, p.tvl AS current_tvl, p.category
FROM hacks h
JOIN protocols p ON p.name = h.name
WHERE TRY_CAST(h.amount AS DOUBLE) > 5000000
  AND p.tvl > 1000000
ORDER BY TRY_CAST(h.amount AS DOUBLE) DESC
LIMIT 30`
	},

	// ─── Time series ─────────────────────────────────────────────────────────
	{
		title: 'Aave TVL — monthly averages',
		description: 'Aave protocol TVL aggregated by month, last two years.',
		subcategory: 'Time series',
		tables: [{ kind: 'chart', slug: 'protocol-tvl-chart', param: 'aave', paramLabel: 'Aave' }],
		sql: `SELECT date_trunc('month', CAST(date AS DATE)) AS month,
       AVG(value) AS avg_tvl
FROM ts_protocol_tvl_chart_aave
GROUP BY month
ORDER BY month DESC
LIMIT 24`
	},
	{
		title: 'Lending vs DEXs — daily fees',
		description: 'Full outer join on date so each side fills its own row.',
		subcategory: 'Time series',
		tables: [
			{ kind: 'chart', slug: 'category-fees-chart', param: 'Lending', paramLabel: 'Lending' },
			{ kind: 'chart', slug: 'category-fees-chart', param: 'Dexs', paramLabel: 'Dexs' }
		],
		sql: `SELECT COALESCE(l.date, d.date) AS date,
       l.value AS lending_fees,
       d.value AS dexs_fees
FROM ts_category_fees_chart_lending l
FULL OUTER JOIN ts_category_fees_chart_dexs d
  ON l.date = d.date
ORDER BY date DESC
LIMIT 365`
	},
	{
		title: 'Ethereum fees — 30d rolling average',
		description: 'Smooth out daily noise with a trailing 30-day mean.',
		subcategory: 'Time series',
		tables: [{ kind: 'chart', slug: 'chain-fees-chart', param: 'Ethereum', paramLabel: 'Ethereum' }],
		sql: `SELECT date,
       value AS daily_fees,
       AVG(value) OVER (
         ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
       ) AS rolling_30d
FROM ts_chain_fees_chart_ethereum
ORDER BY date DESC
LIMIT 180`
	},
	{
		title: 'Aave TVL — weekday seasonality',
		description: 'Does TVL systematically drift on weekends? Group by day-of-week.',
		subcategory: 'Time series',
		tables: [{ kind: 'chart', slug: 'protocol-tvl-chart', param: 'aave', paramLabel: 'Aave' }],
		sql: `SELECT dayname(CAST(date AS DATE)) AS day_of_week,
       COUNT(*) AS samples,
       AVG(value) AS avg_tvl
FROM ts_protocol_tvl_chart_aave
WHERE CAST(date AS DATE) >= CURRENT_DATE - INTERVAL 1 YEAR
GROUP BY day_of_week
ORDER BY avg_tvl DESC`
	},

	// ─── Concentration ───────────────────────────────────────────────────────
	{
		title: 'TVL by chain — share of total',
		description: 'Each chain\'s slice of global TVL, in percent.',
		subcategory: 'Concentration',
		tables: [{ kind: 'dataset', slug: 'protocols' }],
		sql: `WITH chain_totals AS (
  SELECT chain, SUM(tvl) AS total_tvl
  FROM protocols
  WHERE tvl > 0 AND chain IS NOT NULL
  GROUP BY chain
)
SELECT chain, total_tvl,
       (total_tvl / (SELECT SUM(total_tvl) FROM chain_totals)) * 100 AS pct_of_total
FROM chain_totals
ORDER BY total_tvl DESC
LIMIT 20`
	},
	{
		title: 'Top 3 per category — share',
		description: 'How dominant the leaders are inside each DeFi category.',
		subcategory: 'Concentration',
		tables: [{ kind: 'dataset', slug: 'protocols' }],
		sql: `WITH ranked AS (
  SELECT category, name, tvl,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY tvl DESC) AS rank,
         SUM(tvl) OVER (PARTITION BY category) AS category_total
  FROM protocols
  WHERE tvl > 0 AND category IS NOT NULL
)
SELECT category, name, tvl,
       (tvl / NULLIF(category_total, 0)) * 100 AS share_pct
FROM ranked
WHERE rank <= 3
ORDER BY category, rank`
	},
	{
		title: 'Stablecoin supply — chain breakdown',
		description: 'Where stablecoins actually live, by circulating supply.',
		subcategory: 'Concentration',
		tables: [{ kind: 'dataset', slug: 'stablecoins-chains' }],
		sql: `SELECT name, totalCirculatingUSD
FROM stablecoins_chains
WHERE totalCirculatingUSD > 1000000
ORDER BY totalCirculatingUSD DESC
LIMIT 25`
	},
	{
		title: 'Herfindahl — category concentration',
		description: 'Sum of squared market shares per category (higher = more concentrated).',
		subcategory: 'Concentration',
		tables: [{ kind: 'dataset', slug: 'protocols' }],
		sql: `WITH shares AS (
  SELECT category, name,
         tvl / SUM(tvl) OVER (PARTITION BY category) AS share
  FROM protocols
  WHERE tvl > 0 AND category IS NOT NULL
)
SELECT category,
       COUNT(*) AS protocols,
       ROUND(SUM(share * share) * 10000) AS hhi_points
FROM shares
GROUP BY category
HAVING COUNT(*) >= 3
ORDER BY hhi_points DESC
LIMIT 20`
	},

	// ─── Yield hunting ───────────────────────────────────────────────────────
	{
		title: 'Stablecoin pools — high APY, real TVL',
		description: 'Stablecoin-only pools, APY > 10%, TVL > $1M.',
		subcategory: 'Yield hunting',
		tables: [{ kind: 'dataset', slug: 'yields' }],
		sql: `SELECT project, symbol, chain, apy, tvlUsd, apyMean30d
FROM yields
WHERE stablecoin = 'true'
  AND apy > 10
  AND tvlUsd > 1000000
ORDER BY apy DESC
LIMIT 50`
	},
	{
		title: 'APY trap detector',
		description: 'Pools where APY fell >30% this week — emissions likely ending.',
		subcategory: 'Yield hunting',
		tables: [{ kind: 'dataset', slug: 'yields' }],
		sql: `SELECT project, symbol, chain, apy, apyPct7D, apyPct30D, tvlUsd
FROM yields
WHERE tvlUsd > 5000000
  AND apyPct7D < -30
  AND apy > 5
ORDER BY apyPct7D ASC
LIMIT 30`
	},
	{
		title: 'Calm + chunky pools',
		description: 'TVL > $10M, APY between 3-20%, 30d change within ±5%.',
		subcategory: 'Yield hunting',
		tables: [{ kind: 'dataset', slug: 'yields' }],
		sql: `SELECT project, symbol, chain, apy, apyMean30d, apyPct30D, tvlUsd
FROM yields
WHERE tvlUsd > 10000000
  AND apyPct30D BETWEEN -5 AND 5
  AND apy BETWEEN 3 AND 20
ORDER BY tvlUsd DESC
LIMIT 30`
	},
	{
		title: 'Best borrow rates on Ethereum',
		description: 'Lowest APYs on borrow markets with meaningful liquidity.',
		subcategory: 'Yield hunting',
		tables: [{ kind: 'dataset', slug: 'yields-borrow' }],
		sql: `SELECT project, symbol, apyBaseBorrow, apyRewardBorrow,
       apy AS net_borrow_apy, totalBorrowUsd, ltv
FROM yields_borrow
WHERE chain = 'Ethereum'
  AND totalBorrowUsd > 5000000
  AND borrowable = 'true'
ORDER BY apyBaseBorrow ASC NULLS LAST
LIMIT 30`
	},

	// ─── Security ────────────────────────────────────────────────────────────
	{
		title: 'Hacks over $50M',
		description: 'The big-ticket exploits, sorted by most recent.',
		subcategory: 'Security',
		tables: [{ kind: 'dataset', slug: 'hacks' }],
		sql: `SELECT to_timestamp(TRY_CAST(date AS DOUBLE))::TIMESTAMP::DATE AS hack_date,
       name, amount, technique, targetType, chain
FROM hacks
WHERE TRY_CAST(amount AS DOUBLE) > 50000000
ORDER BY date DESC
LIMIT 50`
	},
	{
		title: 'Most costly techniques (lifetime)',
		description: 'Exploit categories ranked by total capital lost.',
		subcategory: 'Security',
		tables: [{ kind: 'dataset', slug: 'hacks' }],
		sql: `SELECT technique,
       COUNT(*) AS incidents,
       SUM(TRY_CAST(amount AS DOUBLE)) AS total_stolen,
       AVG(TRY_CAST(amount AS DOUBLE)) AS avg_incident
FROM hacks
WHERE technique IS NOT NULL AND amount IS NOT NULL
GROUP BY technique
ORDER BY total_stolen DESC NULLS LAST
LIMIT 20`
	},
	{
		title: 'Hacks per year',
		description: 'Annual cadence and aggregate damage from exploits.',
		subcategory: 'Security',
		tables: [{ kind: 'dataset', slug: 'hacks' }],
		sql: `SELECT EXTRACT(YEAR FROM to_timestamp(TRY_CAST(date AS DOUBLE))) AS year,
       COUNT(*) AS incidents,
       SUM(TRY_CAST(amount AS DOUBLE)) AS total_stolen
FROM hacks
WHERE date IS NOT NULL
GROUP BY year
ORDER BY year DESC`
	},
	{
		title: 'Bridge hacks vs the rest',
		description: 'Bridges bleed more per incident than typical protocols.',
		subcategory: 'Security',
		tables: [{ kind: 'dataset', slug: 'hacks' }],
		sql: `SELECT CASE WHEN bridgeHack = 'true' THEN 'Bridge' ELSE 'Non-bridge' END AS kind,
       COUNT(*) AS incidents,
       SUM(TRY_CAST(amount AS DOUBLE)) AS total_stolen,
       AVG(TRY_CAST(amount AS DOUBLE)) AS avg_incident
FROM hacks
WHERE amount IS NOT NULL
GROUP BY kind`
	},

	// ─── Fundraising ─────────────────────────────────────────────────────────
	{
		title: 'Raises in the past year',
		description: 'Last 12 months of fundraises sorted by cheque size.',
		subcategory: 'Fundraising',
		tables: [{ kind: 'dataset', slug: 'raises' }],
		sql: `SELECT to_timestamp(TRY_CAST(date AS DOUBLE))::TIMESTAMP::DATE AS raised_on,
       name, round, amount, sector, leadInvestors, valuation
FROM raises
WHERE to_timestamp(TRY_CAST(date AS DOUBLE))::TIMESTAMP::DATE >= CURRENT_DATE - INTERVAL 1 YEAR
  AND TRY_CAST(amount AS DOUBLE) > 5
ORDER BY TRY_CAST(amount AS DOUBLE) DESC
LIMIT 50`
	},
	{
		title: 'Sectors gaining momentum',
		description: 'Where capital flowed most in the past year.',
		subcategory: 'Fundraising',
		tables: [{ kind: 'dataset', slug: 'raises' }],
		sql: `SELECT sector,
       COUNT(*) AS deals,
       SUM(TRY_CAST(amount AS DOUBLE)) AS total_raised_musd,
       MEDIAN(TRY_CAST(amount AS DOUBLE)) AS median_round_musd
FROM raises
WHERE to_timestamp(TRY_CAST(date AS DOUBLE))::TIMESTAMP::DATE >= CURRENT_DATE - INTERVAL 1 YEAR
  AND sector IS NOT NULL
GROUP BY sector
HAVING COUNT(*) >= 3
ORDER BY total_raised_musd DESC NULLS LAST
LIMIT 20`
	},
	{
		title: 'Valuation by round',
		description: 'Median pre-money valuation per funding round type.',
		subcategory: 'Fundraising',
		tables: [{ kind: 'dataset', slug: 'raises' }],
		sql: `SELECT round,
       COUNT(*) AS deals,
       MEDIAN(TRY_CAST(valuation AS DOUBLE)) AS median_valuation,
       MEDIAN(TRY_CAST(amount AS DOUBLE)) AS median_check_musd
FROM raises
WHERE to_timestamp(TRY_CAST(date AS DOUBLE))::TIMESTAMP::DATE >= CURRENT_DATE - INTERVAL 2 YEAR
  AND round IS NOT NULL AND round <> ''
GROUP BY round
HAVING COUNT(*) >= 5
ORDER BY median_valuation DESC NULLS LAST
LIMIT 20`
	},

	// ─── Outliers ────────────────────────────────────────────────────────────
	{
		title: 'Suspicious APY, tiny TVL',
		description: 'APY > 50% on pools under $500k — classic rug shape.',
		subcategory: 'Outliers',
		tables: [{ kind: 'dataset', slug: 'yields' }],
		sql: `SELECT project, symbol, chain, apy, tvlUsd, stablecoin, ilRisk
FROM yields
WHERE apy > 50 AND tvlUsd BETWEEN 1000 AND 500000
ORDER BY apy DESC
LIMIT 30`
	},
	{
		title: 'Fees but (almost) no revenue',
		description: 'Protocols that collect fees yet keep < 5% of them.',
		subcategory: 'Outliers',
		tables: [
			{ kind: 'dataset', slug: 'fees' },
			{ kind: 'dataset', slug: 'revenue' }
		],
		sql: `SELECT f.name, f.category,
       f.total30d AS fees_30d,
       COALESCE(r.total30d, 0) AS revenue_30d,
       COALESCE(r.total30d, 0) / NULLIF(f.total30d, 0) AS keep_ratio
FROM fees f
LEFT JOIN revenue r ON r.name = f.name
WHERE f.total30d > 100000
  AND COALESCE(r.total30d, 0) / NULLIF(f.total30d, 0) < 0.05
ORDER BY f.total30d DESC
LIMIT 30`
	},
	{
		title: 'Fastest fee acceleration (week-over-week)',
		description: 'Protocols whose 7d fees exploded vs the prior 7d.',
		subcategory: 'Outliers',
		tables: [{ kind: 'dataset', slug: 'fees' }],
		sql: `SELECT name, category, total7d, total14dto7d,
       (total7d - total14dto7d) / NULLIF(total14dto7d, 0) * 100 AS wow_growth_pct
FROM fees
WHERE total7d > 100000 AND total14dto7d > 10000
ORDER BY wow_growth_pct DESC NULLS LAST
LIMIT 20`
	},
	{
		title: 'Stablecoins not pegged to USD',
		description: 'The (often overlooked) non-dollar stablecoin universe.',
		subcategory: 'Outliers',
		tables: [{ kind: 'dataset', slug: 'stablecoins' }],
		sql: `SELECT name, symbol, pegType, pegMechanism, circulating, price
FROM stablecoins
WHERE pegType IS NOT NULL
  AND pegType NOT IN ('peggedUSD', 'peggedVAR')
ORDER BY circulating DESC NULLS LAST
LIMIT 25`
	}
]
