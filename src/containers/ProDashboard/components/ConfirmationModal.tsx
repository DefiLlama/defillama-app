import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '~/components/Icon'

interface ConfirmationModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
	title?: string
	message?: string
	confirmText?: string
	cancelText?: string
	confirmButtonClass?: string
}

export function ConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	title = 'Confirm Action',
	message = 'Are you sure you want to proceed with this action?',
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	confirmButtonClass = 'bg-red-500 hover:bg-red-600 text-white'
}: ConfirmationModalProps) {
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose()
			}
		}

		if (isOpen) {
			document.addEventListener('keydown', handleEscape)
			document.body.style.overflow = 'hidden'
		}

		return () => {
			document.removeEventListener('keydown', handleEscape)
			document.body.style.overflow = ''
		}
	}, [isOpen, onClose])

	if (!isOpen) return null

	const target = document.querySelector('.pro-dashboard') ?? document.body

	return createPortal(
		<div
			className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-xs dark:bg-black/70"
			onClick={onClose}
		>
			<div
				className="pro-bg1 mx-4 w-full max-w-md border border-white/10 p-6 shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="pro-text1 text-lg font-semibold">{title}</h2>
					<button onClick={onClose} className="pro-hover-bg pro-text1 p-1 transition-colors" aria-label="Close modal">
						<Icon name="x" height={20} width={20} />
					</button>
				</div>

				<p className="pro-text2 mb-6">{message}</p>

				<div className="flex justify-end gap-3">
					<button
						onClick={onClose}
						className="pro-hover-bg pro-text1 border border-white/20 px-4 py-2 font-medium transition-colors"
					>
						{cancelText}
					</button>
					<button
						onClick={() => {
							onConfirm()
							onClose()
						}}
						className={`px-4 py-2 font-medium transition-colors ${confirmButtonClass}`}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>,
		target
	)
}
