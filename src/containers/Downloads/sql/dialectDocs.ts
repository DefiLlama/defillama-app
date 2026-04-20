// Curated DuckDB reference content — the idioms that actually hit DefiLlama data.
// Kept short on purpose: surface what a user reaches for, not the full manual.

export type TechniqueName =
	| 'QUALIFY'
	| 'row_number'
	| 'PARTITION BY'
	| 'date_trunc'
	| 'strftime'
	| 'to_timestamp'
	| 'Rolling window'
	| 'FULL OUTER JOIN'
	| 'COALESCE'
	| 'CTE'
	| 'ASOF JOIN'
	| 'PIVOT'
	| 'approx_quantile'
	| 'arg_max'
	| 'FILTER (WHERE)'
	| 'UNNEST'
	| 'string_split'

// Each technique doc is surfaced as a tooltip on the chip — keep to one tight sentence.
export const TECHNIQUE_DOCS: Record<TechniqueName, string> = {
	QUALIFY: 'Filter on a window function result without wrapping in a subquery. DuckDB-specific.',
	row_number: 'Window function that assigns a unique rank within each partition.',
	'PARTITION BY': 'Restarts the window frame for each group — think GROUP BY for windows.',
	date_trunc: "Floors a date to the start of 'day' / 'week' / 'month' / 'quarter' / 'year'.",
	strftime: 'Formats a date or timestamp as text — useful for labels and year-over-year grouping.',
	to_timestamp: 'Converts unix seconds into a TIMESTAMP. Needed for raises, hacks, any BIGINT-dated table.',
	'Rolling window': 'ROWS BETWEEN N PRECEDING AND CURRENT ROW — a trailing N+1 row frame.',
	'FULL OUTER JOIN': 'Keeps matched rows plus unmatched rows from both sides.',
	COALESCE: 'Returns the first non-null argument. Pairs with FULL OUTER JOIN to fill gaps.',
	CTE: 'WITH name AS (…) — names a query step for readability and reuse.',
	'ASOF JOIN': 'Match each left row to the most recent right row at or before it. Great when dates don’t line up.',
	PIVOT: 'Reshape long → wide. ON <column> USING <agg>(value). DuckDB-native.',
	approx_quantile: 'Fast approximate percentile. Cheap on large series, deterministic within a query.',
	arg_max: 'Return the value of one column at the max of another — no GROUP BY acrobatics.',
	'FILTER (WHERE)': 'Aggregate only rows matching a condition. Cleaner than SUM(CASE WHEN …).',
	UNNEST: 'Flatten a list/array column so each element becomes its own row.',
	string_split: 'Split a string into a list of values. UNNEST it to get rows.'
}

export interface CookbookSnippet {
	title: string
	blurb: string
	sql: string
	tag: CookbookTag
	techniques: TechniqueName[]
}

export type CookbookTag = 'Time series' | 'Joins' | 'Reshape' | 'Distributions'

export const COOKBOOK_TAGS: CookbookTag[] = ['Time series', 'Joins', 'Reshape', 'Distributions']

