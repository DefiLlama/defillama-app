import * as React from 'react'
import { Icon } from '~/components/Icon'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export function ThemeSwitch() {
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	return (
		<div className="mt-5 flex items-center gap-2">
			<Icon
				name="sun"
				height={20}
				width={20}
				data-active={!darkMode}
				className="opacity-40 hover:opacity-100 data-[active=true]:opacity-80"
			/>
			<button
				role="switch"
				aria-checked={darkMode}
				aria-label="Toggle dark mode"
				onClick={toggleDarkMode}
				className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
					darkMode ? 'bg-(--switch-bg)' : 'bg-(--bg-input)'
				} `}
			>
				<span
					className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
						darkMode ? 'translate-x-5' : 'translate-x-0.5'
					}`}
				/>
			</button>
			<Icon
				name="moon"
				height={20}
				width={20}
				data-active={darkMode}
				className="opacity-40 hover:opacity-100 data-[active=true]:opacity-80"
			/>
		</div>
	)
}
