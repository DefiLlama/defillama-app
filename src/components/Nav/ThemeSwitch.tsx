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
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	if (variant === 'pill') {
		const controlSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
		const iconSize = size === 'sm' ? 16 : 24

		return (
			<button
				type="button"
				onClick={toggleDarkMode}
				aria-label="Toggle theme"
				className={joinClasses(
					'flex items-center gap-1 rounded-full p-0.5',
					darkMode ? 'bg-[#131516]' : 'bg-[#FFFFFF]',
					className
				)}
			>
				<span
					className={joinClasses(
						`flex ${controlSize} items-center justify-center rounded-full`,
						darkMode ? 'text-[#8C8F95]' : 'text-[#878787]'
					)}
				>
					<Icon name="sun" height={iconSize} width={iconSize} />
				</span>
				<span
					className={joinClasses(
						`flex ${controlSize} items-center justify-center rounded-full`,
						darkMode ? 'bg-[#232628] text-white' : 'bg-[#DEDEDE] text-[#090B0C]'
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
				data-active={!darkMode}
				className="opacity-40 hover:opacity-100 data-[active=true]:opacity-80"
			/>
			<span>{' / '}</span>
			<Icon
				name="moon"
				height={20}
				width={20}
				data-active={darkMode}
				className="opacity-40 hover:opacity-100 data-[active=true]:opacity-80"
			/>
		</button>
	)
}
