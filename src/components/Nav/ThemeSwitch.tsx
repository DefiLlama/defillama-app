import { Icon } from '~/components/Icon'
import { useDarkModeManager } from '~/contexts/LocalStorage'

interface ThemeSwitchProps {
	className?: string
	variant?: 'default' | 'pill'
	size?: 'sm' | 'md'
}

function joinClasses(...classes: Array<string | undefined>) {
	return classes.filter(Boolean).join(' ')
}

export function ThemeSwitch({ className, variant = 'default', size = 'md' }: ThemeSwitchProps) {
	const [, toggleDarkMode] = useDarkModeManager()

	if (variant === 'pill') {
		const controlSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
		const iconSize = size === 'sm' ? 16 : 24

		return (
			<button
				type="button"
				onClick={toggleDarkMode}
				aria-label="Toggle theme"
				className={joinClasses(
					'flex items-center gap-1 rounded-full p-0.5 transition-colors',
					'bg-[#FFFFFF] dark:bg-[#131516]',
					className
				)}
			>
				<span
					className={joinClasses(
						`flex ${controlSize} items-center justify-center rounded-full transition-colors`,
						'bg-[#DEDEDE] text-[#090B0C] dark:bg-transparent dark:text-[#8C8F95]'
					)}
				>
					<Icon name="sun" height={iconSize} width={iconSize} />
				</span>
				<span
					className={joinClasses(
						`flex ${controlSize} items-center justify-center rounded-full transition-colors`,
						'text-[#878787] dark:bg-[#232628] dark:text-white'
					)}
				>
					<Icon name="moon" height={iconSize} width={iconSize} />
				</span>
			</button>
		)
	}

	return (
		<button
			type="button"
			onClick={toggleDarkMode}
			aria-label="Toggle theme"
			className={joinClasses('mt-2 hidden w-fit items-center gap-2 lg:flex', className)}
		>
			<Icon
				name="sun"
				height={20}
				width={20}
				className="opacity-80 hover:opacity-100 dark:opacity-40 dark:hover:opacity-100"
			/>
			<span>{' / '}</span>
			<Icon
				name="moon"
				height={20}
				width={20}
				className="opacity-40 hover:opacity-100 dark:opacity-80 dark:hover:opacity-100"
			/>
		</button>
	)
}
