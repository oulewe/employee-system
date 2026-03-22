/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... أي إعدادات موجودة
};

const withNextIntl = require('next-intl/plugin')();
module.exports = withNextIntl(nextConfig);