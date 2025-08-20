import { maxAgeForNext } from '~/api'
import { CEXS_API, COINS_PRICES_API, INFLOWS_API, PROTOCOL_API } from '~/constants'
import { Cexs } from '~/containers/Cexs'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

interface ICex {
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
}

const hour24ms = ((Date.now() - 24 * 60 * 60 * 1000) / 1000).toFixed(0)

const hour7dms = ((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000).toFixed(0)

const hour1mms = ((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000).toFixed(0)

export const getStaticProps = withPerformanceLogging('cexs/index', async () => {
	const [
		{ cexs: cexData },
		spot,
		derivs,
		{
			coins: {
				'coingecko:bitcoin': { price: btcPrice }
			}
		}
	] = await Promise.all([
		fetchJson(CEXS_API),
		fetchJson(`https://pro-api.coingecko.com/api/v3/exchanges?per_page=250`, {
			headers: {
				'x-cg-pro-api-key': process.env.CG_KEY
			}
		}),
		fetchJson(`https://pro-api.coingecko.com/api/v3/derivatives/exchanges?per_page=1000`, {
			headers: {
				'x-cg-pro-api-key': process.env.CG_KEY
			}
		}),
		fetchJson(`${COINS_PRICES_API}/current/coingecko:bitcoin`)
	])
	const cexs = await Promise.all(
		cexData.map(async (c: ICex) => {
			if (c.slug == null) {
				return c
			} else {
				const res = await Promise.allSettled([
					fetchJson(`${PROTOCOL_API}/${c.slug}`).catch(() => ({ chainTvls: {} })),
					fetchJson(`${INFLOWS_API}/${c.slug}/${hour24ms}?tokensToExclude=${c.coin ?? ''}`).catch(() => null),
					fetchJson(`${INFLOWS_API}/${c.slug}/${hour7dms}?tokensToExclude=${c.coin ?? ''}`).catch(() => null),
					fetchJson(`${INFLOWS_API}/${c.slug}/${hour1mms}?tokensToExclude=${c.coin ?? ''}`).catch(() => null)
				]).catch((e) => null)

				if (res === null) {
					return c
				}

				const [{ chainTvls = {} }, inflows24h, inflows7d, inflows1m] = res.map((p) => p.value)

				let cexTvl = 0

				let ownToken = 0

				for (const chain in chainTvls) {
					if (chainTvls[chain].tvl) {
						cexTvl += chainTvls[chain].tvl[chainTvls[chain].tvl.length - 1]?.totalLiquidityUSD ?? 0
					}

					if (chainTvls[chain].tokensInUsd) {
						ownToken += chainTvls[chain].tokensInUsd[chainTvls[chain].tokensInUsd.length - 1]?.tokens[c.coin] ?? 0
					}
				}

				const cleanTvl = cexTvl - ownToken

				const extra = {} as any
				if (c.cgId) {
					// console.log(c.cgId, spot)
					const spotEx = spot && !spot.status && spot.find((ex) => ex.id === c.cgId)
					if (!spotEx) {
						console.error(c.name + ' is not in spot list')
					} else {
						extra.spotVolume = spotEx.trade_volume_24h_btc * btcPrice
					}
				}
				if (c.cgDeriv) {
					const _derivs = derivs && !derivs.status && derivs.find((ex) => ex.id === c.cgDeriv)
					// extra.oi = derivs.find((ex) => ex.id === c.cgDeriv).open_interest_btc * btcPrice
					if (!_derivs) {
						console.error(c.name + ' is not in derivs list')
					} else {
						extra.oi = _derivs.open_interest_btc * btcPrice
						extra.leverage = extra.oi / cleanTvl
					}
				}

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
			}
		})
	)

	return {
		props: {
			cexs: cexs.sort((a, b) => b.cleanTvl - a.cleanTvl)
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['CEXs', 'ranked by', 'Assets']

export default function CexsPage({ cexs }) {
	return (
		<Layout title={`CEX Transparency - DefiLlama`} defaultSEO pageName={pageName}>
			<Cexs cexs={cexs} />
		</Layout>
	)
}
