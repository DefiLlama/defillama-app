import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

interface LlamaAIWelcomeModalProps {
	isOpen: boolean
	onClose: () => void
}

export function LlamaAIWelcomeModal({ isOpen, onClose }: LlamaAIWelcomeModalProps) {
	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && onClose()}>
			<Ariakit.Dialog
				className="dialog fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#5C5CF9]/30 bg-[#0a0b0d] p-0 shadow-[0_0_150px_75px_rgba(92,92,249,0.2),0_0_75px_25px_rgba(123,123,255,0.15)]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-sm" />}
				portal
				unmountOnHide
			>
				<div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-[#5c5cf9] to-transparent opacity-40"></div>
				<div className="absolute top-[-60px] right-[-60px] h-[150px] w-[150px] rounded-full bg-[#5c5cf9] opacity-15 blur-3xl"></div>

				<Ariakit.DialogDismiss className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.DialogDismiss>

				<div className="relative z-10 px-8 py-10">
					<div className="mb-6 flex justify-center">
						<img src="/icons/llama-ai.svg" alt="LlamaAI" className="h-20 w-16 object-contain" />
					</div>

					<h2 className="mb-4 text-center text-2xl font-bold leading-snug text-white">Exclusive access to LlamaAI</h2>

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
						Go to LlamaAI
					</BasicLink>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
