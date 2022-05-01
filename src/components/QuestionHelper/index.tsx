import Tooltip from 'components/Tooltip'
import React from 'react'
import { HelpCircle as Question } from 'react-feather'
import styled from 'styled-components'

const QuestionWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border: none;
  background: none;
  outline: none;
  cursor: default;
  border-radius: 36px;
  background-color: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text2};

  :hover,
  :focus {
    opacity: 0.7;
  }
`

export default function QuestionHelper({ text, disabled }: { text: string; disabled?: boolean }) {
  return (
    <Tooltip content={disabled ? null : text}>
      <QuestionWrapper>
        <Question size={16} />
      </QuestionWrapper>
    </Tooltip>
  )
}
