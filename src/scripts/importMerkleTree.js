/**
 * Script to import merkle tree from CSV or JSON file
 * Usage: node src/scripts/importMerkleTree.js <file_path> <name> <description> <admin_email>
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const merkleService = require('../services/merkleService');
const logger = require('../utils/logger');

async function importMerkleTree(filePath, name, description, adminEmail) {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/GTC-backend', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Find admin
    const admin = await Admin.findOne({ email: adminEmail.toLowerCase() });
    if (!admin) {
      throw new Error(`Admin with email ${adminEmail} not found`);
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const fileExtension = path.extname(filePath).toLowerCase();
    
    let allocations = [];
    
    if (fileExtension === '.csv') {
      // Parse CSV
      allocations = merkleService.parseCsvAllocations(fileContent);
      console.log(`Parsed ${allocations.length} allocations from CSV`);
      
    } else if (fileExtension === '.json') {
      // Parse JSON
      const jsonData = JSON.parse(fileContent);
      
      if (Array.isArray(jsonData)) {
        allocations = jsonData;
      } else if (jsonData.allocations && Array.isArray(jsonData.allocations)) {
        allocations = jsonData.allocations;
      } else {
        throw new Error('Invalid JSON format. Expected array or object with "allocations" property');
      }
      
      console.log(`Parsed ${allocations.length} allocations from JSON`);
      
    } else {
      throw new Error('Unsupported file format. Use .csv or .json files');
    }
    
    // Validate allocations
    if (allocations.length === 0) {
      throw new Error('No valid allocations found in file');
    }
    
    // Create merkle tree
    console.log('Creating merkle tree...');
    const merkleTree = await merkleService.createMerkleTree(allocations, name, description, admin._id);
    
    console.log('✅ Merkle tree created successfully!');
    console.log('ID:', merkleTree._id);
    console.log('Name:', merkleTree.name);
    console.log('Total Users:', merkleTree.totalUsers);
    console.log('Total Amount:', merkleTree.formattedTotalAmount, 'tokens');
    console.log('Root:', merkleTree.root);
    console.log('');
    console.log('To activate this merkle tree, use the admin panel or call:');
    console.log(`PATCH /api/v1/admin/merkle-trees/${merkleTree._id}/activate`);
    
  } catch (error) {
    console.error('❌ Error importing merkle tree:', error.message);
    logger.error('Import merkle tree script error', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('Usage: node src/scripts/importMerkleTree.js <file_path> <name> <description> <admin_email>');
    console.log('');
    console.log('Examples:');
    console.log('  node src/scripts/importMerkleTree.js allocations.csv "Phase 1 Distribution" "Initial token distribution" admin@GTC-token.com');
    console.log('  node src/scripts/importMerkleTree.js allocations.json "Presale Distribution" "Presale participants" admin@GTC-token.com');
    console.log('');
    console.log('CSV format: walletAddress,amount');
    console.log('JSON format: [{"walletAddress": "0x...", "amount": "1000000000000000000"}]');
    process.exit(1);
  }
  
  const [filePath, name, description, adminEmail] = args;
  importMerkleTree(filePath, name, description, adminEmail);
}

module.exports = importMerkleTree;