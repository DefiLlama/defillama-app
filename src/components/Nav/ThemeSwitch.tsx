import * as React from 'react'
import { Icon } from '~/components/Icon'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export function ThemeSwitch({ isCollapsed = false }: { isCollapsed?: boolean }) {
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	if (isCollapsed) {
		return (
			<button
				onClick={toggleDarkMode}
				className="mt-2 flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
				title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				<Icon name={darkMode ? 'moon' : 'sun'} height={20} width={20} className="opacity-80 hover:opacity-100" />
			</button>
		)
	}

	return (
		<button onClick={toggleDarkMode} className="mt-2 hidden w-fit items-center gap-2 lg:flex">
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
