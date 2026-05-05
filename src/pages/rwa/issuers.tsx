import type { GetStaticProps } from 'next'
import { fetchRWAActiveTVLs } from '~/containers/RWA/api'
import type { IFetchedRWAProject } from '~/containers/RWA/api.types'
import { isCategoryIncludedInStandardRwaOverview, isTypeIncludedByDefault } from '~/containers/RWA/constants'
import { RWAIssuers, type RWAIssuerSegmentedRow, type RWAIssuerSlice } from '~/containers/RWA/Issuers'
import { RWATabNav } from '~/containers/RWA/TabNav'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps: GetStaticProps = withPerformanceLogging('rwa/issuers', async () => {
	const data = await fetchRWAActiveTVLs()

	const byIssuer = new Map<string, MutableIssuerRow>()
	for (const item of data ?? []) {
		if ((item.category ?? []).some((category) => !isCategoryIncludedInStandardRwaOverview(category))) continue
		if (!isTypeIncludedByDefault(item.type, 'chain', null)) continue

		const issuer = item.issuer ?? 'Unknown'
		const existing = byIssuer.get(issuer) ?? createMutableIssuerRow(issuer)
		const slice = existing[getIssuerSliceKey(item)]

		slice.assetCount += 1
		slice.onChainMcap += sumNumberMap(item.onChainMcap)
		slice.activeMcap += sumNumberMap(item.activeMcap)
		slice.defiActiveTvl += sumNestedNumberMap(item.defiActiveTvl)
		for (const chain of item.chain ?? []) {
			slice.chains.add(chain)
		}
		byIssuer.set(issuer, existing)
	}

	const rows = Array.from(byIssuer.values())
		.map(toSerializableIssuerRow)
		.sort((a, b) => b.base.onChainMcap - a.base.onChainMcap)

	return {
		props: { rows },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA']

export default function RWAIssuersPage({ rows }: { rows: RWAIssuerSegmentedRow[] }) {
	return (
		<Layout
			title="RWA Issuers - Real World Asset Analytics - DefiLlama"
			description="Issuer rankings for tokenized real-world assets, including asset counts and on-chain market cap exposure."
			pageName={pageName}
			canonicalUrl="/rwa/issuers"
		>
			<RWATabNav active="issuers" />
			<RWAIssuers rows={rows} />
		</Layout>
	)
}

type IssuerSliceKey = 'base' | 'stablecoinsOnly' | 'governanceOnly' | 'stablecoinsAndGovernance'
type MutableIssuerSlice = Omit<RWAIssuerSlice, 'chains'> & { chains: Set<string> }
type MutableIssuerRow = {
	issuer: string
	base: MutableIssuerSlice
	stablecoinsOnly: MutableIssuerSlice
	governanceOnly: MutableIssuerSlice
	stablecoinsAndGovernance: MutableIssuerSlice
}

function createMutableIssuerRow(issuer: string): MutableIssuerRow {
	return {
		issuer,
		base: createMutableIssuerSlice(),
		stablecoinsOnly: createMutableIssuerSlice(),
		governanceOnly: createMutableIssuerSlice(),
		stablecoinsAndGovernance: createMutableIssuerSlice()
	}
}

function createMutableIssuerSlice(): MutableIssuerSlice {
	return {
		assetCount: 0,
		activeMcap: 0,
		onChainMcap: 0,
		defiActiveTvl: 0,
		chains: new Set<string>()
	}
}

function getIssuerSliceKey(item: IFetchedRWAProject): IssuerSliceKey {
	if (item.stablecoin && item.governance) return 'stablecoinsAndGovernance'
	if (item.stablecoin) return 'stablecoinsOnly'
	if (item.governance) return 'governanceOnly'
	return 'base'
}

function toSerializableIssuerRow(row: MutableIssuerRow): RWAIssuerSegmentedRow {
	return {
		issuer: row.issuer,
		base: toSerializableIssuerSlice(row.base),
		stablecoinsOnly: toSerializableIssuerSlice(row.stablecoinsOnly),
		governanceOnly: toSerializableIssuerSlice(row.governanceOnly),
		stablecoinsAndGovernance: toSerializableIssuerSlice(row.stablecoinsAndGovernance)
	}
}

function toSerializableIssuerSlice(slice: MutableIssuerSlice): RWAIssuerSlice {
	return {
		assetCount: slice.assetCount,
		activeMcap: slice.activeMcap,
		onChainMcap: slice.onChainMcap,
		defiActiveTvl: slice.defiActiveTvl,
		chains: Array.from(slice.chains).sort((a, b) => a.localeCompare(b))
	}
}

function sumNumberMap(map: Record<string, number> | null | undefined): number {
	let sum = 0
	for (const v of Object.values(map ?? {})) {
		if (Number.isFinite(v)) sum += v
	}
	return sum
}

function sumNestedNumberMap(map: Record<string, Record<string, number>> | null | undefined): number {
	let sum = 0
	for (const inner of Object.values(map ?? {})) {
		for (const v of Object.values(inner ?? {})) {
			if (Number.isFinite(v)) sum += v
		}
	}
	return sum
}
