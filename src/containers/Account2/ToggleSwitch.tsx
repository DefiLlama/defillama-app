interface ToggleSwitchProps {
	checked: boolean
	onClick?: () => void
	disabled?: boolean
	'aria-label': string
}

export function ToggleSwitch({ checked, onClick, disabled, 'aria-label': ariaLabel }: ToggleSwitchProps) {
	return (
		<button
			role="switch"
			aria-checked={checked}
			aria-label={ariaLabel}
			onClick={onClick}
			disabled={disabled}
			className={`flex w-10 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
				checked ? 'justify-end bg-(--sub-c-1f67d2)' : 'bg-(--sub-c-dedede) dark:bg-(--sub-c-232628)'
			} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
		>
			<span className="block h-5 w-5 rounded-full bg-white" />
		</button>
	)
}
