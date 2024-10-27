import { useComboboxState } from 'ariakit/combobox'
import { MenuButton, MenuButtonArrow, useMenuState } from 'ariakit/menu'
import Link from 'next/link'
import { Popover } from '~/components/DropdownMenu'
import { Input, Item, List } from '~/components/Combobox'
import { useSetPopoverStyles } from '~/components/Popover/utils'
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
			<MenuButton
				state={menu}
				{...props}
				data-variant={variant}
				data-active={isActive}
				style={
					{
						'--bg-light': transparentize(0.9, variant === 'secondary' ? '#eaeaea' : '#2172E5'),
						'--bg-dark': transparentize(0.9, variant === 'secondary' ? '#22242a' : '#629ff4'),
						'--hover-bg-light': transparentize(0.8, variant === 'secondary' ? '#eaeaea' : '#2172E5'),
						'--hover-bg-dark': transparentize(0.8, variant === 'secondary' ? '#22242a' : '#629ff4'),
						'--hover-active-bg': darken(0.1, '#2172E5')
					} as any
				}
				className={`h-[34px] flex items-center gap-4 my-auto rounded-xl py-2 px-3 whitespace-nowrap font-medium text-sm text-[#1F1F1F] dark:text-[#FAFAFA] bg-[var(--bg-light)] dark:bg-[var(--bg-dark)] hover:bg-[var(--hover-bg-light)] hover:dark:bg-[var(--hover-bg-dark)] data-[active=true]:bg-[#2172e5] data-[active=true]:text-white hover:data-[active=true]:bg-[var(--hover-active-bg)] data-[variant=secondary]:w-full`}
			>
				<span>{name}</span>
				<MenuButtonArrow className="relative top-[1px]" />
			</MenuButton>
			<Popover state={menu} modal={!isLarge} composite={false}>
				<Input state={combobox} placeholder="Search..." autoFocus />
				{combobox.matches.length > 0 ? (
					<List state={combobox}>
						{combobox.matches.map((value, i) => (
							<Link href={value} key={value + i} prefetch={false} passHref>
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
