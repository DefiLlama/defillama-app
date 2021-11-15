import { isValidProtocol } from './index'

describe('utils/index', () => {
  describe('isValidProtocol', () => {
    const tokensObject = {
      uniswap: { name: 'uniswap' },
      'defi-protocol': { name: 'defi-protocol' },
      'alpha-finance': { name: 'alpha-finance' }
    }

    it('returns true if protocol exactly matches a name in tokens dictionary', () => {
      expect(isValidProtocol(tokensObject, 'uniswap')).toBe(true)
      expect(isValidProtocol(tokensObject, 'defi-protocol')).toBe(true)
    })

    it('returns false if protocol doesnt exactly match a name in tokens dictionary', () => {
      expect(isValidProtocol(tokensObject, 'defiprotocol')).toBe(false)
      expect(isValidProtocol(tokensObject, 'uni-swap')).toBe(false)
      expect(isValidProtocol(tokensObject, 'llama')).toBe(false)
    })
  })
})
