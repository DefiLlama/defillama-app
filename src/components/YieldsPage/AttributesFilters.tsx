import { MenuWithCheckboxItems } from 'components/DropdownMenu'
import {
  AUDITED,
  MILLION_DOLLAR,
  NO_IL,
  SINGLE_EXPOSURE,
  STABLECOINS,
  useLocalStorageContext,
} from 'contexts/LocalStorage'
import { useIsClient } from 'hooks'

export function AttributesFilters() {
  const isClient = useIsClient()

  const [state] = useLocalStorageContext()

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

  return <MenuWithCheckboxItems title="Filter by Attribute" options={options} />
}
