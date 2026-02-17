import * as Ariakit from '@ariakit/react'

export const Checkbox = (props: Ariakit.CheckboxCheckProps) => (
	<Ariakit.CheckboxCheck
		{...props}
		className="flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-[#28a2b5]"
	/>
)
