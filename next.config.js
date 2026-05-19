/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  allowedDevOrigins: ['169.254.15.210'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'openweathermap.org',
        pathname: '/img/w/**',
      },
    ],
  },
  
  // Добавляем пустую конфигурацию Turbopack для совместимости
  turbopack: {},
};

module.exports = nextConfig;