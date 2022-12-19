import { ADAPTOR_TYPES } from '~/utils/adaptorsPages/types'
import { getStaticPropsByType } from '../../utils/adaptorsPages/[type]'
export const type = ADAPTOR_TYPES.DEXS
export const getStaticProps = getStaticPropsByType(type)
export { default } from '../../utils/adaptorsPages/[type]'

async function getCexVolume(){
  const [
		cexs,
		{
			bitcoin: { usd: btcPrice }
		}
	] = await Promise.all([
		fetch(`https://api.coingecko.com/api/v3/exchanges?per_page=250`).then((r) => r.json()),
		fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`).then((r) => r.json())
	])
  const volume = cexs.filter(c=>c.trust_score>=8).reduce((sum, c)=>sum+c.trade_volume_24h_btc_normalized, 0) * btcPrice
  return volume
}