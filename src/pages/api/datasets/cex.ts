import { fetchWithErrorLogging } from '~/utils/async'
import { IChainTvl } from '~/api/types'
import { NextApiRequest, NextApiResponse } from 'next'
import { cexData as cexList } from '~/pages/cexs'
import { COINS_PRICES_API, INFLOWS_API, PROTOCOL_API } from '~/constants'

const fetch = fetchWithErrorLogging

const hour24ms = ((Date.now() - 24 * 60 * 60 * 1000) / 1000).toFixed(0)
const hour7dms = ((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000).toFixed(0)
const hour1mms = ((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000).toFixed(0)

export interface ICexItem {
	name: string
	slug?: string
	coin?: string
	coinSymbol?: string
	walletsLink?: string
	cgId?: string
	cgDeriv?: string
	lastAuditDate?: number
	auditor?: string | null
	auditLink?: string
	tvl?: number
	cleanTvl?: number
	'24hInflows'?: number | null
	'7dInflows'?: number | null
	'1mInflows'?: number | null
	spotVolume?: number
	oi?: number
	leverage?: number
}

export async function getCexData(req: NextApiRequest, res: NextApiResponse) {
	let spot = null
	let derivs = null
	let btcPrice = 0

	try {
		const [spotData, derivsData, priceData] = await Promise.all([
			fetch(`https://pro-api.coingecko.com/api/v3/exchanges?per_page=250`, {
				headers: {
					'x-cg-pro-api-key': process.env.CG_KEY
				}
			}).then((res) => res.json()),
			fetch(`https://pro-api.coingecko.com/api/v3/derivatives/exchanges?per_page=1000`, {
				headers: {
					'x-cg-pro-api-key': process.env.CG_KEY
				}
			}).then((res) => res.json()),
			fetch(`${COINS_PRICES_API}/current/coingecko:bitcoin`).then((res) => res.json())
		])

		spot = spotData
		derivs = derivsData
		btcPrice = priceData.coins['coingecko:bitcoin']?.price || 0
	} catch (error) {
		console.error('Error fetching CoinGecko data:', error)
	}

	const cexsWithData = await Promise.all(
		cexList.map(async (c) => {
			if (!c.slug) {
				return c
			}

			try {
				const [protocolData, inflows24h, inflows7d, inflows1m] = await Promise.all([
					fetch(`${PROTOCOL_API}/${c.slug}`).then((r) => r.json()),
					fetch(`${INFLOWS_API}/${c.slug}/${hour24ms}?tokensToExclude=${c.coin ?? ''}`).then((r) => r.json()),
					fetch(`${INFLOWS_API}/${c.slug}/${hour7dms}?tokensToExclude=${c.coin ?? ''}`).then((r) => r.json()),
					fetch(`${INFLOWS_API}/${c.slug}/${hour1mms}?tokensToExclude=${c.coin ?? ''}`).then((r) => r.json())
				])

				const { chainTvls = {} } = protocolData
				let cexTvl = 0
				let ownToken = 0

				Object.values(chainTvls as IChainTvl).forEach((item: any) => {
					if (item.tvl) {
						cexTvl += item.tvl[item.tvl.length - 1]?.totalLiquidityUSD ?? 0
					}
					if (item.tokensInUsd && c.coin) {
						ownToken += item.tokensInUsd[item.tokensInUsd.length - 1]?.tokens[c.coin] ?? 0
					}
				})

				const cleanTvl = cexTvl - ownToken

				const extra: any = {}
				if (c.cgId && spot && !spot.status) {
					const spotEx = spot.find((ex: any) => ex.id === c.cgId)
					if (spotEx) {
						extra.spotVolume = spotEx.trade_volume_24h_btc * btcPrice
					}
				}
				if (c.cgDeriv && derivs && !derivs.status) {
					const _derivs = derivs.find((ex: any) => ex.id === c.cgDeriv)
					if (_derivs) {
						extra.oi = _derivs.open_interest_btc * btcPrice
						extra.leverage = cleanTvl > 0 ? extra.oi / cleanTvl : 0
					}
				}

				// Special handling for Binance historical data
				if (c.slug === 'Binance-CEX' && Number(hour7dms) < 1681609999) {
					inflows7d.outflows = null
				}
				if (c.slug === 'Binance-CEX' && Number(hour1mms) < 1681609999) {
					inflows1m.outflows = null
				}

				return {
					...c,
					tvl: cexTvl,
					cleanTvl,
					'24hInflows': inflows24h?.outflows ?? null,
					'7dInflows': inflows7d?.outflows ?? null,
					'1mInflows': inflows1m?.outflows ?? null,
					...extra
				}
			} catch (error) {
				console.error(`Error fetching data for ${c.name}:`, error)
				return {
					...c,
					tvl: 0,
					cleanTvl: 0,
					'24hInflows': null,
					'7dInflows': null,
					'1mInflows': null
				}
			}
		})
	)

	// Sort by cleanTvl descending
	const sortedCexs = cexsWithData.sort((a, b) => (b.cleanTvl || 0) - (a.cleanTvl || 0))
	res.status(200).json(sortedCexs)
}

export default getCexData
