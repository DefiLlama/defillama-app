import {
	GOVERNANCE_COMPOUND_API,
	GOVERNANCE_SNAPSHOT_API,
	GOVERNANCE_TALLY_API,
	PROTOCOL_GOVERNANCE_COMPOUND_API,
	PROTOCOL_GOVERNANCE_SNAPSHOT_API,
	PROTOCOL_GOVERNANCE_TALLY_API
} from '~/constants'
import { fetchAndFormatGovernanceData, getGovernanceTypeFromApi } from '~/containers/Governance/queries.client'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import type { GovernanceDataEntry, GovernanceOverviewItem, GovernanceType } from './types'

type GovernanceOverviewProject = { name: string; id: string }

function normalizeDatasetsHost(url: string) {
	// Keep behavior consistent with the protocol governance route.
	return url.replace(
		process.env.DATASETS_SERVER_URL ?? 'https://defillama-datasets.llama.fi',
		'https://defillama-datasets.llama.fi'
	)
}

type GovernanceDetailsPageData =
	| { notFound: true }
	| {
			projectName: string
			governanceData: Array<GovernanceDataEntry>
			governanceTypes: Array<GovernanceType>
	  }

type GovernanceDetailsPageDataWithProps = Exclude<GovernanceDetailsPageData, { notFound: true }>

function governanceIdToApiUrl(gid: string) {
	const trimmed = (gid ?? '').trim()
	if (!trimmed) return null

	const api = trimmed.startsWith('snapshot:')
		? `${PROTOCOL_GOVERNANCE_SNAPSHOT_API}/${trimmed.split('snapshot:')[1].replace(/(:|'|')/g, '/')}.json`
		: trimmed.startsWith('compound:')
			? `${PROTOCOL_GOVERNANCE_COMPOUND_API}/${trimmed.split('compound:')[1].replace(/(:|'|')/g, '/')}.json`
			: trimmed.startsWith('tally:')
				? `${PROTOCOL_GOVERNANCE_TALLY_API}/${trimmed.split('tally:')[1].replace(/(:|'|')/g, '/')}.json`
				: `${PROTOCOL_GOVERNANCE_TALLY_API}/${trimmed.replace(/(:|'|')/g, '/')}.json`

	return normalizeDatasetsHost(api).toLowerCase()
}

function governanceIdsToApis(governanceIDs: Array<string>) {
	const apis: string[] = []
	for (const id of governanceIDs ?? []) {
		const url = governanceIdToApiUrl(id)
		if (url) apis.push(url)
	}
	return apis
}

async function fetchGovernanceDataForApis(governanceApis: Array<string>) {
	const governanceData = await fetchAndFormatGovernanceData(governanceApis)
	const governanceTypes = governanceApis.map(getGovernanceTypeFromApi)
	return { governanceData, governanceTypes }
}

type RawGovernanceOverviewItem = Record<string, unknown> & {
	name?: string
	proposalsCount?: string | number
	followersCount?: string | number
	strategyCount?: string | number
	successfulProposals?: number | string
	states?: Record<string, number | string>
	months?: Record<
		string,
		{
			proposals?: unknown
			states?: { active?: unknown; closed?: unknown }
		}
	>
	proposalsInLast30Days?: number | string
	propsalsInLast30Days?: number | string
	successfulProposalsInLast30Days?: number | string
	successfulPropsalsInLast30Days?: number | string
}
type RawGovernanceOverview = Record<string, RawGovernanceOverviewItem>

const toFiniteNumber = (value: unknown): number | null => {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string') {
		const numericValue = Number(value)
		return Number.isFinite(numericValue) ? numericValue : null
	}
	return null
}

const toCountString = (value: unknown): string => {
	if (typeof value === 'string') return value
	const numericValue = toFiniteNumber(value)
	return numericValue != null ? String(numericValue) : '0'
}

