/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

// Only load Cloudflare dev platform when both env vars are set AND wrangler is available
if (process.env.NODE_ENV === 'development') {
  try {
    const { setupDevPlatform } = await import('@cloudflare/next-on-pages/next-dev');
    await setupDevPlatform();
  } catch {
    console.log('[config] Wrangler/Cloudflare not available, skipping dev platform setup');
  }
}

export default nextConfig;
