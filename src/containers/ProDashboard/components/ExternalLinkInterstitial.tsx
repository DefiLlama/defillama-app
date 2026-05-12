import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { externalLinkHostname } from './externalLink'

interface ExternalLinkInterstitialProps {
	href: string | null
	onClose: () => void
}

export function ExternalLinkInterstitial({ href, onClose }: ExternalLinkInterstitialProps) {
	const hostname = externalLinkHostname(href)
	const isOpen = href !== null && hostname !== null

	return (
		<Ariakit.DialogProvider
			open={isOpen}
			setOpen={(open) => {
				if (!open) onClose()
			}}
		>
			<Ariakit.Dialog
				className="dialog w-full max-w-md gap-0 border pro-dashboard border-(--cards-border) bg-(--cards-bg) p-6 shadow-2xl"
				unmountOnHide
				portal
				hideOnInteractOutside
			>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-xl font-semibold pro-text1">Leaving DefiLlama</h2>
					<Ariakit.DialogDismiss
						className="rounded-md pro-hover-bg p-1 pro-text1 transition-colors"
						aria-label="Close"
					>
						<Icon name="x" height={20} width={20} />
					</Ariakit.DialogDismiss>
				</div>

				<p className="mb-2 pro-text2">You are about to visit an external site. DefiLlama is not responsible for its content.</p>
				<div className="mb-6 break-all rounded-md border pro-border bg-(--bg-tertiary) p-3 text-sm pro-text1">
					<div className="font-medium">{hostname}</div>
					<div className="mt-1 text-xs pro-text2 break-all">{href}</div>
				</div>

				<div className="flex justify-end gap-3">
					<Ariakit.DialogDismiss className="rounded-md border pro-border pro-hover-bg px-4 py-2 text-sm pro-text2 transition-colors hover:pro-text1">
						Cancel
					</Ariakit.DialogDismiss>
					<a
						href={href ?? '#'}
						target="_blank"
						rel="noopener noreferrer nofollow ugc"
						onClick={onClose}
						className="rounded-md bg-(--old-blue) px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
					>
						Continue
					</a>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
