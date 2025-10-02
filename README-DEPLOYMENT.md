# GCT Token Platform - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 6+
- Git
- PM2 (for production): `npm install -g pm2`

### One-Command Deployment
```bash
# Development
npm run deploy:dev

# Staging  
npm run deploy:staging

# Production
npm run deploy:prod
```

## 📋 Manual Deployment Steps

### 1. Clone and Setup
```bash
git clone <repository-url>
cd GCT-TOKEN
npm install
```

### 2. Environment Configuration
The deployment script automatically creates a `.env` file. Update it with your specific values:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/GTC-backend

# Security (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-super-secret-session-key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Blockchain
CONTRACT_ADDRESS=0x...
BSC_RPC_URL=https://bsc-dataseed.binance.org/
```

### 3. Start the Application
```bash
# Development
npm run dev

# Production
npm start
# OR with PM2
npm run pm2:start
```

### 4. Verify Deployment
```bash
# Health check
npm run health

# Check logs
npm run pm2:logs
```

## 🐳 Docker Deployment

### Build and Run
```bash
# Build image
npm run docker:build

# Run with docker-compose
npm run docker:run

# Stop
npm run docker:stop
```

### Docker Compose Services
- **gct-backend**: Main application
- **mongo**: MongoDB database
- **nginx**: Reverse proxy (optional)

## 🔧 Production Configuration

### 1. Security Checklist
- [ ] Change default JWT and session secrets
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up proper CORS origins
- [ ] Configure rate limiting
- [ ] Enable helmet security headers
- [ ] Set up firewall rules

### 2. Database Setup
```bash
# Create production database
mongo
use GTC-backend-prod
db.createUser({
  user: "gctuser",
  pwd: "securepassword",
  roles: ["readWrite"]
})
```

### 3. Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
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
    }
}
```

### 4. SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring and Logging

### PM2 Monitoring
```bash
# View status
pm2 status

# View logs
pm2 logs gct-backend

# Monitor resources
pm2 monit

# Restart application
pm2 restart gct-backend
```

### Log Files
- Application logs: `./logs/`
- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`

### Health Monitoring
```bash
# Health check endpoint
curl http://localhost:3000/health

# Automated health check
./health-check.sh
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy GCT Token Platform

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to production
        run: npm run deploy:prod
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check connection
mongo --eval "db.adminCommand('ismaster')"
```

#### 2. Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

#### 3. Permission Denied
```bash
# Fix file permissions
chmod +x start.sh health-check.sh

# Fix upload directory permissions
chmod 755 uploads/
```

#### 4. PM2 Issues
```bash
# Reset PM2
pm2 kill
pm2 start ecosystem.config.js

# Clear PM2 logs
pm2 flush
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm start

# Or set in .env
DEBUG=gct:*
```

## 📈 Performance Optimization

### 1. Database Optimization
- Enable MongoDB indexing
- Use connection pooling
- Implement query optimization
- Set up database monitoring

### 2. Application Optimization
- Enable gzip compression
- Implement caching strategies
- Use CDN for static assets
- Optimize image uploads

### 3. Server Optimization
- Configure PM2 cluster mode
- Set up load balancing
- Implement Redis caching
- Use nginx for static file serving

## 🔐 Security Best Practices

### 1. Environment Security
- Use environment variables for secrets
- Never commit .env files
- Use different secrets for each environment
- Regularly rotate secrets

### 2. Application Security
- Enable CORS properly
- Implement rate limiting
- Use helmet for security headers
- Validate all inputs
- Implement proper error handling

### 3. Infrastructure Security
- Use HTTPS everywhere
- Configure firewall rules
- Regular security updates
- Monitor for vulnerabilities
- Implement backup strategies

## 📞 Support

### Getting Help
1. Check the logs: `npm run pm2:logs`
2. Run health check: `npm run health`
3. Check this documentation
4. Review GitHub issues
5. Contact the development team

### Useful Commands
```bash
# View application status
pm2 status

# View real-time logs
pm2 logs gct-backend --lines 100

# Restart application
pm2 restart gct-backend

# View system resources
pm2 monit

# Check health
curl -f http://localhost:3000/health
```

## 🎯 Next Steps After Deployment

1. **Configure Domain**: Point your domain to the server
2. **Set up SSL**: Configure HTTPS certificates
3. **Monitor Performance**: Set up monitoring and alerting
4. **Backup Strategy**: Implement database and file backups
5. **Security Audit**: Perform security assessment
6. **Load Testing**: Test under load conditions
7. **Documentation**: Update team documentation

---

**Happy Deploying! 🚀**

For more detailed information, check the individual component documentation in the `docs/` directory.