import fs from 'fs';
import { spawn } from 'child_process';

const env = { ...process.env, NODE_ENV: 'production' };
const proc = spawn('pnpm', ['run', 'build'], { env, stdio: 'inherit' });

proc.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});
