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
			className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex justify-center items-center z-[1000]"
			onClick={onClose}
		>
			<div
				className="pro-bg1 border border-white/10 p-6 w-full max-w-md shadow-xl mx-4"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold pro-text1">{title}</h2>
					<button onClick={onClose} className="p-1 pro-hover-bg pro-text1 transition-colors" aria-label="Close modal">
						<Icon name="x" height={20} width={20} />
					</button>
				</div>

				<p className="mb-6 pro-text2">{message}</p>

				<div className="flex gap-3 justify-end">
					<button
						onClick={onClose}
						className="px-4 py-2 border border-white/20 pro-hover-bg pro-text1 transition-colors font-medium"
					>
						{cancelText}
					</button>
					<button
						onClick={() => {
							onConfirm()
							onClose()
						}}
						className={`px-4 py-2 transition-colors font-medium ${confirmButtonClass}`}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>,
		target
	)
}
