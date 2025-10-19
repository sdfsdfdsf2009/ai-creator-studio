const createNextIntlPlugin = require('next-intl/plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@radix-ui/react-icons'],
  // GitHub Pages 配置 - 国内环境优化
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: [
      'avatars.githubusercontent.com',
      'raw.githubusercontent.com',
      'img.shields.io'
    ]
  },
  // 基础路径配置
  basePath: '/ai-creator-studio',
  assetPrefix: '/ai-creator-studio/',
  // 环境变量配置
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // 处理CORS - 国内访问优化
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS, PATCH, DELETE, POST, PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ];
  },
};

module.exports = createNextIntlPlugin('./i18n.ts')(nextConfig);