export const COOKBOOK_SNIPPETS: CookbookSnippet[] = [
	{
		tag: 'Time series',
		title: 'Top 3 protocols per chain',
		blurb: 'Ranks rows within groups using a window function, then filters with QUALIFY — no subquery needed.',
		techniques: ['QUALIFY', 'row_number', 'PARTITION BY'],
		sql: `SELECT name, chain, tvl
FROM protocols
WHERE tvl IS NOT NULL
QUALIFY row_number() OVER (PARTITION BY chain ORDER BY tvl DESC) <= 3
ORDER BY chain, tvl DESC`
	},
	{
		tag: 'Time series',
		title: '30-day moving average',
		blurb: 'Smooth a noisy daily series with a rolling window of the previous 29 days plus today.',
		techniques: ['Rolling window'],
		sql: `SELECT date,
       tvl,
       AVG(tvl) OVER (ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) AS ma30
FROM ts_chain_tvl_chart_ethereum
ORDER BY date DESC`
	},
	{
		tag: 'Time series',
		title: 'Unix epoch → readable date',
		blurb: "Raises and hacks store `date` as unix seconds (BIGINT). Wrap with to_timestamp before any date function.",
		techniques: ['to_timestamp'],
		sql: `SELECT to_timestamp(date) AS raised_at,
       name,
       amount,
       round
FROM raises
WHERE amount IS NOT NULL
ORDER BY raised_at DESC
LIMIT 50`
	},
	{
		tag: 'Joins',
		title: 'Stitch two series with FULL OUTER JOIN',
		blurb: 'Align two daily time-series on date, filling gaps with COALESCE.',
		techniques: ['FULL OUTER JOIN', 'COALESCE', 'CTE'],
		sql: `WITH j AS (
  SELECT COALESCE(l.date, d.date) AS date,
         COALESCE(l.value, 0)     AS lending,
         COALESCE(d.value, 0)     AS dexs
  FROM ts_category_fees_chart_lending l
  FULL OUTER JOIN ts_category_fees_chart_dexs d ON l.date = d.date
)
SELECT date, lending, dexs, lending + dexs AS total
FROM j
ORDER BY date DESC`
	},
	{
		tag: 'Joins',
		title: 'ASOF JOIN — raises + same-day TVL',
		blurb: "Raise timestamps are seconds-granular; TVL is daily. ASOF pulls the most recent TVL row at or before each raise.",
		techniques: ['ASOF JOIN', 'to_timestamp'],
		sql: `SELECT to_timestamp(r.date) AS raised_at,
       r.name               AS protocol,
       r.amount,
       t.tvl                AS eth_tvl_on_that_day
FROM raises r
ASOF LEFT JOIN ts_chain_tvl_chart_ethereum t
  ON t.date <= to_timestamp(r.date)
WHERE r.amount > 100
ORDER BY raised_at DESC
LIMIT 25`
	},
	{
		tag: 'Reshape',
		title: 'PIVOT — TVL by chain × category',
		blurb: 'Turn a long table into wide columns — sum TVL per category, one row per chain.',
		techniques: ['PIVOT'],
		sql: `PIVOT (
  SELECT chain, category, tvl
  FROM protocols
  WHERE tvl IS NOT NULL
)
ON category
USING SUM(tvl)
GROUP BY chain
ORDER BY chain
LIMIT 25`
	},
	{
		tag: 'Reshape',
		title: 'Chain popularity — protocols per chain',
		blurb: "Explode each protocol's comma-list of chains, then count to see which chains host the widest ecosystem.",
		techniques: ['UNNEST', 'string_split'],
		sql: `SELECT chain,
       COUNT(*) AS protocols
FROM (
  SELECT UNNEST(string_split(chains, ',')) AS chain
  FROM protocols
  WHERE chains IS NOT NULL
)
GROUP BY chain
ORDER BY protocols DESC
LIMIT 25`
	},
	{
		tag: 'Distributions',
		title: 'Yield percentiles per chain',
		blurb: 'Distribution snapshot — where the median APY sits and where the top tail starts, per chain.',
		techniques: ['approx_quantile'],
		sql: `SELECT chain,
       COUNT(*) AS pools,
       approx_quantile(apy, 0.50) AS p50,
       approx_quantile(apy, 0.90) AS p90,
       approx_quantile(apy, 0.99) AS p99
FROM yields
WHERE apy IS NOT NULL
GROUP BY chain
ORDER BY pools DESC
LIMIT 25`
	},
	{
		tag: 'Distributions',
		title: 'Conditional aggregates with FILTER',
		blurb: 'Split a total into components without writing SUM(CASE WHEN …).',
		techniques: ['FILTER (WHERE)'],
		sql: `SELECT chain,
       SUM(tvl)                                      AS total_tvl,
       SUM(tvl) FILTER (WHERE category = 'Dexs')    AS dex_tvl,
       SUM(tvl) FILTER (WHERE category = 'Lending')  AS lending_tvl
FROM protocols
WHERE tvl IS NOT NULL
GROUP BY chain
ORDER BY total_tvl DESC
LIMIT 20`
	},
	{
		tag: 'Distributions',
		title: 'Top protocol per chain — arg_max',
		blurb: 'Pick the name that corresponds to the max TVL, per chain, without window-function acrobatics.',
		techniques: ['arg_max'],
		sql: `SELECT chain,
       arg_max(name, tvl) AS top_protocol,
       MAX(tvl)           AS top_tvl
FROM protocols
WHERE tvl IS NOT NULL
GROUP BY chain
ORDER BY top_tvl DESC
LIMIT 25`
	}
]

export interface ShortcutEntry {
	action: string
	keys: string[]
	note?: string
}

export const SHORTCUTS: ShortcutEntry[] = [
	{ action: 'Run query', keys: ['⌘', '↵'], note: 'Missing tables auto-load first.' },
	{ action: 'Trigger completions', keys: ['Ctrl', 'Space'] },
	{ action: 'Toggle line comment', keys: ['⌘', '/'] },
	{ action: 'Move line up / down', keys: ['Alt', '↑ / ↓'] },
	{ action: 'Duplicate line', keys: ['Shift', 'Alt', '↓'] },
	{ action: 'Multi-cursor', keys: ['⌘', 'D'], note: 'Select next occurrence.' },
	{ action: 'Monaco command palette', keys: ['F1'] },
	{ action: 'Format selection', keys: ['⌘', 'K', '⌘', 'F'], note: 'If formatter registered.' }
]

export interface DialectTip {
	title: string
	body: string
}

export const DIALECT_TIPS: DialectTip[] = [
	{
		title: 'Case-insensitive identifiers',
		body: 'Unquoted names are case-insensitive. Once you quote a camelCase column (e.g. "totalRevenue24h"), you must keep quoting it — DuckDB treats quoted names as exact.'
	},
	{
		title: 'Reserved & mixed-case columns',
		body: 'Wrap in double quotes: SELECT "Open Interest" FROM open_interest. Chain/protocol columns like chainTvls.Ethereum need quotes too.'
	},
	{
		title: 'VARCHAR columns that look numeric',
		body: 'CSV inference is conservative — some numeric-looking columns land as VARCHAR. Wrap comparisons with TRY_CAST(x AS DOUBLE) to avoid cast errors.'
	},
	{
		title: 'Unix epoch dates',
		body: 'Tables like raises and hacks store date as BIGINT (unix seconds). Convert with to_timestamp(date). Daily chart tables already arrive as DATE / TIMESTAMP.'
	},
	{
		title: 'BigInt results in JS',
		body: 'COUNT(*) and other 64-bit ints come back as bigint in the result grid. They render correctly, but exports cast to number where safe.'
	}
]

export const DUCKDB_DOCS_URL = 'https://duckdb.org/docs/sql/introduction'
