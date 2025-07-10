#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 AI Call Center - Minimal Start (Zero Build Required)');

// Load environment variables from root .env
const envPath = join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    console.log('📝 Create a .env file with:');
    console.log('SUPABASE_URL=your_url');
    console.log('SUPABASE_ANON_KEY=your_key');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_key');
    console.log('GEMINI_API_KEY=your_gemini_key');
    console.log('GOOGLE_SHEET_ID=your_google_sheet_id');
    console.log('TWILIO_ACCOUNT_SID=your_sid');
    console.log('TWILIO_AUTH_TOKEN=your_token');
    console.log('TWILIO_PHONE_NUMBER=your_phone');
    console.log('WEBHOOK_URL=https://your-codespace-12001.app.github.dev/webhook/voice');
    console.log('WEBSOCKET_URL=wss://your-codespace-12001.app.github.dev');
    process.exit(1);
}

dotenv.config({ path: envPath });

// Check for Google Sheets credentials file
const credentialsPath = join(__dirname, 'credentials.json');
if (!fs.existsSync(credentialsPath)) {
    console.warn('⚠️  credentials.json not found - Google Sheets integration will be disabled');
    console.log('📝 To enable Google Sheets logging, add your service account credentials.json file');
} else {
    console.log('✅ Google Sheets credentials found');
}

// Validate critical vars only
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'];
const missing = required.filter(v => !process.env[v] || process.env[v].includes('your_'));

if (missing.length > 0) {
    console.error('❌ Missing credentials:', missing.join(', '));
    process.exit(1);
}

// Create comprehensive UI env file with ALL necessary variables
const uiEnvPath = join(__dirname, 'packages', 'ui', '.env.local');
const uiEnv = `# Supabase Configuration (ALL keys for complete functionality)
VITE_SUPABASE_URL=${process.env.SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY}
VITE_SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY}

# Google Sheets Configuration
VITE_GOOGLE_SHEET_ID=${process.env.GOOGLE_SHEET_ID || ''}

# API Configuration
VITE_API_BASE_URL=http://localhost:12001

# Twilio Configuration (for UI components that need it)
VITE_TWILIO_ACCOUNT_SID=${process.env.TWILIO_ACCOUNT_SID || ''}
VITE_TWILIO_PHONE_NUMBER=${process.env.TWILIO_PHONE_NUMBER || ''}

# Webhook URLs (for UI to display)
VITE_WEBHOOK_URL=${process.env.WEBHOOK_URL || ''}
VITE_WEBSOCKET_URL=${process.env.WEBSOCKET_URL || ''}

# Development flags
VITE_NODE_ENV=${process.env.NODE_ENV || 'development'}
`;

console.log('📝 Creating comprehensive UI environment file with ALL variables...');
fs.writeFileSync(uiEnvPath, uiEnv);

async function runCmd(cmd, args, cwd = __dirname) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { 
            cwd, 
            stdio: 'inherit', 
            shell: true 
        });
        child.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} failed`)));
        child.on('error', reject);
    });
}

// Check if PM2 is available
async function checkPM2() {
    try {
        await runCmd('pm2', ['--version']);
        return true;
    } catch (e) {
        return false;
    }
}

async function start() {
    try {
        // Install all required dependencies including Google Sheets integration
        console.log('📦 Installing dependencies for Google Sheets integration...');
        await runCmd('npm', ['install', '--production']);
        
        // Ensure Google Sheets and Gemini AI dependencies are available
        console.log('🔗 Verifying Google Sheets API dependencies...');
        const requiredPackages = ['googleapis', '@google/generative-ai'];
        for (const pkg of requiredPackages) {
            try {
                await runCmd('npm', ['list', pkg]);
                console.log(`✅ ${pkg} is available`);
            } catch (e) {
                console.log(`📦 Installing missing dependency: ${pkg}`);
                await runCmd('npm', ['install', pkg]);
            }
        }

        // Ensure UI has all required Babel dependencies
        console.log('🔗 Verifying UI Babel dependencies...');
        const uiPath = join(__dirname, 'packages', 'ui');
        const uiBabelPackages = ['@babel/core', '@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'];
        for (const pkg of uiBabelPackages) {
            try {
                await runCmd('npm', ['list', pkg], uiPath);
                console.log(`✅ UI ${pkg} is available`);
            } catch (e) {
                console.log(`📦 Installing missing UI dependency: ${pkg}`);
                await runCmd('npm', ['install', '--save-dev', pkg], uiPath);
            }
        }

        // Skip database setup - tables already exist
        console.log('🗄️ Database ready (using existing tables)');

        // Kill any existing processes on our ports
        console.log('🧹 Clearing ports...');
        try {
            await runCmd('pkill', ['-f', 'node.*server.js']);
            await runCmd('pkill', ['-f', 'vite']);
        } catch (e) { /* ignore */ }

        console.log('🚀 Starting servers...');
        
        // Check if PM2 is available for better process management
        const hasPM2 = await checkPM2();
        
        if (hasPM2) {
            console.log('📦 Using PM2 for process management...');
            
            // Stop any existing PM2 processes
            try {
                await runCmd('pm2', ['stop', 'ai-call-backend', 'ai-call-ui']);
                await runCmd('pm2', ['delete', 'ai-call-backend', 'ai-call-ui']);
            } catch (e) { /* ignore */ }
            
            // Start backend with PM2
            spawn('pm2', ['start', 'server.js', '--name', 'ai-call-backend'], {
                cwd: __dirname,
                stdio: 'ignore',
                detached: true
            }).unref();

            // Start UI with PM2
            const uiPath = join(__dirname, 'packages', 'ui');
            spawn('bash', ['-c', 'npm install && pm2 start npm --name ai-call-ui -- run dev'], {
                cwd: uiPath,
                stdio: 'ignore',
                detached: true
            }).unref();
            
        } else {
            console.log('📦 Using direct process spawning...');
            
            // Start backend (non-blocking)
            spawn('node', ['server.js'], {
                cwd: __dirname,
                stdio: 'ignore',
                detached: true
            }).unref();

            // Install UI deps and start (non-blocking)
            const uiPath = join(__dirname, 'packages', 'ui');
            spawn('bash', ['-c', 'npm install && npm run dev'], {
                cwd: uiPath,
                stdio: 'ignore',
                detached: true
            }).unref();
        }

        // Wait for services to start
        console.log('⏳ Waiting for services...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        console.log('');
        console.log('🎉 READY!');
        console.log('📊 Frontend: http://localhost:12000');
        console.log('🔧 Backend: http://localhost:12001');
        console.log('🏥 Health: http://localhost:12001/health');
        console.log('');
        if (hasPM2) {
            console.log('💡 Process management:');
            console.log('   pm2 status               - Check process status');
            console.log('   pm2 logs ai-call-backend - View backend logs');
            console.log('   pm2 logs ai-call-ui      - View frontend logs');
            console.log('   pm2 restart all          - Restart all processes');
            console.log('   pm2 stop all && pm2 delete all - Stop everything');
        } else {
            console.log('💡 To stop: pkill -f "node.*server" && pkill -f vite');
            console.log('💡 Install PM2 for better process management: npm install -g pm2');
        }
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('🔄 Try: rm -rf node_modules && npm install');
        process.exit(1);
    }
}

start();
