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
				className="dialog fixed inset-0 z-50 m-auto h-fit w-full max-w-lg overflow-hidden rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-0 shadow-xl dark:border-[#39393E] dark:bg-[#222429]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-sm" />}
				portal
				unmountOnHide
			>
				<Ariakit.DialogDismiss
					data-umami-event="llamaai-welcome-dismiss"
					className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-[#666] transition-colors hover:bg-[#f7f7f7] hover:text-black dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white"
				>
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.DialogDismiss>

				<div className="relative z-10 px-8 py-10">
					<div className="mb-6 flex justify-center">
						<span className="relative flex flex-col items-center justify-center">
							<span
								className="absolute block h-24.5 w-24.5 shrink-0"
								style={{ background: 'linear-gradient(90deg, #FEE2AD 0%, #FEE2AD 100%)', filter: 'blur(32px)' }}
							></span>
							<img src="/icons/llama-ai.svg" alt="LlamaAI" className="z-10 object-contain" width={83} height={99} />
						</span>
					</div>

					<h2 className="mb-4 text-center text-2xl leading-snug font-bold text-black dark:text-white">
						Introducing LlamaAI 🚀
					</h2>
					<p className="mb-6 text-center text-base leading-6 text-[#666] dark:text-[#919296]">
						We're upgrading your subscription with LlamaAI. Turn data into deep, flexible analysis in a conversational
						way.
					</p>

					<BasicLink
						href="/ai/chat"
						data-umami-event="llamaai-welcome-goto-chat"
						className="llamaai-glow relative mx-auto flex items-center justify-center gap-[10px] overflow-hidden rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-6 py-3.5 text-center text-xl font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)]"
						onClick={onClose}
					>
						<svg className="h-4 w-4 shrink-0">
							<use href="/icons/ask-llamaai-3.svg#ai-icon" />
						</svg>
						<span className="whitespace-nowrap">Try LlamaAI</span>
					</BasicLink>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
