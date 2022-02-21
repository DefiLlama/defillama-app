import { useNFTApp } from 'hooks'
import { useRouter } from 'next/router'
import { Award, BarChart2 } from 'react-feather'
import Switch from 'react-switch'
import styled from 'styled-components'

export default function AppSwitch() {
  const router = useRouter()
  const isNFTApp = useNFTApp()

  const handleChange = () => {
    if (isNFTApp) {
      router.push('/')
    } else {
      router.push('/nfts')
    }
  }

  return (
    <Wrapper htmlFor="small-radius-switch" checked={isNFTApp}>
      <Switch
        checked={isNFTApp}
        onChange={handleChange}
        handleDiameter={28}
        offColor="#000"
        onColor="#000"
        offHandleColor="#333"
        onHandleColor="#333"
        height={40}
        width={160}
        borderRadius={6}
        activeBoxShadow="0px 0px 1px 2px #fffc35"
        uncheckedIcon={
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              fontSize: 16,
              gap: '4px',
            }}
          >
            <Award size={16} />
            NFTs
          </div>
        }
        checkedIcon={
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              fontSize: 16,
              gap: '4px',
            }}
          >
            <BarChart2 size={16} />
            DeFi
          </div>
        }
        uncheckedHandleIcon={
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              fontSize: 16,
              gap: '4px',
            }}
          >
            <BarChart2 size={16} />
            DeFi
          </div>
        }
        checkedHandleIcon={
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              fontSize: 16,
              gap: '4px',
            }}
          >
            <Award size={16} />
            NFTs
          </div>
        }
        id="small-radius-switch"
      />
    </Wrapper>
  )
}

const Wrapper = styled.label<{ checked: boolean }>`
  .react-switch-handle {
    transform: ${({ checked }) => (checked ? 'translateX(75px) !important' : 'translateX(2px)')};
  }

  .react-switch-handle,
  .react-switch-handle > * {
    width: 80px !important;
  }
`
