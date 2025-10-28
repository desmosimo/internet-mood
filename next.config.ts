import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		// Usa i certificati TLS di sistema per evitare errori di download font
		turbopackUseSystemTlsCerts: true,
	},
};

export default nextConfig;
