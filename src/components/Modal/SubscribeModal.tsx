import { ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose()
			}
		}

		const handleClickOutside = (event: MouseEvent) => {
			if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
				onClose()
			}
		}

		if (isOpen) {
			document.addEventListener('keydown', handleKeyDown)
			document.addEventListener('mousedown', handleClickOutside)
		} else {
			document.removeEventListener('keydown', handleKeyDown)
			document.removeEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen, onClose])

	if (!isOpen || !isMounted) return null

	return createPortal(
		<div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-[2px] flex justify-center items-center z-50 p-4">
			<div
				ref={modalContentRef}
				onMouseDown={(e) => e.stopPropagation()}
				className="relative max-h-[90vh] overflow-y-auto bg-[#131415] rounded-xl shadow-[0_0_150px_75px_rgba(92,92,249,0.15),_0_0_75px_25px_rgba(123,123,255,0.1)] border border-[#5C5CF9]/10"
			>
				<button
					className="absolute top-3 right-3 text-gray-400 hover:text-white z-20 p-1 rounded-full hover:bg-gray-700 transition-colors"
					onClick={onClose}
					aria-label="Close modal"
				>
					<Icon name="x" className="h-6 w-6" />
				</button>
				{children}
			</div>
		</div>,
		document.body
	)
}
