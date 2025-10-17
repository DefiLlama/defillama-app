import { ReactNode, useEffect, useRef, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'

interface SubscribeModalProps {
	isOpen: boolean
	onClose: () => void
	children: ReactNode
}

export function SubscribeModal({ isOpen, onClose, children }: SubscribeModalProps) {
	const modalContentRef = useRef<HTMLDivElement>(null)
	const [isMounted, setIsMounted] = useState(false)

	useEffect(() => {
		setIsMounted(true)
	}, [])

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose()
		}

		const handleClickOutside = (event: MouseEvent) => {
			if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) onClose()
		}

		if (isOpen) {
			document.addEventListener('keydown', handleKeyDown)
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen, onClose])

	if (!isOpen || !isMounted) return null

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && onClose()}>
			<Ariakit.Dialog
				className="fixed inset-0 z-50 flex items-center justify-center p-4"
				backdrop={<div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />}
				portal
				unmountOnHide
			>
				<div
					ref={modalContentRef}
					onMouseDown={(e) => e.stopPropagation()}
					className="relative max-h-[90dvh] overflow-y-auto rounded-xl border border-[#5C5CF9]/10 bg-[#131415] shadow-[0_0_150px_75px_rgba(92,92,249,0.15),0_0_75px_25px_rgba(123,123,255,0.1)]"
				>
					<Ariakit.DialogDismiss className="absolute top-3 right-3 z-20 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white">
						<Icon name="x" className="h-6 w-6" />
					</Ariakit.DialogDismiss>
					{children}
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