function normalizeGovernanceOverviewItem(raw: RawGovernanceOverviewItem): GovernanceOverviewItem {
	const states: Record<string, number> = {}
	for (const [state, value] of Object.entries(raw.states ?? {})) {
		const numericValue = toFiniteNumber(value)
		if (numericValue != null) {
			states[state] = numericValue
		}
	}

	const months: GovernanceOverviewItem['months'] = {}
	for (const [month, monthData] of Object.entries(raw.months ?? {})) {
		if (monthData == null || typeof monthData !== 'object') {
			months[month] = { proposals: [], states: {} }
			continue
		}

		const proposalsRaw = (monthData as { proposals?: unknown }).proposals
		const proposals = Array.isArray(proposalsRaw) ? proposalsRaw.filter((p): p is string => typeof p === 'string') : []

		const monthStatesRaw = (monthData as { states?: { active?: unknown; closed?: unknown } }).states
		const active = toFiniteNumber(monthStatesRaw?.active)
		const closed = toFiniteNumber(monthStatesRaw?.closed)
		months[month] = {
			proposals,
			states: {
				...(active != null ? { active } : {}),
				...(closed != null ? { closed } : {})
			}
		}
	}

	const proposalsInLast30Days =
		toFiniteNumber(raw.proposalsInLast30Days) ?? toFiniteNumber(raw.propsalsInLast30Days) ?? 0
	const successfulProposalsInLast30Days =
		toFiniteNumber(raw.successfulProposalsInLast30Days) ?? toFiniteNumber(raw.successfulPropsalsInLast30Days) ?? 0
	const successfulProposals = toFiniteNumber(raw.successfulProposals)

	return {
		name: typeof raw.name === 'string' ? raw.name : '',
		proposalsCount: toCountString(raw.proposalsCount),
		followersCount: toCountString(raw.followersCount),
		strategyCount: toCountString(raw.strategyCount),
		...(successfulProposals != null ? { successfulProposals } : {}),
		states,
		months,
		proposalsInLast30Days,
		successfulProposalsInLast30Days,
		subRowData: states
	}
}

export async function getGovernancePageData(): Promise<{ data: GovernanceOverviewItem[] }> {
	const [snapshot, compound, tally] = await Promise.all([
		fetchJson<RawGovernanceOverview>(GOVERNANCE_SNAPSHOT_API),
		fetchJson<RawGovernanceOverview>(GOVERNANCE_COMPOUND_API),
		fetchJson<RawGovernanceOverview>(GOVERNANCE_TALLY_API)
	])

	const data: GovernanceOverviewItem[] = Object.values({ ...snapshot, ...compound, ...tally }).map((item) =>
		normalizeGovernanceOverviewItem(item)
	)

	return {
		data
	}
}

export async function getGovernanceDetailsPageData(input: {
	governanceIDs: Array<string>
	projectName: string
}): Promise<GovernanceDetailsPageDataWithProps>
export async function getGovernanceDetailsPageData(input: { project: string }): Promise<GovernanceDetailsPageData>
export async function getGovernanceDetailsPageData(
	input: { project: string } | { governanceIDs: Array<string>; projectName: string }
): Promise<GovernanceDetailsPageData> {
	// Case 1: We already know the governance IDs (protocol route).
	if ('governanceIDs' in input) {
		const governanceApis = governanceIdsToApis(input.governanceIDs ?? [])
		const { governanceData, governanceTypes } = await fetchGovernanceDataForApis(governanceApis)
		return {
			projectName: input.projectName,
			governanceData,
			governanceTypes
		}
	}

	// Case 2: We only have a project slug (governance route) and must discover IDs via overview indexes.
	const project = input.project
	const [snapshot, compound, tally]: [
		{ [key: string]: GovernanceOverviewProject },
		{ [key: string]: GovernanceOverviewProject },
		{ [key: string]: GovernanceOverviewProject }
	] = await Promise.all([
		fetchJson(GOVERNANCE_SNAPSHOT_API),
		fetchJson(GOVERNANCE_COMPOUND_API),
		fetchJson(GOVERNANCE_TALLY_API)
	])

	const normalizedProject = slug(project)
	const snapshotProject = Object.values(snapshot).find((p) => slug(p.name) === normalizedProject)
	const compoundProject = Object.values(compound).find((p) => slug(p.name) === normalizedProject)
	const tallyProject = Object.values(tally).find((p) => slug(p.name) === normalizedProject)

	if (!snapshotProject && !compoundProject && !tallyProject) {
		return { notFound: true }
	}

	// Build a list of governanceIDs, then fetch/format in parallel.
	const governanceIDs: string[] = []
	if (snapshotProject) {
		governanceIDs.push(
			snapshotProject.id.startsWith('snapshot:') ? snapshotProject.id : `snapshot:${snapshotProject.id}`
		)
	}
	if (compoundProject) {
		governanceIDs.push(
			compoundProject.id.startsWith('compound:') ? compoundProject.id : `compound:${compoundProject.id}`
		)
	}
	if (tallyProject) {
		governanceIDs.push(tallyProject.id.startsWith('tally:') ? tallyProject.id : `tally:${tallyProject.id}`)
	}

	const governanceApis = governanceIdsToApis(governanceIDs)
	const { governanceData, governanceTypes } = await fetchGovernanceDataForApis(governanceApis)

	if (!governanceData || governanceData.length === 0) return { notFound: true }

	return {
		projectName: snapshotProject?.name ?? tallyProject?.name ?? compoundProject?.name ?? project,
		governanceData,
		governanceTypes
	}
}
