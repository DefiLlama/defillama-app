import * as Ariakit from '@ariakit/react'

export const Checkbox = (props: Ariakit.CheckboxCheckProps) => (
	<Ariakit.CheckboxCheck
		{...props}
		className="h-3 w-3 flex items-center justify-center rounded-sm flex-shrink-0 border border-[#28a2b5]"
	/>
)
