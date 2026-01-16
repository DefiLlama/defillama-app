import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'

interface ImagePreviewModalProps {
	imageUrl: string | null
	onClose: () => void
}

export function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose()
		}
	}

	return (
		<Ariakit.DialogProvider open={!!imageUrl} setOpen={(open) => !open && onClose()}>
			<Ariakit.Dialog
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
				portal
				unmountOnHide
				onClick={handleBackdropClick}
			>
				<Ariakit.DialogDismiss className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
					<Icon name="x" height={20} width={20} />
					<span className="sr-only">Close preview</span>
				</Ariakit.DialogDismiss>
				{imageUrl && (
					<img src={imageUrl} alt="Preview" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
				)}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
