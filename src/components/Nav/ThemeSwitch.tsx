import * as React from 'react'
import { Icon } from '~/components/Icon'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useSidebarState } from '~/contexts/SidebarContext'

export function ThemeSwitch() {
	const [darkMode, toggleDarkMode] = useDarkModeManager()
	const { isCollapsed } = useSidebarState()

	return (
		<button
			onClick={toggleDarkMode}
			className={`mt-2 hidden items-center gap-2 lg:flex ${isCollapsed ? 'justify-center' : ''}`}
		>
			<Icon
				name="sun"
				height={20}
				width={20}
				data-active={!darkMode}
				className="opacity-40 hover:opacity-100 data-[active=true]:opacity-80"
			/>
			{!isCollapsed && <span>{' / '}</span>}
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
