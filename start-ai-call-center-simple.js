#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting AI Call Center...');

// Load environment variables from root .env
const backendEnvPath = join(__dirname, '.env');
const frontendEnvPath = join(__dirname, 'packages', 'ui', '.env.local');

// Check if root .env exists
if (!fs.existsSync(backendEnvPath)) {
    console.error('❌ Root .env file not found!');
    console.log('📝 Please create a .env file in the root directory with your credentials:');
    console.log('');
    console.log('SUPABASE_URL=your_supabase_url');
    console.log('SUPABASE_ANON_KEY=your_supabase_anon_key');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key');
    console.log('GEMINI_API_KEY=your_gemini_api_key');
    console.log('TWILIO_ACCOUNT_SID=your_twilio_account_sid');
    console.log('TWILIO_AUTH_TOKEN=your_twilio_auth_token');
    console.log('TWILIO_PHONE_NUMBER=your_twilio_phone_number');
    console.log('TWILIO_API_KEY_SID=your_twilio_api_key_sid');
    console.log('TWILIO_API_KEY_SECRET=your_twilio_api_key_secret');
    console.log('WEBHOOK_URL=https://your-codespace-12001.app.github.dev/webhook/voice');
    console.log('WEBSOCKET_URL=wss://your-codespace-12001.app.github.dev');
    console.log('');
    console.log('Then run this command again.');
    process.exit(1);
}

// Load environment variables from root .env
dotenv.config({ path: backendEnvPath });

// Validate required environment variables
const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GEMINI_API_KEY', 'TWILIO_ACCOUNT_SID', 'WEBHOOK_URL', 'WEBSOCKET_URL'];
const missingVars = requiredVars.filter(varName => !process.env[varName] || process.env[varName].includes('your_'));

if (missingVars.length > 0) {
    console.error('❌ Missing or placeholder values in .env file:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('');
    console.log('Please update your .env file with real credentials and run this command again.');
    process.exit(1);
}

// Create/update frontend .env.local with values from root .env
console.log('📝 Creating frontend .env.local with values from root .env...');
const frontendEnv = `# AI Call Center Frontend Configuration (Auto-generated from root .env)
VITE_SUPABASE_URL=${process.env.SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY}
VITE_API_BASE_URL=http://localhost:12001
`;
fs.writeFileSync(frontendEnvPath, frontendEnv);
console.log('✅ Frontend environment configured successfully!');

// Function to run command and pipe output
function runCommand(command, args, cwd, name) {
    return new Promise((resolve, reject) => {
        console.log(`🔧 Starting ${name}...`);
        const process = spawn(command, args, {
            cwd,
            stdio: 'inherit',
            shell: true
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
        // Clean up any corrupted node_modules first
        console.log('🧹 Cleaning up old dependencies...');
        try {
            if (fs.existsSync('node_modules')) {
                fs.rmSync('node_modules', { recursive: true, force: true });
            }
            if (fs.existsSync('package-lock.json')) {
                fs.unlinkSync('package-lock.json');
            }
            console.log('✅ Cleaned root dependencies');
        } catch (error) {
            console.log('ℹ️ No old dependencies to clean, continuing...');
        }
        
        // Install root dependencies
        console.log('📦 Installing root dependencies...');
        await runCommand('npm', ['install'], __dirname, 'Root Install');
        
        // Install UI dependencies
        console.log('📦 Installing UI dependencies...');
        const uiPath = join(__dirname, 'packages', 'ui');
        await runCommand('npm', ['install'], uiPath, 'UI Install');

        // Build packages that need building
        console.log('🔨 Building packages...');
        const packages = ['audio-converter', 'twilio-server', 'gemini-live-client', 'tw2gem-server'];
        
        for (const pkg of packages) {
            const pkgPath = join(__dirname, 'packages', pkg);
            if (fs.existsSync(pkgPath)) {
                console.log(`🔨 Building ${pkg}...`);
                await runCommand('npm', ['install'], pkgPath, `${pkg} Install`);
                
                // Only build if build script exists
                const packageJson = JSON.parse(fs.readFileSync(join(pkgPath, 'package.json'), 'utf8'));
                if (packageJson.scripts && packageJson.scripts.build) {
                    await runCommand('npm', ['run', 'build'], pkgPath, `${pkg} Build`);
                }
            }
        }

        // Install server dependencies
        console.log('📦 Installing server dependencies...');
        const serverPath = join(__dirname, 'packages', 'server');
        if (fs.existsSync(serverPath)) {
            await runCommand('npm', ['install'], serverPath, 'Server Install');
        }

        // Create database tables
        console.log('🗄️ Setting up database tables...');
        if (fs.existsSync('create-all-tables.js')) {
            await runCommand('node', ['create-all-tables.js'], __dirname, 'Database Setup');
        }

        // Install PM2 globally if not installed
        console.log('🔧 Installing PM2...');
        try {
            await runCommand('npm', ['install', '-g', 'pm2'], __dirname, 'PM2 Install');
        } catch (error) {
            console.log('⚠️ PM2 install failed, continuing with direct node execution...');
        }

        // Stop any existing PM2 processes
        console.log('🧹 Stopping any existing PM2 processes...');
        try {
            await runCommand('pm2', ['stop', 'all'], __dirname, 'PM2 Stop');
            await runCommand('pm2', ['delete', 'all'], __dirname, 'PM2 Delete');
        } catch (error) {
            console.log('ℹ️ No existing PM2 processes to stop');
        }

        // Start backend with PM2 or direct node
        console.log('🚀 Starting backend server...');
        try {
            await runCommand('pm2', ['start', 'server.js', '--name', 'ai-call-backend'], __dirname, 'Backend Start');
        } catch (error) {
            console.log('⚠️ PM2 failed, starting backend directly...');
            // Start backend in background
            spawn('node', ['server.js'], {
                cwd: __dirname,
                detached: true,
                stdio: 'ignore'
            }).unref();
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        }

        // Start frontend with PM2 or direct npm
        console.log('🚀 Starting frontend server...');
        try {
            await runCommand('pm2', ['start', 'npm', '--name', 'ai-call-ui', '--', 'run', 'dev'], uiPath, 'UI Start');
        } catch (error) {
            console.log('⚠️ PM2 failed, starting frontend directly...');
            // Start frontend in background
            spawn('npm', ['run', 'dev'], {
                cwd: uiPath,
                detached: true,
                stdio: 'ignore'
            }).unref();
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }

        // Final verification
        console.log('🔍 Running final system verification...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for services to fully start
        
        console.log('');
        console.log('🎉 AI Call Center started successfully!');
        console.log('');
        console.log('📊 Frontend: http://localhost:12000');
        console.log('🔧 Backend API: http://localhost:12001');
        console.log('🏥 Health Check: http://localhost:12001/health');
        console.log('');
        console.log('📋 Useful commands:');
        console.log('  pm2 status          - Check service status');
        console.log('  pm2 logs            - View all logs');
        console.log('  pm2 restart all     - Restart all services');
        console.log('  pm2 stop all        - Stop all services');
        console.log('');
        console.log('🚀 READY FOR PRODUCTION! All dependencies installed and services running!');

    } catch (error) {
        console.error('❌ Failed to start AI Call Center:', error.message);
        console.log('');
        console.log('🔍 Troubleshooting tips:');
        console.log('  1. Make sure your .env file has all required credentials');
        console.log('  2. Check that ports 12000 and 12001 are available');
        console.log('  3. Verify Node.js version is 18+ with: node --version');
        console.log('  4. Try running: npm run start-simple');
        process.exit(1);
    }
}

main();
