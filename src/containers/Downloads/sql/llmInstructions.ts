import { chartDatasets, chartDatasetCategories, type ChartDatasetDefinition } from '../chart-datasets'
import { datasets, datasetCategories, type DatasetDefinition } from '../datasets'
import { CHART_COLUMN_SHAPES } from './schemaShapes'
import { identifierize } from './useTableRegistry'

export function buildLlmInstructions(): string {
	return [
		header(),
		overviewSection(),
		typesSection(),
		namingSection(),
		dialectSection(),
		gotchasSection(),
		fixedShapesSection(),
		flatCatalogSection(),
		timeseriesCatalogSection()
	].join('\n\n')
}

function header(): string {
	return `# DefiLlama SQL Studio — dataset reference

This document describes every dataset queryable from the DefiLlama SQL Studio, the LlamaSQL dialect it runs on, and the conventions used to name tables and columns. Use it as reference material when drafting queries.`
}

function overviewSection(): string {
	return `## What this is
- A browser-side LlamaSQL environment loaded with DefiLlama datasets as in-memory tables.
- Data sources are the same endpoints that power the DefiLlama UI, fetched as CSV and registered into LlamaSQL on demand.
- Tables referenced in SQL (after \`FROM\`, \`JOIN\`, \`PIVOT\`, \`UNPIVOT\`) are auto-loaded if their identifier matches a known dataset.
- Two dataset flavours live side by side:
  - **Flat datasets** — one snapshot table per topic. Rows are entities (a protocol, a chain, a pool, a hack, a raise, etc.). Columns are current metrics.
  - **Time-series (chart) datasets** — parameterised templates. One table per specific protocol / chain / category / stablecoin, with one row per date.`
}

function typesSection(): string {
	return `## Column types at a glance
LlamaSQL infers types from the CSVs DefiLlama serves. Treat these as the working assumptions:

| Pattern | Inferred type | Notes |
|---|---|---|
| \`name\`, \`symbol\`, \`category\`, \`chain\`, \`chains\`, \`slug\`, \`project\`, \`pool\`, \`protocol\`, \`displayName\` | VARCHAR | \`chains\` is usually a **comma-separated list** in a single VARCHAR, not a first-class array. |
| \`tvl\`, \`mcap\`, \`total24h\`, \`total7d\`, \`total30d\`, \`totalAllTime\`, \`circulating\`, \`amount\`, \`apy\`, \`apyBase\`, \`apyReward\`, \`tvlUsd\` | DOUBLE | Can be NULL. |
| \`change_1d\`, \`change_7d\`, \`change_1m\`, \`change_30dover30d\` | DOUBLE (percent) | Values like \`12.3\` mean \`+12.3%\`. |
| \`date\` in flat tables (e.g. \`raises\`, \`hacks\`) | BIGINT (unix seconds) | **Wrap with \`to_timestamp(date)\` before any date function.** |
| \`date\` in time-series tables | DATE or TIMESTAMP | Safe to use directly with \`date_trunc\`, \`strftime\`, etc. |
| Epoch millisecond columns (rare) | BIGINT | Use \`epoch_ms(ts)\` / divide by 1000 as needed. |
| Mixed-case / dot-containing columns (e.g. \`"chainTvls.Ethereum"\`) | VARCHAR or DOUBLE | **Must be double-quoted**; once quoted, stay quoted. |
| VARCHAR that looks numeric | VARCHAR | CSV inference is conservative; wrap with \`TRY_CAST(x AS DOUBLE)\` when comparing. |
| \`rewardTokens\`, any list-looking field | VARCHAR | Usually a comma-joined string, not a native LIST. |`
}

