import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

interface LlamaAIWelcomeModalProps {
	isOpen: boolean
	onClose: () => void
}

export function LlamaAIWelcomeModal({ isOpen, onClose }: LlamaAIWelcomeModalProps) {
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

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
			<div
				ref={modalContentRef}
				onMouseDown={(e) => e.stopPropagation()}
				className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#5C5CF9]/30 bg-[#0a0b0d] shadow-[0_0_150px_75px_rgba(92,92,249,0.2),0_0_75px_25px_rgba(123,123,255,0.15)]"
			>
				<div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-[#5c5cf9] to-transparent opacity-40"></div>
				<div className="absolute top-[-60px] right-[-60px] h-[150px] w-[150px] rounded-full bg-[#5c5cf9] opacity-15 blur-3xl"></div>

				<button
					className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
					onClick={onClose}
					aria-label="Close modal"
				>
					<Icon name="x" className="h-5 w-5" />
				</button>

				<div className="relative z-10 px-8 py-10">
					<div className="mb-6 flex justify-center">
						<img src="/icons/llama-ai.svg" alt="LlamaAI" className="h-20 w-16 object-contain" />
					</div>

					<h2 className="mb-4 text-center text-2xl leading-snug font-bold text-white">Exclusive access to LlamaAI</h2>

					<p className="mb-1 text-center text-base text-[#888]">
						As one of our longest active subscribers we've given you early access to LlamaAI, our biggest upcoming
						product
					</p>

					<p className="mb-6 text-center text-base leading-relaxed text-[#b8b8b8]">
						You can query our entire database, generate charts and more
					</p>

					<p className="mb-6 text-center text-sm text-[#888]">
						<BasicLink
							href="/ai"
							className="font-bold text-white underline underline-offset-2 hover:text-[#5C5CF9]"
							onClick={onClose}
						>
							Try it
						</BasicLink>{' '}
						to be part of future early access previews
					</p>

					<BasicLink
						href="/ai"
						className="block w-full rounded-xl bg-linear-to-r from-[#5C5CF9] to-[#7B7BFF] px-6 py-3.5 text-center text-base font-semibold text-white shadow-lg shadow-[#5C5CF9]/25 transition-all hover:scale-[1.02] hover:from-[#4A4AF0] hover:to-[#6A6AFF] hover:shadow-xl hover:shadow-[#5C5CF9]/30"
						onClick={onClose}
					>
						Go to Llama AI
					</BasicLink>
				</div>
			</div>
		</div>,
		document.body
	)
}
