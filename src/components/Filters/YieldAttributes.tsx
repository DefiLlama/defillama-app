import { MenuButtonArrow, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import HeadHelp from '~/components/HeadHelp'
import { FilterButton, FilterItem, FilterPopover } from '~/components/Select/AriakitSelect'
import { useIsClient } from '~/hooks'
import {
  AUDITED,
  MILLION_DOLLAR,
  NO_IL,
  SINGLE_EXPOSURE,
  STABLECOINS,
  useLocalStorageContext,
} from '~/contexts/LocalStorage'

export function YieldAttributes() {
  const isClient = useIsClient()

  const [state, { updateKey }] = useLocalStorageContext()

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

  const updateAttributes = (values) => {
    options.forEach((option) => {
      const isSelected = values?.includes(option.key)

      if ((option.enabled && !isSelected) || (!option.enabled && isSelected)) {
        updateKey(option.key, !option.enabled)
      }
    })
  }

  const value = options.filter((o) => o.enabled).map((o) => o.key)

  const menu = useSelectState({
    value,
    setValue: updateAttributes,
    defaultValue: value,
    gutter: 8,
  })

  return (
    <>
      <FilterButton state={menu}>
        Filter by Attribute
        <MenuButtonArrow />
      </FilterButton>
      <FilterPopover state={menu}>
        {options.map((option) => (
          <FilterItem key={option.key} value={option.key}>
            {option.help ? <HeadHelp title={option.name} text={option.help} /> : option.name}
            <Checkbox checked={option.enabled} />
          </FilterItem>
        ))}
      </FilterPopover>
    </>
  )
}
