#!/usr/bin/env node

/**
 * GCT Token Deployment Script
 * Automated deployment script for the GCT Token platform
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  environments: {
    development: {
      name: 'Development',
      port: 3000,
      nodeEnv: 'development',
      mongodbUri: 'mongodb://localhost:27017/GTC-backend-dev'
    },
    staging: {
      name: 'Staging',
      port: 3001,
      nodeEnv: 'staging',
      mongodbUri: process.env.STAGING_MONGODB_URI || 'mongodb://localhost:27017/GTC-backend-staging'
    },
    production: {
      name: 'Production',
      port: process.env.PORT || 3000,
      nodeEnv: 'production',
      mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/GTC-backend'
    }
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Logging functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`)
};

// Get environment from command line arguments
const environment = process.argv[2] || 'development';

if (!config.environments[environment]) {
  log.error(`Invalid environment: ${environment}`);
  log.info('Available environments: development, staging, production');
  process.exit(1);
}

const envConfig = config.environments[environment];

log.info(`Starting deployment to ${envConfig.name} environment...`);

// Check if required files exist
const requiredFiles = [
  'package.json',
  'src/server.js',
  'public/index.html'
];

log.step('Checking required files...');
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    log.error(`Required file not found: ${file}`);
    process.exit(1);
  }
}
log.success('All required files found');

// Create .env file for the environment
log.step('Creating environment configuration...');
const envContent = `# GCT Token ${envConfig.name} Environment Configuration
NODE_ENV=${envConfig.nodeEnv}
PORT=${envConfig.port}
MONGODB_URI=${envConfig.mongodbUri}

# JWT Configuration
JWT_SECRET=${process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'}
SESSION_SECRET=${process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production'}

# CORS Configuration
ALLOWED_ORIGINS=${process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000'}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=${process.env.RATE_LIMIT_WINDOW_MS || '900000'}
RATE_LIMIT_MAX_REQUESTS=${process.env.RATE_LIMIT_MAX_REQUESTS || '100'}

# Email Configuration (if using email features)
EMAIL_HOST=${process.env.EMAIL_HOST || ''}
EMAIL_PORT=${process.env.EMAIL_PORT || '587'}
EMAIL_USER=${process.env.EMAIL_USER || ''}
EMAIL_PASS=${process.env.EMAIL_PASS || ''}

# Blockchain Configuration
CONTRACT_ADDRESS=${process.env.CONTRACT_ADDRESS || ''}
BSC_RPC_URL=${process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/'}
BSC_TESTNET_RPC_URL=${process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/'}

# File Upload Configuration
MAX_FILE_SIZE=${process.env.MAX_FILE_SIZE || '10485760'}
UPLOAD_PATH=${process.env.UPLOAD_PATH || './uploads'}

# Cache Configuration
CACHE_TTL=${process.env.CACHE_TTL || '300'}
CACHE_MAX_SIZE=${process.env.CACHE_MAX_SIZE || '100'}

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=${process.env.WS_HEARTBEAT_INTERVAL || '30000'}
WS_CONNECTION_TIMEOUT=${process.env.WS_CONNECTION_TIMEOUT || '60000'}
`;

fs.writeFileSync('.env', envContent);
log.success('Environment configuration created');

// Install dependencies
log.step('Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  log.success('Dependencies installed');
} catch (error) {
  log.error('Failed to install dependencies');
  process.exit(1);
}

// Create necessary directories
log.step('Creating necessary directories...');
const directories = [
  'uploads',
  'uploads/profiles',
  'uploads/documents',
  'uploads/merkle',
  'uploads/temp',
  'uploads/blog',
  'logs'
];

for (const dir of directories) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log.info(`Created directory: ${dir}`);
  }
}
log.success('Directories created');

// Run database migrations (if any)
log.step('Running database setup...');
try {
  // Check if MongoDB is accessible
  execSync('node -e "require(\'mongoose\').connect(process.env.MONGODB_URI).then(() => { console.log(\'MongoDB connected\'); process.exit(0); }).catch(err => { console.error(\'MongoDB connection failed:\', err.message); process.exit(1); });"', { stdio: 'inherit' });
  log.success('Database connection verified');
} catch (error) {
  log.warning('Database connection failed - make sure MongoDB is running');
}

// Run tests (if in production)
if (environment === 'production') {
  log.step('Running tests...');
  try {
    execSync('npm test', { stdio: 'inherit' });
    log.success('All tests passed');
  } catch (error) {
    log.warning('Some tests failed - continuing with deployment');
  }
}

// Create PM2 ecosystem file for production
if (environment === 'production') {
  log.step('Creating PM2 ecosystem file...');
  const pm2Config = {
    apps: [{
      name: 'gct-backend',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: envConfig.port
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    }]
  };
  
  fs.writeFileSync('ecosystem.config.js', `module.exports = ${JSON.stringify(pm2Config, null, 2)};`);
  log.success('PM2 ecosystem file created');
}

// Create startup script
log.step('Creating startup script...');
const startupScript = `#!/bin/bash
# GCT Token ${envConfig.name} Startup Script

echo "Starting GCT Token ${envConfig.name} environment..."

# Load environment variables
export NODE_ENV=${envConfig.nodeEnv}
export PORT=${envConfig.port}

# Start the application
if [ "${environment}" = "production" ]; then
  echo "Starting with PM2..."
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup
else
  echo "Starting with Node.js..."
  node src/server.js
fi
`;

fs.writeFileSync('start.sh', startupScript);
fs.chmodSync('start.sh', '755');
log.success('Startup script created');

// Create health check script
log.step('Creating health check script...');
const healthCheckScript = `#!/bin/bash
# GCT Token Health Check Script

HEALTH_URL="http://localhost:${envConfig.port}/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
  echo "✓ GCT Token is healthy (HTTP $RESPONSE)"
  exit 0
else
  echo "✗ GCT Token is unhealthy (HTTP $RESPONSE)"
  exit 1
fi
`;

fs.writeFileSync('health-check.sh', healthCheckScript);
fs.chmodSync('health-check.sh', '755');
log.success('Health check script created');

// Create Docker configuration (optional)
log.step('Creating Docker configuration...');
const dockerfile = `# GCT Token Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/profiles uploads/documents uploads/merkle uploads/temp uploads/blog logs

# Expose port
EXPOSE ${envConfig.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${envConfig.port}/health || exit 1

# Start the application
CMD ["node", "src/server.js"]
`;

fs.writeFileSync('Dockerfile', dockerfile);

const dockerCompose = `version: '3.8'

services:
  gct-backend:
    build: .
    ports:
      - "${envConfig.port}:${envConfig.port}"
    environment:
      - NODE_ENV=${envConfig.nodeEnv}
      - PORT=${envConfig.port}
      - MONGODB_URI=mongodb://mongo:27017/GTC-backend
    depends_on:
      - mongo
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
`;

fs.writeFileSync('docker-compose.yml', dockerCompose);
log.success('Docker configuration created');

// Create deployment documentation
log.step('Creating deployment documentation...');
const deploymentDoc = `# GCT Token Deployment Guide

## Environment: ${envConfig.name}

### Prerequisites
- Node.js 18+ installed
- MongoDB running
- PM2 installed (for production): \`npm install -g pm2\`

### Quick Start
1. Run the deployment script: \`node deploy.js ${environment}\`
2. Start the application: \`./start.sh\`
3. Check health: \`./health-check.sh\`

### Manual Setup
1. Install dependencies: \`npm install\`
2. Set environment variables in .env file
3. Start MongoDB
4. Run the application: \`node src/server.js\`

### Production Deployment
1. Use PM2: \`pm2 start ecosystem.config.js\`
2. Save PM2 configuration: \`pm2 save\`
3. Setup PM2 startup: \`pm2 startup\`

### Docker Deployment
1. Build image: \`docker build -t gct-backend .\`
2. Run with docker-compose: \`docker-compose up -d\`

### Health Check
- Endpoint: http://localhost:${envConfig.port}/health
- Script: \`./health-check.sh\`

### Logs
- Application logs: ./logs/
- PM2 logs: \`pm2 logs\`

### Configuration
- Environment file: .env
- PM2 config: ecosystem.config.js
- Docker config: docker-compose.yml

### Troubleshooting
1. Check MongoDB connection
2. Verify environment variables
3. Check port availability
4. Review application logs
`;

fs.writeFileSync('DEPLOYMENT.md', deploymentDoc);
log.success('Deployment documentation created');

// Final summary
log.success(`Deployment to ${envConfig.name} environment completed!`);
log.info('Next steps:');
log.step('1. Review the .env file and update configuration as needed');
log.step('2. Start MongoDB if not already running');
log.step('3. Run ./start.sh to start the application');
log.step('4. Run ./health-check.sh to verify the application is running');
log.step('5. Check DEPLOYMENT.md for detailed instructions');

if (environment === 'production') {
  log.warning('Production deployment notes:');
  log.step('- Update JWT_SECRET and SESSION_SECRET in .env');
  log.step('- Configure proper MongoDB URI');
  log.step('- Set up SSL/TLS certificates');
  log.step('- Configure reverse proxy (nginx)');
  log.step('- Set up monitoring and logging');
}