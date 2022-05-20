import React from 'react'
import styled from 'styled-components'
import { CheckCircle, Copy } from 'react-feather'
import { useCopyToClipboard } from 'react-use'
import { StyledIcon } from '..'

const CopyIcon = styled.div`
  color: #aeaeae;
  flex-shrink: 0;
  margin-right: 1rem;
  margin-left: 0.5rem;
  text-decoration: none;
  :hover,
  :active,
  :focus {
    text-decoration: none;
    opacity: 0.8;
    cursor: pointer;
  }
`
const TransactionStatusText = styled.span`
  margin-left: 0.25rem;
  ${({ theme }) => theme.flexRowNoWrap};
  align-items: center;
  color: black;
`

export default function CopyHelper({ toCopy }) {
  const [{ value }, setCopied] = useCopyToClipboard()

  return (
    <CopyIcon onClick={() => setCopied(toCopy)}>
      {value ? (
        <TransactionStatusText>
          <StyledIcon>
            <CheckCircle size={'14'} />
          </StyledIcon>
        </TransactionStatusText>
      ) : (
        <TransactionStatusText>
          <StyledIcon>
            <Copy size={'14'} />
          </StyledIcon>
        </TransactionStatusText>
      )}
    </CopyIcon>
  )
}
