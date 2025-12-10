import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'

interface AriakitCheckboxProps {
	checked: boolean
	onChange: (checked: boolean) => void
	label?: React.ReactNode
	description?: string
	className?: string
	disabled?: boolean
}

export function AriakitCheckbox({
	checked,
	onChange,
	label,
	description,
	className = '',
	disabled = false
}: AriakitCheckboxProps) {
	return (
		<Ariakit.CheckboxProvider value={checked} setValue={onChange}>
			<label
				className={`flex cursor-pointer items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
			>
				<Ariakit.Checkbox disabled={disabled} className="sr-only" />
				<div
					className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
						checked
							? 'border-(--primary) bg-(--primary) text-white'
							: 'border-(--form-control-border) bg-(--bg-input) hover:border-(--primary)/60'
					} ${disabled ? 'cursor-not-allowed' : ''}`}
				>
					{checked && <Icon name="check" width={10} height={10} />}
				</div>
				{label && (
					<div className="flex flex-col">
						<span className="text-xs text-(--text-secondary)">{label}</span>
						{description && <span className="text-[10px] text-(--text-tertiary)">{description}</span>}
					</div>
				)}
			</label>
		</Ariakit.CheckboxProvider>
	)
}
