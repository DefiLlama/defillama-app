import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'

interface DeepLinkPromptModalProps {
	isOpen: boolean
	prompt: string | null
	onClose: () => void
	onConfirm: () => void
}

export function DeepLinkPromptModal({ isOpen, prompt, onClose, onConfirm }: DeepLinkPromptModalProps) {
	return (
		<Ariakit.Dialog
			open={isOpen && !!prompt}
			onClose={onClose}
			className="dialog fixed inset-0 z-50 m-auto h-fit w-full max-w-md overflow-hidden rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-0 shadow-xl dark:border-[#39393E] dark:bg-[#222429]"
			backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-sm" />}
			portal
			unmountOnHide
		>
			<button
				type="button"
				onClick={onClose}
				className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-[#666] transition-colors hover:bg-[#f7f7f7] hover:text-black dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white"
				aria-label="Close"
			>
				<Icon name="x" className="h-5 w-5" />
			</button>

			<div className="relative z-10 px-8 py-10">
				<div className="mb-6 flex justify-center">
					<div
						className="flex h-16 w-16 items-center justify-center rounded-full shadow-[0_4px_16px_-4px_rgba(232,168,71,0.45)]"
						style={{ background: 'linear-gradient(135deg, #FDE0A9 0%, #FBEDCB 60%, #FDE0A9 100%)' }}
					>
						<img src="/assets/llamaai/llama-ai.svg" alt="" className="h-9 w-9 object-contain" />
					</div>
				</div>

				<Ariakit.DialogHeading className="mb-3 text-center text-xl leading-snug font-bold text-black dark:text-white">
					Ask LlamaAI?
				</Ariakit.DialogHeading>
				<p className="mb-5 text-center text-base leading-6 text-[#666] dark:text-[#919296]">
					This link includes a question. Review it before sending.
				</p>

				<div className="mb-6 max-h-[220px] overflow-y-auto rounded-lg border border-[#E6E6E6] bg-[#FAFAFA] p-3 dark:border-[#39393E] dark:bg-[#1a1b1f]">
					<p className="text-sm leading-6 break-words whitespace-pre-wrap text-[#333] dark:text-[#c5c5c5]">{prompt}</p>
				</div>

				<div className="flex flex-col gap-3">
					<button
						type="button"
						onClick={onConfirm}
						className="flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-center text-base font-semibold text-[#5C4A1F] shadow-[0_2px_0_rgba(146,89,15,0.18),0_8px_20px_-6px_rgba(253,224,169,0.55)] transition-all hover:shadow-[0_2px_0_rgba(146,89,15,0.22),0_12px_28px_-6px_rgba(253,224,169,0.75)] active:translate-y-px"
						style={{
							background: 'linear-gradient(93.94deg, #FDE0A9 24.73%, #FBEDCB 57.42%, #FDE0A9 99.73%)'
						}}
					>
						<Icon name="sparkles" height={16} width={16} />
						Ask LlamaAI
					</button>
					<button
						type="button"
						onClick={onClose}
						className="w-full rounded-lg border border-[#E6E6E6] px-6 py-3 text-center text-sm font-medium text-[#666] transition-colors hover:bg-[#f7f7f7] hover:text-black dark:border-[#39393E] dark:text-[#a4a5aa] dark:hover:bg-[#2a2a2f] dark:hover:text-white"
					>
						Close
					</button>
				</div>
			</div>
		</Ariakit.Dialog>
	)
}
