module.exports = {
  async redirects() {
    return [
      {
        source: '/chain/Binance',
        destination: '/chain/BSC',
        permanent: true
      },
      {
        source: '/home',
        destination: '/',
        permanent: true
      }
    ]
  },
  images: {
    domains: ['icons.llama.fi']
  }
}
