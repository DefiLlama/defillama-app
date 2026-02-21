import { fetchProtocols } from '~/containers/Protocols/api'
import { chainIconUrl } from '~/utils'

type ChainOption = {
	value: string
	label: string
	logo: string
}

export async function getCompareChainsPageData(): Promise<{ chains: ChainOption[] }> {
	const pData = await fetchProtocols()
	const chains: ChainOption[] = (pData?.chains ?? []).map((val) => ({
		value: val,
		label: val,
		logo: chainIconUrl(val)
	}))

	return {
		chains
	}
}
