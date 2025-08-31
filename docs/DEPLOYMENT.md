# GTC Backend Deployment Guide

This guide covers various deployment scenarios for the GTC Backend, from development to production environments.

## 🏗️ Deployment Options

1. **Traditional Server Deployment** (VPS, Dedicated Server)
2. **Cloud Platform Deployment** (AWS, DigitalOcean, Heroku)
3. **Docker Deployment**
4. **Kubernetes Deployment**

---

## 🚀 Traditional Server Deployment

### Prerequisites
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+
- MongoDB 4.4+
- Nginx (recommended)
- SSL Certificate

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx
```

### Step 2: Application Setup

```bash
# Create application user
sudo useradd -m -s /bin/bash GTCapp
sudo usermod -aG sudo GTCapp

# Switch to application user
sudo su - GTCapp

# Clone repository
git clone <your-repo-url> GTC-backend
cd GTC-backend

# Install dependencies
npm ci --production

# Copy environment file
cp .env.example .env
```

### Step 3: Environment Configuration

Edit `.env` file:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/GTC-backend-prod
JWT_SECRET=your-super-secure-production-jwt-secret-change-this
SESSION_SECRET=your-super-secure-production-session-secret-change-this
BCRYPT_ROUNDS=12

# Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_DEFAULT_PASSWORD=YourSecureAdminPassword123!

# Blockchain Configuration
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
NETWORK=mainnet
CONTRACT_ADDRESS=0xYourContractAddress
PRIVATE_KEY=YourPrivateKeyForAdminTransactions

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CLAIM_RATE_LIMIT_WINDOW_MS=3600000
CLAIM_RATE_LIMIT_MAX_REQUESTS=5

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# SSL (if using HTTPS directly in Node.js)
SSL_KEY_PATH=/etc/ssl/private/yourdomain.key
SSL_CERT_PATH=/etc/ssl/certs/yourdomain.crt
```

### Step 4: Create Default Admin

```bash
node src/scripts/createDefaultAdmin.js
```

### Step 5: PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'GTC-backend',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

Start the application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 6: Nginx Configuration

Create `/etc/nginx/sites-available/GTC-backend`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy configuration
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Log files
    access_log /var/log/nginx/GTC-backend.access.log;
    error_log /var/log/nginx/GTC-backend.error.log;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/GTC-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## ☁️ Cloud Platform Deployment

### AWS Deployment

#### Using EC2

1. **Launch EC2 Instance**
   - Choose Ubuntu 20.04 LTS
   - Select appropriate instance type (t3.medium or larger)
   - Configure security groups (ports 22, 80, 443)

2. **RDS for MongoDB**
   - Use DocumentDB for MongoDB compatibility
   - Configure security groups for database access

3. **Application Deployment**
   Follow the traditional server deployment steps above.

#### Using Elastic Beanstalk

Create `Dockerrun.aws.json`:

```json
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "your-docker-registry/GTC-backend:latest",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "3000"
    }
  ],
  "Environment": [
    {
      "Name": "NODE_ENV",
      "Value": "production"
    }
  ]
}
```

### DigitalOcean Deployment

1. **Create Droplet**
   - Ubuntu 20.04
   - 2GB RAM minimum
   - Add your SSH key

2. **Managed Database**
   - Create MongoDB cluster
   - Configure firewall rules

3. **Load Balancer**
   - Configure SSL termination
   - Health checks on `/health`

### Heroku Deployment

Create `Procfile`:

```
web: node src/server.js
```

Configure buildpacks:

```bash
heroku buildpacks:set heroku/nodejs
```

Set environment variables:

```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
# ... other environment variables
```

Deploy:

```bash
git push heroku main
```

---

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy app source
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs .env.example ./.env

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "src/server.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/GTC-backend
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      - mongo
    restart: unless-stopped
    volumes:
      - ./logs:/usr/src/app/logs

  mongo:
    image: mongo:6.0
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: GTC-backend
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
```

Build and run:

```bash
docker-compose up -d
```

---

## ☸️ Kubernetes Deployment

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: GTC-backend
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: GTC-backend-config
  namespace: GTC-backend
data:
  NODE_ENV: "production"
  PORT: "3000"
  MONGODB_URI: "mongodb://mongo-service:27017/GTC-backend"
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: GTC-backend-secrets
  namespace: GTC-backend
type: Opaque
data:
  JWT_SECRET: <base64-encoded-jwt-secret>
  SESSION_SECRET: <base64-encoded-session-secret>
  PRIVATE_KEY: <base64-encoded-private-key>
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: GTC-backend
  namespace: GTC-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: GTC-backend
  template:
    metadata:
      labels:
        app: GTC-backend
    spec:
      containers:
      - name: GTC-backend
        image: your-registry/GTC-backend:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: GTC-backend-config
        - secretRef:
            name: GTC-backend-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: GTC-backend-service
  namespace: GTC-backend
spec:
  selector:
    app: GTC-backend
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: GTC-backend-ingress
  namespace: GTC-backend
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: GTC-backend-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: GTC-backend-service
            port:
              number: 80
```

