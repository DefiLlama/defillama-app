import { useComboboxState } from 'ariakit/combobox'
import { MenuButton, MenuButtonArrow, useMenuState } from 'ariakit/menu'
import Link from 'next/link'
import { Popover } from '~/components/DropdownMenu'
import { Input, Item, List } from '~/components/Combobox'
import { useSetPopoverStyles } from '~/components/Popover/utils'

interface IProps {
	options: { label: string; to: string }[]
	name: string
	isActive: boolean
	className?: string
}

export function OtherLinks({ options, name, isActive, className, ...props }: IProps) {
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
				data-active={isActive}
				className={`h-9 flex items-center gap-4 my-auto rounded-xl py-2 px-3 whitespace-nowrap font-medium text-sm text-black dark:text-white bg-[var(--link-bg)]  hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--link-active-bg)] data-[active=true]:text-white ${
					className ?? ''
				}`}
			>
				<span>{name}</span>
				<MenuButtonArrow className="relative top-[1px]" />
			</MenuButton>
			{menu.mounted ? (
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
			) : null}
		</>
	)
}
