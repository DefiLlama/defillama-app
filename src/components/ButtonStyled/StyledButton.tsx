import { ReactNode } from 'react'
import { Icon, IIcon } from '~/components/Icon'

interface StyledButtonProps {
	onClick?: () => void
	disabled?: boolean
	children: ReactNode
	className?: string
	iconName?: IIcon['name']
	iconClassName?: string
}

export const StyledButton = ({
	onClick,
	disabled,
	children,
	className = '',
	iconName,
	iconClassName = 'group-hover:scale-110 transition-transform'
}: StyledButtonProps) => {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className={`font-medium rounded-lg border border-[#5C5CF9] dark:border-[#5C5CF9] bg-[#5C5CF9] dark:bg-[#5C5CF9] hover:bg-[#4A4AF0] dark:hover:bg-[#4A4AF0] text-white transition-all duration-200 py-[14px] shadow-sm hover:shadow-md group flex items-center gap-2 justify-center w-full disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
		>
			{iconName && <Icon name={iconName} height={16} width={16} className={iconClassName} />}
			<span className="break-words">{children}</span>
		</button>
	)
}
