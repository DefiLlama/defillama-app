import { useComboboxState } from 'ariakit/combobox'
import { MenuButtonArrow, useMenuState } from 'ariakit/menu'
import Link from 'next/link'
import { Button, Popover } from '~/components/DropdownMenu'
import { Input, Item, List } from '~/components/Combobox'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import styled from 'styled-components'
import { darken, transparentize } from 'polished'

interface IProps {
	options: { label: string; to: string }[]
	name: string
	variant: 'primary' | 'secondary'
	isActive: boolean
}

export function OtherLinks({ options, name, variant, isActive, ...props }: IProps) {
	const defaultList = options.map((l) => l.to)

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const combobox = useComboboxState({ list: defaultList, gutter: 8, animated: true, renderCallback })

	const menu = useMenuState(combobox)

	// Resets combobox value when menu is closed
	if (!menu.mounted && combobox.value) {
		combobox.setValue('')
	}

	return (
		<>
			<Trigger state={menu} data-variant={variant} data-active={isActive} {...props}>
				<span>{name}</span>
				<MenuButtonArrow />
			</Trigger>
			<Popover state={menu} modal={!isLarge} composite={false}>
				<Input state={combobox} placeholder="Search..." autoFocus />
				{combobox.matches.length > 0 ? (
					<List state={combobox}>
						{combobox.matches.map((value, i) => (
							<Link legacyBehavior href={value} key={value + i} prefetch={false} passHref>
								<Item value={value} focusOnHover setValueOnClick={false} role="link">
									{options.find((l) => l.to === value)?.label ?? value}
								</Item>
							</Link>
						))}
					</List>
				) : (
					<p id="no-results">No results</p>
				)}
			</Popover>
		</>
	)
}

const Trigger = styled(Button)`
	font-size: 0.875rem;
	font-weight: 500;

	&[data-variant='secondary'] {
		width: 100%;
	}

	&[data-active='false'] {
		height: 34px;
		margin: auto 0;
		background-color: ${({ theme }) =>
			theme.mode === 'dark' ? transparentize(0.9, '#629ff4') : transparentize(0.9, '#2172E5')};
	}

	&[data-active='true'] {
		background-color: ${({ color, theme }) => (color ? color : theme.primary1)};
		color: white;
		height: 34px;
		margin: auto 0;
		background-color: #2172e5;

		:hover,
		:focus-visible {
			background-color: ${darken(0.1, '#2172E5')};
		}
	}
`
