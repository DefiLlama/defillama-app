import { DATASETS_SERVER_URL } from '~/constants'

const DATASETS_PUBLIC_URL = 'https://defillama-datasets.llama.fi'

export const GOVERNANCE_SNAPSHOT_API = `${DATASETS_SERVER_URL}/governance-cache/overview/snapshot.json`
export const GOVERNANCE_COMPOUND_API = `${DATASETS_SERVER_URL}/governance-cache/overview/compound.json`
export const GOVERNANCE_TALLY_API = `${DATASETS_SERVER_URL}/governance-cache/overview/tally.json`

const PROTOCOL_GOVERNANCE_SNAPSHOT_API = `${DATASETS_SERVER_URL}/governance-cache/snapshot`
const PROTOCOL_GOVERNANCE_COMPOUND_API = `${DATASETS_SERVER_URL}/governance-cache/compound`
const PROTOCOL_GOVERNANCE_TALLY_API = `${DATASETS_SERVER_URL}/governance-cache/tally`

function normalizeDatasetsHost(url: string): string {
	return url.replace(DATASETS_SERVER_URL, DATASETS_PUBLIC_URL)
}

export function getGovernanceSnapshotApi(id: string): string {
	return normalizeDatasetsHost(`${PROTOCOL_GOVERNANCE_SNAPSHOT_API}/${id.replace(/(:|'|')/g, '/')}.json`).toLowerCase()
}

export function getGovernanceCompoundApi(id: string): string {
	return normalizeDatasetsHost(`${PROTOCOL_GOVERNANCE_COMPOUND_API}/${id.replace(/(:|'|')/g, '/')}.json`).toLowerCase()
}

export function getGovernanceTallyApi(id: string): string {
	return normalizeDatasetsHost(`${PROTOCOL_GOVERNANCE_TALLY_API}/${id.replace(/(:|'|')/g, '/')}.json`).toLowerCase()
}

export function governanceIdToApiUrl(gid: string): string | null {
	const trimmed = (gid ?? '').trim()
	if (!trimmed) return null

	if (trimmed.startsWith('snapshot:')) {
		return getGovernanceSnapshotApi(trimmed.split('snapshot:')[1])
	}
	if (trimmed.startsWith('compound:')) {
		return getGovernanceCompoundApi(trimmed.split('compound:')[1])
	}
	if (trimmed.startsWith('tally:')) {
		return getGovernanceTallyApi(trimmed.split('tally:')[1])
	}
	return getGovernanceTallyApi(trimmed)
}

export function governanceIdsToApis(governanceIDs: Array<string>): string[] {
	const apis: string[] = []
	for (const id of governanceIDs ?? []) {
		const url = governanceIdToApiUrl(id)
		if (url) apis.push(url)
	}
	return apis
}
