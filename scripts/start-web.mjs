import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(root, '.env'), quiet: true });
process.chdir(path.join(root, 'apps/web'));
// Run in the managed process itself so BaoTa can track and stop the actual server.
const require = createRequire(import.meta.url);
process.argv = [
  process.execPath,
  require.resolve('next/dist/bin/next'),
  'start',
  '--hostname',
  '127.0.0.1',
  '--port',
  process.env.WEB_PORT || '3100',
];
require('next/dist/bin/next');