function namingSection(): string {
	return `## Table naming

**Flat datasets** use the dataset slug with dashes replaced by underscores.
Examples: \`protocols\`, \`dex_volumes\`, \`yield_pools\`, \`rwa_assets\`, \`perp_funding\`.

**Time-series datasets** use \`ts_<slug>_<param>\`, where:
- \`<slug>\` = chart slug with dashes replaced by underscores.
- \`<param>\` = a valid value of the chart's parameter (protocol slug, chain slug, category name, stablecoin, etc).

Examples: \`ts_chain_tvl_chart_ethereum\`, \`ts_protocol_tvl_chart_aave-v3\`, \`ts_category_fees_chart_dexs\`, \`ts_stablecoin_mcap_chart_usdt\`.

Param values match the slugs used elsewhere in DefiLlama (e.g. \`aave-v3\`, not \`aave\`; \`dexs\`, not \`DEXs\`). When in doubt, the user should pick the param from the Schema drawer rather than guess.`
}

function dialectSection(): string {
	return `## LlamaSQL dialect quick reference
Short, non-exhaustive.

- \`QUALIFY <cond>\` filters on window-function output without a subquery.
- \`ASOF [LEFT|RIGHT|FULL] JOIN ... ON right.t <= left.t\` — nearest-prior match on \`t\`.
- \`PIVOT <table_or_subquery> ON <col> USING <agg>(val) GROUP BY <col>\` — long → wide. \`UNPIVOT\` reverses.
- Named windows: \`... OVER w ... WINDOW w AS (...)\`.
- Rolling: \`AVG(x) OVER (ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW)\`.
- Conditional aggregates: \`SUM(x) FILTER (WHERE <cond>)\`.
- Percentiles: \`approx_quantile(x, q)\` (fast) or \`quantile_cont(x, q)\` (exact).
- Pick at max: \`arg_max(value, order_expr)\` / \`arg_min\`.
- List handling: \`UNNEST(list)\`, \`string_split(x, ',')\`, \`array_length(x)\`.
- Dates: \`date_trunc('month', d)\`, \`strftime(d, '%Y-%m')\`, \`to_timestamp(secs)\`, \`epoch_ms(ts)\`.
- Casting: \`TRY_CAST(x AS DOUBLE)\` (returns NULL on failure), postfix \`x::BIGINT\`.
- Safe math: \`a / NULLIF(b, 0)\`.
- Unquoted identifiers are case-insensitive; quoted identifiers are exact.`
}

function gotchasSection(): string {
	return `## Gotchas worth flagging
- \`fees.chains\` (and most overview-derived tables) is a COMMA-SEPARATED VARCHAR — not an array. Explode with \`UNNEST(string_split(chains, ','))\`.
- \`protocols\` has BOTH \`chain\` (singular — the primary chain) AND \`chains\` (comma-list of all deployments). Use \`chain\` for simple per-chain grouping.
- \`raises\` and \`hacks\` store \`date\` as BIGINT unix seconds. Always wrap with \`to_timestamp(date)\` before any date arithmetic.
- Some chart slugs have **dynamic** column shapes (listed below). Column names vary per parameter — e.g. \`ts_chain_tvl_chart_ethereum\` carries \`tvl\` plus chain-specific buckets like \`liquidstaking\`, \`treasury\`, \`Masterchef\`. The top-level numeric column is \`tvl\` (not \`value\`) for chain-tvl-chart.
- Default time-series shape is \`(date, value)\` — assume that unless the chart is listed below with a different shape.
- \`COUNT(*)\` and other 64-bit aggregates return bigint. They render fine in the result grid; cast to \`INTEGER\` if downstream code can't handle bigint.
- Reserved words, spaces, and camelCase columns must be double-quoted: \`"Open Interest"\`, \`"totalRevenue24h"\`, \`"chainTvls.Ethereum"\`.`
}

