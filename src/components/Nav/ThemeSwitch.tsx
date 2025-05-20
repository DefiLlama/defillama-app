import * as React from 'react'
import { Icon } from '~/components/Icon'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export function ThemeSwitch() {
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	return (
		<button onClick={toggleDarkMode} className="hidden lg:flex items-center gap-2 mt-2">
			<Icon
				name="sun"
				height={20}
				width={20}
				data-active={!darkMode}
				className="opacity-40 data-[active=true]:opacity-80 hover:opacity-100"
			/>
			<span>{' / '}</span>
			<Icon
				name="moon"
				height={20}
				width={20}
				data-active={darkMode}
				className="opacity-40 data-[active=true]:opacity-80 hover:opacity-100"
			/>
		</button>
	)
}
