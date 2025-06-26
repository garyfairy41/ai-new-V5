#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting AI Call Center...');

// Check if .env files exist, if not create them with placeholders
const backendEnvPath = join(__dirname, '.env');
const frontendEnvPath = join(__dirname, 'packages', 'ui', '.env.local');

if (!fs.existsSync(backendEnvPath)) {
    console.log('📝 Creating backend .env file...');
    const backendEnv = `# AI Call Center Backend Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
GEMINI_API_KEY=your_gemini_api_key_here
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
TWILIO_API_KEY_SID=your_twilio_api_key_sid_here
TWILIO_API_KEY_SECRET=your_twilio_api_key_secret_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
PORT=12001
`;
    fs.writeFileSync(backendEnvPath, backendEnv);
}

if (!fs.existsSync(frontendEnvPath)) {
    console.log('📝 Creating frontend .env.local file...');
    const frontendEnv = `# AI Call Center Frontend Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_API_BASE_URL=http://localhost:12001
`;
    fs.writeFileSync(frontendEnvPath, frontendEnv);
}

// Function to run command and pipe output
function runCommand(command, args, cwd, name) {
    return new Promise((resolve, reject) => {
        console.log(`🔧 Starting ${name}...`);
        const process = spawn(command, args, {
            cwd,
            stdio: 'pipe',
            shell: true
        });

        process.stdout.on('data', (data) => {
            console.log(`[${name}] ${data.toString().trim()}`);
        });

        process.stderr.on('data', (data) => {
            console.error(`[${name}] ${data.toString().trim()}`);
        });

        process.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${name} completed successfully`);
                resolve();
            } else {
                console.error(`❌ ${name} failed with code ${code}`);
                reject(new Error(`${name} failed`));
            }
        });

        process.on('error', (error) => {
            console.error(`❌ ${name} error:`, error);
            reject(error);
        });
    });
}

async function main() {
    try {
        // Install root dependencies
        console.log('📦 Installing root dependencies...');
        await runCommand('npm', ['install'], __dirname, 'Root Install');
        
        // Install UI dependencies
        console.log('📦 Installing UI dependencies...');
        await runCommand('npm', ['install'], join(__dirname, 'packages', 'ui'), 'UI Install');

        // Build packages
        console.log('🔨 Building packages...');
        const packages = ['audio-converter', 'twilio-server', 'gemini-live-client', 'tw2gem-server'];
        
        for (const pkg of packages) {
            const pkgPath = join(__dirname, 'packages', pkg);
            if (fs.existsSync(pkgPath)) {
                console.log(`🔨 Building ${pkg}...`);
                await runCommand('npm', ['install'], pkgPath, `${pkg} Install`);
                await runCommand('npm', ['run', 'build'], pkgPath, `${pkg} Build`);
            }
        }

        // Install server dependencies
        console.log('📦 Installing server dependencies...');
        await runCommand('npm', ['install'], join(__dirname, 'packages', 'server'), 'Server Install');

        // Create database tables
        console.log('🗄️ Setting up database tables...');
        await runCommand('node', ['create-all-tables.js'], __dirname, 'Database Setup');

        // Install PM2 globally if not installed
        console.log('🔧 Installing PM2...');
        await runCommand('npm', ['install', '-g', 'pm2'], __dirname, 'PM2 Install');

        // Start backend with PM2
        console.log('🚀 Starting backend server...');
        await runCommand('pm2', ['start', 'server.js', '--name', 'ai-call-backend', '--watch'], __dirname, 'Backend Start');

        // Start frontend with PM2
        console.log('🚀 Starting frontend server...');
        await runCommand('pm2', ['start', 'npm', '--name', 'ai-call-ui', '--', 'run', 'dev'], join(__dirname, 'packages', 'ui'), 'UI Start');

        console.log('');
        console.log('🎉 AI Call Center started successfully!');
        console.log('');
        console.log('📊 Frontend: http://localhost:3000');
        console.log('🔧 Backend API: http://localhost:12001');
        console.log('🏥 Health Check: http://localhost:12001/health');
        console.log('');
        console.log('📋 Useful commands:');
        console.log('  pm2 status          - Check service status');
        console.log('  pm2 logs            - View all logs');
        console.log('  pm2 logs backend    - View backend logs');
        console.log('  pm2 logs frontend   - View frontend logs');
        console.log('  pm2 restart all     - Restart all services');
        console.log('  pm2 stop all        - Stop all services');
        console.log('');
        console.log('⚠️  Make sure to update your .env files with actual credentials!');

    } catch (error) {
        console.error('❌ Failed to start AI Call Center:', error.message);
        process.exit(1);
    }
}

main();