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
			className={`group flex w-full items-center justify-center gap-2 rounded-lg border border-[#5C5CF9] bg-[#5C5CF9] py-[14px] font-medium text-white shadow-xs transition-all duration-200 hover:bg-[#4A4AF0] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#5C5CF9] dark:bg-[#5C5CF9] dark:hover:bg-[#4A4AF0] ${className}`}
		>
			{iconName && <Icon name={iconName} height={16} width={16} className={iconClassName} />}
			<span className="break-words">{children}</span>
		</button>
	)
}
