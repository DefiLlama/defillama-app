import { MenuButtonArrow, useMenuState } from 'ariakit'
import { Button, Checkbox, ItemWithCheckbox, Popover } from 'components/DropdownMenu/shared'
import HeadHelp from 'components/HeadHelp'
import {
  AUDITED,
  MILLION_DOLLAR,
  NO_IL,
  SINGLE_EXPOSURE,
  STABLECOINS,
  useLocalStorageContext,
} from 'contexts/LocalStorage'
import { useIsClient } from 'hooks'

export function YieldAttributes() {
  const isClient = useIsClient()

  const [state, { updateKey }] = useLocalStorageContext()

  const updateAttributes = (updatedValues) => {
    options.forEach((option) => {
      const isSelected = updatedValues.selected?.find((value) => value === option.key)

      if ((option.enabled && !isSelected) || (!option.enabled && isSelected)) {
        updateKey(option.key, !option.enabled)
      }
    })
  }

  const options = [
    {
      name: 'Stablecoins',
      key: STABLECOINS,
      enabled: state[STABLECOINS] && isClient,
      help: 'Select pools consisting of stablecoins only',
    },
    {
      name: 'Single Exposure',
      key: SINGLE_EXPOSURE,
      enabled: state[SINGLE_EXPOSURE] && isClient,
      help: 'Select pools with single token exposure only',
    },
    {
      name: 'No IL',
      key: NO_IL,
      enabled: state[NO_IL] && isClient,
      help: 'Select pools with no impermanent loss',
    },
    {
      name: 'Million Dollar',
      key: MILLION_DOLLAR,
      enabled: state[MILLION_DOLLAR] && isClient,
      help: 'Select pools with at least one million dollar in TVL',
    },
    {
      name: 'Audited',
      key: AUDITED,
      enabled: state[AUDITED] && isClient,
      help: 'Select pools from audited projects only',
    },
  ]

  const values = options.filter((o) => o.enabled).map((o) => o.key)

  const menu = useMenuState({
    values: { selected: values },
    setValues: updateAttributes,
    defaultValues: { selected: values },
    gutter: 8,
  })

  return (
    <>
      <Button state={menu} className="button">
        Filter by Attribute
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
