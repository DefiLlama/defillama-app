import * as React from 'react'
import { Icon } from '~/components/Icon'

interface ThemeSwitchProps {
	darkMode: boolean
	toggle: () => void
}

export function ThemeSwitch({ darkMode, toggle }: ThemeSwitchProps) {
	return (
		<button onClick={toggle} className="hidden lg:flex items-center gap-2">
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
