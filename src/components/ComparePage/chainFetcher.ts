import { getChainPageData } from '~/api/categories/chains'
import { getChainPageData as getChainVolume } from '~/api/categories/adaptors'
import { getBridgeOverviewPageData } from '~/api/categories/bridges'
import { getChainsPageData, getOverviewItemPageData, getChainPageData as getFeesData } from '~/api/categories/adaptors'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export const fetchChain = async ({ chain }) => {
	const [data, volumeData, chainVolumeData, feesData, usersData, txsData, chainFeesData, bridgeData, stablecoinsData] =
		await Promise.all([
			getChainPageData(chain).catch(() => null),
			getChainsPageData('dexs').catch(() => null),
			getChainVolume('dexs', chain).catch(() => null),
			getOverviewItemPageData('fees', chain).catch(() => null),
			fetch(`https://api.llama.fi/userData/users/chain$${chain}`)
				.then((r) => r.json())
				.catch(() => null),
			fetch(`https://api.llama.fi/userData/txs/chain$${chain}`)
				.then((r) => r.json())
				.catch(() => null),
			getFeesData('fees', chain)
				.catch(() => null)
				.then((r) => (r && r.total24h === undefined ? null : r)),
			getBridgeOverviewPageData(chain).catch(() => null),
			[]
		])

	return {
		...data.props,
		volumeData: volumeData || null,
		chainVolumeData: chainVolumeData || null,
		feesData: feesData || null,
		usersData: usersData || null,
		chainFeesData: chainFeesData || null,
		txsData: txsData || null,
		bridgeData: bridgeData || null,
		stablecoinsData: stablecoinsData || null
	}
}
