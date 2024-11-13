import { CheckboxCheck, CheckboxCheckProps } from 'ariakit'

export const Checkbox = (props: CheckboxCheckProps) => (
	<CheckboxCheck
		{...props}
		className="h-3 w-3 flex items-center justify-center rounded-sm flex-shrink-0 border border-[#28a2b5]"
	/>
)
