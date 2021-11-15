import React, { useState } from 'react'
import styled from 'styled-components'
import { ButtonLight } from '../ButtonStyled'
import { AutoRow } from '../Row'
import { isAddress } from '../../utils'
import { useSavedAccounts } from '../../contexts/LocalStorage'
import { AutoColumn } from '../Column'

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  border-radius: 12px;
`

const Input = styled.input`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  white-space: nowrap;
  background: none;
  border: none;
  outline: none;
  padding: 12px 16px;
  border-radius: 12px;
  color: ${({ theme }) => theme.text1};
  background-color: ${({ theme }) => theme.bg1};
  font-size: 16px;
  margin-right: 1rem;
  border: 1px solid ${({ theme }) => theme.bg3};

  ::placeholder {
    color: ${({ theme }) => theme.text3};
    font-size: 14px;
  }

  @media screen and (max-width: 640px) {
    ::placeholder {
      font-size: 1rem;
    }
  }
`



function AccountSearch({ history, small }) {
  const [accountValue, setAccountValue] = useState()
  const [savedAccounts, addAccount] = useSavedAccounts()

  function handleAccountSearch() {
    if (isAddress(accountValue)) {
      history.push('/account/' + accountValue)
      if (!savedAccounts.includes(accountValue)) {
        addAccount(accountValue)
      }
    }
  }

  return (
    <AutoColumn gap={'1rem'}>
      {!small && (
        <>
          <AutoRow>
            <Wrapper>
              <Input
                placeholder="0x..."
                onChange={e => {
                  setAccountValue(e.target.value)
                }}
              />
            </Wrapper>
            <ButtonLight onClick={handleAccountSearch}>Load Account Details</ButtonLight>
          </AutoRow>
        </>
      )}


    </AutoColumn>
  )
}

export default AccountSearch
