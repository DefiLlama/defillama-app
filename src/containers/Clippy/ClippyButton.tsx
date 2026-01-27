import { Icon } from '~/components/Icon'

interface ClippyButtonProps {
	onClick: () => void
	isOpen: boolean
}

export function ClippyButton({ onClick, isOpen }: ClippyButtonProps) {
	return (
		<button
			onClick={onClick}
			className={`fixed right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-[#2172e5] hover:bg-[#1a5bb8]'} `}
			style={{ '--animate-enabled': 'running' } as React.CSSProperties}
			aria-label={isOpen ? 'Close Clippy' : 'Open Clippy'}
		>
			{isOpen ? (
				<Icon name="x" height={24} width={24} className="text-white" />
			) : (
				<svg width="28" height="28" viewBox="0 0 16 16" className="text-white">
					<use href="/assets/llamaai/ask-llamaai-3.svg#ai-icon" />
				</svg>
			)}
		</button>
	)
}
