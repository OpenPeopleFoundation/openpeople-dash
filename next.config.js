/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/dash', permanent: false },
    ];
  },
};
module.exports = nextConfig;
