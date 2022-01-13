module.exports = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true
      },
      {
        source: '/chain/Binance',
        destination: '/chain/BSC',
        permanent: true
      }
    ]
  },
  images: {
    domains: ['icons.llama.fi']
  }
}
