import * as Ariakit from '@ariakit/react'
import { useState } from 'react'
import { CHART_COLORS } from '~/constants/colors'

interface ColorPickerProps {
	value: string | undefined
	fallback: string
	onChange: (next: string | null) => void
}

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function ColorPicker({ value, fallback, onChange }: ColorPickerProps) {
	const [draft, setDraft] = useState('')
	const active = value ?? fallback

	return (
		<Ariakit.PopoverProvider placement="bottom-start">
			<Ariakit.PopoverDisclosure
				aria-label="Series color"
				className="h-3 w-3 shrink-0 rounded-sm border border-(--divider) shadow-sm transition-transform hover:scale-110"
				style={{ background: active }}
			/>
			<Ariakit.Popover
				gutter={6}
				className="z-50 flex flex-col gap-2 rounded-md border border-(--divider) bg-(--cards-bg) p-2 shadow-lg"
			>
				<div className="grid grid-cols-5 gap-1">
					{CHART_COLORS.map((c) => (
						<button
							key={c}
							type="button"
							aria-label={c}
							onClick={() => onChange(c)}
							className={`h-4 w-4 rounded-sm border transition-transform hover:scale-110 ${
								active === c ? 'border-(--text-primary) ring-1 ring-(--primary)' : 'border-(--divider)'
							}`}
							style={{ background: c }}
						/>
					))}
				</div>
				<div className="flex items-center gap-1">
					<input
						type="text"
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onBlur={() => {
							if (HEX_RE.test(draft.trim())) onChange(draft.trim())
						}}
						placeholder="#2f73c6"
						className="w-20 rounded-sm border border-(--divider) bg-(--app-bg) px-1.5 py-0.5 font-mono text-[10.5px] text-(--text-primary) focus:border-(--primary) focus:outline-none"
					/>
					<button
						type="button"
						onClick={() => onChange(null)}
						className="rounded-sm px-1.5 py-0.5 font-mono text-[10.5px] text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					>
						reset
					</button>
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
