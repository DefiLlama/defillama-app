import { useYieldApp } from 'hooks'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { Percent, BarChart2 } from 'react-feather'
import Switch from 'react-switch'
import styled from 'styled-components'

export default function AppSwitch() {
  const router = useRouter()
  const isYieldApp = useYieldApp()

  useEffect(() => {
    if (isYieldApp) {
      router.prefetch('/')
    } else {
      router.prefetch('/yields')
    }
  }, [router, isYieldApp])

  const handleChange = () => {
    if (isYieldApp) {
      router.push('/')
    } else {
      router.push('/yields')
    }
  }

  return (
    <Wrapper htmlFor="small-radius-switch" checked={isYieldApp}>
      <Label>{`Navigate to ${isYieldApp ? 'DeFi' : 'Yield'} rankings`}</Label>
      <Switch
        checked={isYieldApp}
        onChange={handleChange}
        handleDiameter={28}
        offColor="#000"
        onColor="#000"
        offHandleColor="#445ed0"
        onHandleColor="#445ed0"
        height={40}
        width={160}
        borderRadius={6}
        activeBoxShadow="0px 0px 1px 2px #fffc35"
        uncheckedIcon={
          <IconWrapper style={{ width: '100%', right: '12px' }}>
            <Percent size={14} />
            Yields
          </IconWrapper>
        }
        checkedIcon={
          <IconWrapper style={{ width: '100%', left: '12px' }}>
            <BarChart2 size={14} />
            DeFi
          </IconWrapper>
        }
        uncheckedHandleIcon={
          <IconWrapper>
            <BarChart2 size={14} />
            DeFi
          </IconWrapper>
        }
        checkedHandleIcon={
          <IconWrapper>
            <Percent size={14} />
            Yields
          </IconWrapper>
        }
        id="small-radius-switch"
      />
    </Wrapper>
  )
}

const Wrapper = styled.label<{ checked: boolean }>`
  margin: 8px 0;

  .react-switch-handle {
    transform: ${({ checked }) => (checked ? 'translateX(85px) !important' : 'translateX(2px)')};
  }

  .react-switch-handle,
  .react-switch-handle > * {
    width: 70px !important;
  }
`

const IconWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 14px;
  gap: 4px;
  color: #fff;
  position: relative;
`

const Label = styled.label`
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
`
