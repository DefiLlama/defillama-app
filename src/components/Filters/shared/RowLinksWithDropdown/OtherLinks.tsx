import { useComboboxState } from 'ariakit/combobox'
import { MenuButtonArrow, useMenuState } from 'ariakit/menu'
import Link from 'next/link'
import { Button, Popover } from '~/components/DropdownMenu'
import { Input, Item, List } from '~/components/Combobox'
import { useSetPopoverStyles } from '~/components/Popover/utils'

interface IProps {
	options: { label: string; to: string }[]
	name: string
}

export function OtherLinks({ options, name }: IProps) {
	const defaultList = options.slice(0, 10).map((l) => l.to)

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const combobox = useComboboxState({ defaultList, gutter: 8, animated: true, renderCallback })

	const menu = useMenuState(combobox)

	// Resets combobox value when menu is closed
	if (!menu.mounted && combobox.value) {
		combobox.setValue('')
	}

	return (
		<>
			<Button state={menu} style={{ fontWeight: 600 }}>
				<span>{name}</span>
				<MenuButtonArrow />
			</Button>
			<Popover state={menu} modal={!isLarge} composite={false}>
				<Input state={combobox} placeholder="Search..." autoFocus />
				{combobox.matches.length > 0 ? (
					<List state={combobox}>
						{combobox.matches.map((value, i) => (
							<Link href={value} key={value + i} passHref>
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
