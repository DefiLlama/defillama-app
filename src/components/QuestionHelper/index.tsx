import * as React from 'react'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'

export function QuestionHelper({ text, disabled, ...props }: { text: string; disabled?: boolean; className?: string }) {
	return (
		<Tooltip content={disabled ? null : text}>
			<Icon name="help-circle" height={16} width={16} {...props} />
		</Tooltip>
	)
}
