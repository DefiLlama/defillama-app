import { maxAgeForNext } from '~/api'
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
import type { GovernanceDataEntry, GovernanceType } from './types'

type GovernanceOverviewProject = { name: string; id: string }

function normalizeDatasetsHost(url: string) {
	// Keep behavior consistent with the protocol governance route.
	return url.replace(
		process.env.DATASETS_SERVER_URL ?? 'https://defillama-datasets.llama.fi',
		'https://defillama-datasets.llama.fi'
	)
}

type GovernanceDetailsPageData =
	| { notFound: true; props: null }
	| {
			props: {
				projectName: string
				governanceData: Array<GovernanceDataEntry>
				governanceTypes: Array<GovernanceType>
			}
			revalidate: number
	  }

type GovernanceDetailsPageDataWithProps = Exclude<GovernanceDetailsPageData, { notFound: true; props: null }>

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

type RawGovernanceOverview = Record<string, Record<string, unknown> & { states: Record<string, number> }>

export async function getGovernancePageData() {
	const [snapshot, compound, tally] = await Promise.all([
		fetchJson<RawGovernanceOverview>(GOVERNANCE_SNAPSHOT_API),
		fetchJson<RawGovernanceOverview>(GOVERNANCE_COMPOUND_API),
		fetchJson<RawGovernanceOverview>(GOVERNANCE_TALLY_API)
	])

	return {
		props: {
			data: Object.values({ ...snapshot, ...compound, ...tally }).map((x) => ({
				...x,
				subRowData: x.states
			}))
		},
		revalidate: maxAgeForNext([22])
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
			props: {
				projectName: input.projectName,
				governanceData,
				governanceTypes
			},
			revalidate: maxAgeForNext([22])
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
		return { notFound: true, props: null }
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

	if (!governanceData || governanceData.length === 0) return { notFound: true, props: null }

	return {
		props: {
			projectName: snapshotProject?.name ?? tallyProject?.name ?? compoundProject?.name ?? project,
			governanceData,
			governanceTypes
		},
		revalidate: maxAgeForNext([22])
	}
}
