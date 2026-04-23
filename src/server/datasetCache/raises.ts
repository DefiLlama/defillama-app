import type { RawRaise } from '~/containers/Raises/api.types'
import { getDatasetDomainDir, readDatasetManifest, readJsonFile } from './core'

function getRaisesDomainDir(): string {
	return getDatasetDomainDir('raises')
}

export async function fetchRaisesByDefillamaIdFromCache(defillamaId: string): Promise<RawRaise[]> {
	await readDatasetManifest()
	if (!defillamaId) {
		return []
	}

	const payload = await readJsonFile<{ raises: RawRaise[] }>(`${getRaisesDomainDir()}/full.json`)
	const rows = []
	for (const raise of payload.raises) {
		if (raise.defillamaId === defillamaId) {
			rows.push(raise)
		}
	}
	return rows
}