---

## 🔧 Production Configuration

### Environment Variables

```env
# Required for production
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-production-db/GTC-backend
JWT_SECRET=your-super-secure-production-jwt-secret
SESSION_SECRET=your-super-secure-production-session-secret

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS - only allow your frontend domains
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Blockchain
NETWORK=mainnet
BSC_RPC_URL=https://bsc-dataseed.binance.org/
CONTRACT_ADDRESS=0xYourRealContractAddress
PRIVATE_KEY=YourRealPrivateKey

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# SSL (if handling SSL in Node.js)
SSL_KEY_PATH=/path/to/ssl/private.key
SSL_CERT_PATH=/path/to/ssl/certificate.crt
```

### Database Configuration

For production MongoDB:

```javascript
// Add to your MongoDB connection options
{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  bufferCommands: false,
  readPreference: 'primary',
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 1000
  }
}
```

---

## 📊 Monitoring & Logging

### Application Monitoring

Install monitoring tools:

```bash
npm install --save @sentry/node
npm install --save elastic-apm-node
```

Configure in your application:

```javascript
// Add to the top of src/server.js
if (process.env.NODE_ENV === 'production') {
  require('@sentry/node').init({
    dsn: process.env.SENTRY_DSN
  });
}
```

### Log Management

Configure log rotation:

```bash
sudo nano /etc/logrotate.d/GTC-backend
```

```
/home/GTCapp/GTC-backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 GTCapp GTCapp
    postrotate
        pm2 reload GTC-backend
    endscript
}
```

### Health Monitoring

Create monitoring script:

```bash
#!/bin/bash
# health-check.sh

URL="https://yourdomain.com/health"
EXPECTED_STATUS=200

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $STATUS -eq $EXPECTED_STATUS ]; then
    echo "$(date): Health check passed"
else
    echo "$(date): Health check failed with status $STATUS"
    # Send alert (email, slack, etc.)
fi
```

Add to crontab:

```bash
# Check every 5 minutes
*/5 * * * * /path/to/health-check.sh >> /var/log/health-check.log 2>&1
```

---

## 🔒 Security Checklist

### Pre-deployment
- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Configure proper CORS origins
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Enable 2FA for admin accounts
- [ ] Review and remove development dependencies
- [ ] Validate all environment variables
- [ ] Test all endpoints
- [ ] Run security audit (`npm audit`)

### Post-deployment
- [ ] Monitor logs for errors
- [ ] Test all functionality
- [ ] Verify SSL configuration
- [ ] Check rate limiting
- [ ] Test authentication flows
- [ ] Verify database connections
- [ ] Test backup procedures
- [ ] Set up monitoring alerts

---

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   
   # Check logs
   sudo tail -f /var/log/mongodb/mongod.log
   ```

2. **PM2 Process Issues**
   ```bash
   # Check PM2 status
   pm2 status
   
   # View logs
   pm2 logs GTC-backend
   
   # Restart application
   pm2 restart GTC-backend
   ```

3. **Nginx Issues**
   ```bash
   # Test configuration
   sudo nginx -t
   
   # Check logs
   sudo tail -f /var/log/nginx/error.log
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in /etc/ssl/certs/yourdomain.crt -text -noout
   
   # Test SSL
   openssl s_client -connect yourdomain.com:443
   ```

### Performance Optimization

1. **Enable compression in Nginx**
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_min_length 1024;
   gzip_types
     text/plain
     text/css
     application/json
     application/javascript
     text/xml
     application/xml
     application/xml+rss
     text/javascript;
   ```

2. **Database Indexing**
   ```javascript
   // Add indexes in MongoDB
   db.users.createIndex({ walletAddress: 1 })
   db.claimtransactions.createIndex({ user: 1, createdAt: -1 })
   db.claimtransactions.createIndex({ status: 1 })
   ```

3. **Node.js Optimization**
   ```javascript
   // Add to ecosystem.config.js
   node_args: [
     '--max-old-space-size=1024',
     '--optimize-for-size'
   ]
   ```

This deployment guide covers various scenarios from simple VPS deployment to complex Kubernetes clusters. Choose the deployment method that best fits your infrastructure requirements and team expertise.