import { Check, X } from 'react-feather'
import Switch from 'react-switch'
import styled from 'styled-components'
import { TYPE } from '../../Theme'
import HeadHelp from '../HeadHelp'

interface IProps {
  toggle: () => {}
  enabled: boolean
  help: string
  name: string
}

const OptionToggle = ({ toggle, enabled = false, help, name }: IProps) => {
  return (
    <TYPE.body style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
      <Switch
        onChange={toggle}
        checked={enabled}
        height={20}
        width={40}
        uncheckedIcon={false}
        checkedIcon={false}
        uncheckedHandleIcon={
          <IconWrapper>
            <X size={14} />
          </IconWrapper>
        }
        checkedHandleIcon={
          <IconWrapper>
            <Check size={14} />
          </IconWrapper>
        }
      />
      &nbsp;
      {help ? <HeadHelp title={name} text={help} /> : name}
    </TYPE.body>
  )
}

const IconWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  color: black;
  height: 100%;
  fontsize: 12px;
`

export default OptionToggle
