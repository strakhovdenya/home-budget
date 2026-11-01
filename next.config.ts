import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Repository instructions are maintained by the owner.
  agentRules: false,
};

export default createNextIntlPlugin('./src/shared/i18n/request.ts')(nextConfig);
