import { MenuButtonArrow, useMenuState } from 'ariakit/menu'
import HeadHelp from 'components/HeadHelp'
import { useLocalStorageContext } from 'contexts/LocalStorage'
import { Button, Checkbox, ItemWithCheckbox, Popover } from './shared'

interface IProps {
  title: string
  options: {
    name: string
    key: string
    enabled: boolean
    help?: string
  }[]
}

export function MenuWithCheckboxItems({ title, options }: IProps) {
  const [, { updateKey }] = useLocalStorageContext()

  const values = options.filter((o) => o.enabled).map((o) => o.key)

  const updateAttributes = (updatedValues) => {
    options.forEach((option) => {
      const isSelected = updatedValues.selected?.find((value) => value === option.key)

      if ((option.enabled && !isSelected) || (!option.enabled && isSelected)) {
        updateKey(option.key, !option.enabled)
      }
    })
  }

  const menu = useMenuState({
    values: { selected: values },
    setValues: updateAttributes,
    defaultValues: { selected: values },
    gutter: 8,
  })

  return (
    <>
      <Button state={menu} className="button">
        {title}
        <MenuButtonArrow />
      </Button>
      <Popover state={menu} className="menu">
        {options.map((option) => (
          <ItemWithCheckbox key={option.key} name="selected" value={option.key}>
            {option.help ? <HeadHelp title={option.name} text={option.help} /> : option.name}
            <Checkbox checked={option.enabled} />
          </ItemWithCheckbox>
        ))}
      </Popover>
    </>
  )
}
