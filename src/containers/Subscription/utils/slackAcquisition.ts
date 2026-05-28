export const SLACK_ACQUISITION_ENTRIES = ['mention', 'dm', 'apphome'] as const

export type SlackAcquisitionEntry = (typeof SLACK_ACQUISITION_ENTRIES)[number]

export type SlackAcquisition = {
	source: 'slack'
	entry: SlackAcquisitionEntry
}

type RouterQuery = Record<string, string | string[] | undefined>
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const SLACK_ACQUISITION_KEY = 'slack_acquisition_source'

function firstQueryValue(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value
}

function isSlackAcquisitionEntry(value: unknown): value is SlackAcquisitionEntry {
	return typeof value === 'string' && SLACK_ACQUISITION_ENTRIES.includes(value as SlackAcquisitionEntry)
}

export function applySlackAcquisitionFromQuery(query: RouterQuery, storage: StorageLike): void {
	const from = firstQueryValue(query.from)
	if (from !== 'slack') {
		storage.removeItem(SLACK_ACQUISITION_KEY)
		return
	}
	const rawEntry = firstQueryValue(query.entry)
	const entry: SlackAcquisitionEntry = isSlackAcquisitionEntry(rawEntry) ? rawEntry : 'mention'
	storage.setItem(SLACK_ACQUISITION_KEY, JSON.stringify({ source: 'slack', entry }))
}

export function readSlackAcquisition(storage: StorageLike): SlackAcquisition | null {
	const raw = storage.getItem(SLACK_ACQUISITION_KEY)
	if (!raw) return null
	storage.removeItem(SLACK_ACQUISITION_KEY)
	try {
		const parsed = JSON.parse(raw) as Partial<SlackAcquisition>
		if (parsed.source !== 'slack') return null
		if (!isSlackAcquisitionEntry(parsed.entry)) return null
		return { source: 'slack', entry: parsed.entry }
	} catch {
		return null
	}
}

type FetcherLike = (
	url: string,
	init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<{ ok: boolean; json: () => Promise<any> } | undefined | null>

export async function persistSlackAcquisitionIfFirst(
	acquisition: SlackAcquisition,
	deps: { fetch: FetcherLike; aiServer: string }
): Promise<{ wrote: boolean }> {
	const getResponse = await deps.fetch(`${deps.aiServer}/user-settings`).catch(() => null)
	if (!getResponse || !getResponse.ok) return { wrote: false }

	const data = await getResponse.json().catch(() => null)
	const existingSource = data?.settings?.signup_source
	if (existingSource != null) return { wrote: false }

	const putResponse = await deps
		.fetch(`${deps.aiServer}/user-settings`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ settings: { signup_source: acquisition } })
		})
		.catch(() => null)

	if (!putResponse || !putResponse.ok) return { wrote: false }
	return { wrote: true }
}