function fixedShapesSection(): string {
	const entries = Object.entries(CHART_COLUMN_SHAPES)
	const fixed = entries.filter(([, shape]) => shape !== 'dynamic') as [string, readonly string[]][]
	const dynamic = entries.filter(([, shape]) => shape === 'dynamic').map(([k]) => k)

	const lines: string[] = [`## Chart shapes — exceptions to the default \`(date, value)\``, '', `### Fixed shapes`]
	for (const [slug, cols] of fixed) {
		lines.push(`- \`${slug}\`: ${cols.map((c) => `\`${c}\``).join(', ')}`)
	}
	lines.push('')
	lines.push(`### Dynamic shapes (columns vary per param; inspect after loading)`)
	for (const slug of dynamic) {
		lines.push(`- \`${slug}\``)
	}
	return lines.join('\n')
}

function flatCatalogSection(): string {
	const lines: string[] = [
		`## Flat datasets (${datasets.length})`,
		`Each dataset is one table. Grain (what one row represents) is annotated per category.`
	]
	for (const category of datasetCategories) {
		const items = datasets.filter((d) => d.category === category)
		if (items.length === 0) continue
		lines.push('')
		lines.push(`### ${category}`)
		const grain = grainForCategory(category)
		if (grain) lines.push(`_Grain: ${grain}._`)
		lines.push('')
		for (const d of items) {
			lines.push(describeFlatDataset(d))
		}
	}
	return lines.join('\n')
}

function grainForCategory(category: string): string | null {
	switch (category) {
		case 'TVL':
			return 'one row per protocol (or per chain for chain-level tables)'
		case 'Stablecoins':
			return 'one row per stablecoin (or per chain for chain-breakdown tables)'
		case 'RWA':
			return 'one row per RWA asset / category / chain'
		case 'Yields':
			return 'one row per yield pool'
		case 'Volume':
			return 'one row per protocol (with 24h/7d/30d totals)'
		case 'Fees & Revenue':
			return 'one row per protocol (with 24h/7d/30d totals)'
		case 'Security':
			return 'one row per hack incident'
		case 'Fundraising':
			return 'one row per raise round'
		case 'Unlocks':
			return 'one row per protocol emission schedule entry'
		case 'Treasuries':
			return 'one row per protocol treasury'
		case 'ETFs':
			return 'one row per ETF product (or per day for history tables)'
		case 'Bridges':
			return 'one row per bridge'
		case 'CEX':
			return 'one row per exchange'
		default:
			return null
	}
}

function describeFlatDataset(d: DatasetDefinition): string {
	const tableName = identifierize(d.slug)
	const fields =
		d.fields && d.fields.length > 0 ? d.fields.map((f) => `\`${f}\``).join(', ') : '_columns resolved on load_'
	return `- \`${tableName}\` — **${d.name}.** ${d.description}\n  Columns: ${fields}`
}

function timeseriesCatalogSection(): string {
	const lines: string[] = [
		`## Time-series datasets (${chartDatasets.length})`,
		`Each entry is a **template**. The real table name substitutes the parameter — pick a valid value (protocol slug, chain slug, category, etc) to materialise one series. Grain is always "one row per date".`
	]
	for (const category of chartDatasetCategories) {
		const items = chartDatasets.filter((d) => d.category === category)
		if (items.length === 0) continue
		lines.push('')
		lines.push(`### ${category}`)
		lines.push('')
		for (const d of items) {
			lines.push(describeChartDataset(d))
		}
	}
	return lines.join('\n')
}

function describeChartDataset(d: ChartDatasetDefinition): string {
	const slugId = identifierize(d.slug)
	const tableForm = `ts_${slugId}_<${d.paramLabel.toLowerCase()}>`
	const shape = CHART_COLUMN_SHAPES[d.slug]
	const columns = !shape
		? '`date`, `value`'
		: shape === 'dynamic'
			? '`date` + dynamic (varies per param)'
			: shape.map((c) => `\`${c}\``).join(', ')
	return `- \`${tableForm}\` — **${d.name}.** ${d.description}\n  Param: ${d.paramLabel} (${d.paramType}). Columns: ${columns}.`
}
