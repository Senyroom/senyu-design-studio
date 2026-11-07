import type { NextConfig } from 'next';
import { config } from 'dotenv';
import path from 'node:path';
config({path:path.resolve(process.cwd(),'../../.env'),quiet:true});
const api=process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000';
const nextConfig:NextConfig={
  turbopack:{root:path.resolve(process.cwd(),'../..')},
  async rewrites(){return [{source:'/api/v1/:path*',destination:`${api}/api/v1/:path*`},{source:'/media/:path*',destination:`${api}/media/:path*`}];},
  poweredByHeader:false
};
export default nextConfig;
