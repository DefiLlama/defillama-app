import { PROTOCOLS_API } from '~/constants'
import { chainIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'

type RawProtocolsResponse = {
	chains?: string[]
}

type ChainOption = {
	value: string
	label: string
	logo: string
}

export async function getCompareChainsPageData(): Promise<{ chains: ChainOption[] }> {
	const pData = await fetchJson<RawProtocolsResponse>(PROTOCOLS_API)
	const chains: ChainOption[] = (pData?.chains ?? []).map((val) => ({
		value: val,
		label: val,
		logo: chainIconUrl(val)
	}))

	return {
		chains
	}
}
