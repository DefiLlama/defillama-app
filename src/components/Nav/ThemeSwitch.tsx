import * as React from 'react'
import { Icon } from '~/components/Icon'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export function ThemeSwitch() {
	const [darkMode, toggleDarkMode] = useDarkModeManager()

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
