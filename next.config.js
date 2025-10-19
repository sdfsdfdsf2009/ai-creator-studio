const createNextIntlPlugin = require('next-intl/plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@radix-ui/react-icons'],
};

module.exports = createNextIntlPlugin('./i18n.ts')(nextConfig);