import { fetchCexs } from './api'
import type { ICex } from './types'

interface CexsPageData {
	cexs: ICex[]
}

export async function getCexsPageData(): Promise<CexsPageData> {
	const data = await fetchCexs()

	const cexs: ICex[] = data.cexs.map((c) => {
		const normalizedCex: ICex = {
			name: c.name,
			currentTvl: c.currentTvl ?? null,
			cleanAssetsTvl: c.cleanAssetsTvl ?? null,
			inflows_24h: c.inflows_24h ?? null,
			inflows_1w: c.inflows_1w ?? null,
			inflows_1m: c.inflows_1m ?? null,
			spotVolume: c.spotVolume ?? null,
			oi: c.oi ?? null,
			derivVolume: c.derivVolume ?? null,
			leverage: c.leverage ?? null,
			...(c.slug != null ? { slug: c.slug } : {}),
			...(c.coin != null ? { coin: c.coin } : {}),
			...(c.coinSymbol != null ? { coinSymbol: c.coinSymbol } : {}),
			...(c.walletsLink != null ? { walletsLink: c.walletsLink } : {}),
			...(c.cgId != null ? { cgId: c.cgId } : {}),
			...(c.cgDeriv != null ? { cgDeriv: c.cgDeriv } : {}),
			...(c.lastAuditDate != null ? { lastAuditDate: c.lastAuditDate } : {}),
			...(c.auditor !== undefined ? { auditor: c.auditor } : {}),
			...(c.auditLink != null ? { auditLink: c.auditLink } : {})
		}

		return normalizedCex
	})

	return {
		cexs: cexs.sort((a, b) => (b.cleanAssetsTvl ?? 0) - (a.cleanAssetsTvl ?? 0))
	}
}
