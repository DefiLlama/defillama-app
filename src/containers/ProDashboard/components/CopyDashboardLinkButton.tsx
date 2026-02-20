import * as Ariakit from '@ariakit/react'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

export const CopyDashboardLinkButton = ({
	dashboardVisibility,
	dashboardId
}: {
	dashboardVisibility: 'private' | 'public'
	dashboardId: string
}) => {
	const [copied, setCopied] = useState(false)
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
		}
	}, [])
	const popover = Ariakit.usePopoverStore({ placement: 'bottom-end' })

	const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/pro/${dashboardId}`

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(shareUrl)
			setCopied(true)
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
			copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.log('Failed to copy link:', error)
		}
	}

	const handleShareTo = (social: 'twitter' | 'telegram') => {
		const text = encodeURIComponent('Check out this dashboard on DefiLlama')
		const url = encodeURIComponent(shareUrl)

		let socialUrl = `https://x.com/intent/tweet?text=${text}&url=${url}`

		if (social === 'telegram') {
			socialUrl = `https://t.me/share/url?text=${text}&url=${url}`
		}

		window.open(socialUrl, '_blank', 'noopener,noreferrer')
	}

	if (dashboardVisibility === 'private') {
		return (
			<Tooltip
				content="Make dashboard public to share"
				render={<button aria-disabled={true} />}
				className="flex cursor-not-allowed items-center gap-1 rounded-md border border-(--cards-border) px-1.5 py-1 text-xs text-(--text-disabled) hover:border-transparent focus-visible:border-transparent"
			>
				{copied ? <Icon name="check-circle" height={14} width={14} /> : <Icon name="link" height={14} width={14} />}
				<span>Share</span>
			</Tooltip>
		)
	}

	return (
		<Ariakit.PopoverProvider store={popover}>
			<Ariakit.PopoverDisclosure className="flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent hover:not-disabled:pro-btn-blue focus-visible:border-transparent focus-visible:not-disabled:pro-btn-blue disabled:border-(--cards-border) disabled:text-(--text-disabled)">
				<Icon name="share" height={14} width={14} />
				<span>Share</span>
			</Ariakit.PopoverDisclosure>

			<Ariakit.Popover
				gutter={8}
					className="z-50 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-3 shadow-lg"
					style={{ minWidth: '280px' }}
				>
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<p className="text-xs font-medium text-(--text-label)">Share Link</p>
							<div className="flex gap-2">
								<input
									type="text"
								value={shareUrl}
								readOnly
								className="flex-1 rounded-md border border-(--form-control-border) bg-(--bg-input) px-2.5 py-1.5 text-xs"
							/>
							<button
								onClick={handleCopyLink}
								className="flex items-center gap-1.5 rounded-md border pro-border pro-hover-bg px-2.5 py-1.5 text-xs pro-text2 transition-colors hover:pro-text1"
								title="Copy link"
							>
								{copied ? (
									<Icon name="check-circle" height={14} width={14} className="text-green-500" />
								) : (
									<Icon name="copy" height={14} width={14} />
								)}
							</button>
						</div>
						</div>

						<div className="flex flex-col gap-1.5">
							<p className="text-xs font-medium text-(--text-label)">Share on</p>
							<div className="flex gap-2">
								<button
								onClick={() => handleShareTo('twitter')}
								className="flex flex-1 items-center justify-center gap-2 rounded-md border pro-border pro-hover-bg px-3 py-2 text-xs pro-text2 transition-colors hover:pro-text1"
								title="Share on Twitter/X"
							>
								<Icon name="twitter" height={16} width={16} />
								<span>Twitter</span>
							</button>
							<button
								onClick={() => handleShareTo('telegram')}
								className="flex flex-1 items-center justify-center gap-2 rounded-md border pro-border pro-hover-bg px-3 py-2 text-xs pro-text2 transition-colors hover:pro-text1"
								title="Share on Telegram"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
								</svg>
								<span>Telegram</span>
							</button>
						</div>
					</div>
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
