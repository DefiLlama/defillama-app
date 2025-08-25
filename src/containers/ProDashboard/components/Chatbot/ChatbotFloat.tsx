import { useState } from 'react'
import { Icon } from '~/components/Icon'

interface ChatbotFloatProps {
	isOpen: boolean
	onClick: () => void
}

export const ChatbotFloat = ({ isOpen, onClick }: ChatbotFloatProps) => {
	const [isHovered, setIsHovered] = useState(false)

	return (
		<button
			onClick={onClick}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
				isOpen
					? 'scale-0 opacity-0'
					: 'scale-100 opacity-100 hover:scale-110'
			} ${
				isHovered ? 'animate-bounce' : ''
			}`}
			title="Ask LlamaAI about your dashboard"
		>
			<div className="pro-glass relative h-14 w-14 rounded-full border border-(--primary) bg-(--primary) shadow-lg backdrop-blur">
				{!isOpen && (
					<div className="absolute inset-0 rounded-full bg-(--primary) opacity-75 animate-ping"></div>
				)}
				
				<div className="relative flex h-full w-full items-center justify-center text-white">
					<Icon
						name="sparkles"
						width="24"
						height="24"
						className={`transition-transform duration-200 ${isHovered ? 'scale-110' : ''}`}
					/>
				</div>

			</div>

			{isHovered && (
				<div className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded bg-(--bg-main) px-2 py-1 text-xs text-(--text-primary) shadow-lg">
					Ask about your dashboard
				</div>
			)}
		</button>
	)
}