import type { IResponseCGMarketsAPI } from '~/api/types'
import { Icon } from '~/components/Icon'
import { formattedNum } from '~/utils'
import { formatPercent } from './format'

export const ShareButton = ({
	coin,
	percent,
	absolute,
	quantity,
	startDate,
	endDate
}: {
	coin?: IResponseCGMarketsAPI
	percent: number
	absolute: number
	quantity: number
	startDate: string
	endDate: string
}) => {
	const handleShare = () => {
		if (typeof window === 'undefined') return
		const changeValue = quantity ? absolute * quantity : absolute
		const unit = quantity ? 'your position' : 'per token'
		const valueLabel = `$${formattedNum(changeValue, false)}`
		const tweet = `PnL for ${coin?.name ?? 'selected token'} from ${startDate} to ${endDate}: ${formatPercent(
			percent
		)} (${valueLabel} ${unit}). Check yours on DefiLlama.`
		const shareUrl = new URL('https://twitter.com/intent/tweet')
		shareUrl.searchParams.set('text', tweet)
		window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer')
	}

	return (
		<button
			onClick={handleShare}
			className="inline-flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-sm font-medium text-(--link) hover:border-(--link-active-bg)"
		>
			<Icon name="share" width={16} height={16} />
			Share result
		</button>
	)
}
