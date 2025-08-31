const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const MerkleTreeModel = require('../models/MerkleTree');
const User = require('../models/User');
const logger = require('../utils/logger');

class MerkleService {
  constructor() {
    this.activeMerkleTree = null;
    this.loadActiveMerkleTree();
  }
  
  async loadActiveMerkleTree() {
    try {
      this.activeMerkleTree = await MerkleTreeModel.getActiveTree();
      if (this.activeMerkleTree) {
        logger.info('Active merkle tree loaded', {
          id: this.activeMerkleTree._id,
          name: this.activeMerkleTree.name,
          totalUsers: this.activeMerkleTree.totalUsers
        });
      }
    } catch (error) {
      logger.error('Failed to load active merkle tree', error);
    }
  }
  
  /**
   * Create a merkle tree from allocation data
   * @param {Array} allocations - Array of {walletAddress, amount}
   * @param {string} name - Name for the merkle tree
   * @param {string} description - Description for the merkle tree
   * @param {string} adminId - Admin ID creating the tree
   */
  async createMerkleTree(allocations, name, description, adminId) {
    try {
      // Validate input
      if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
        throw new Error('Invalid allocations data');
      }
      
      // Normalize and validate allocations
      const normalizedAllocations = allocations.map((allocation, index) => {
        if (!allocation.walletAddress || !allocation.amount) {
          throw new Error(`Invalid allocation at index ${index}: missing walletAddress or amount`);
        }
        
        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(allocation.walletAddress)) {
          throw new Error(`Invalid wallet address format at index ${index}: ${allocation.walletAddress}`);
        }
        
        // Validate amount
        try {
          BigInt(allocation.amount);
        } catch (error) {
          throw new Error(`Invalid amount format at index ${index}: ${allocation.amount}`);
        }
        
        return {
          walletAddress: allocation.walletAddress.toLowerCase(),
          amount: allocation.amount
        };
      });
      
      // Remove duplicates and sum amounts for same addresses
      const addressMap = new Map();
      normalizedAllocations.forEach(allocation => {
        const address = allocation.walletAddress;
        if (addressMap.has(address)) {
          const existing = addressMap.get(address);
          const newAmount = BigInt(existing.amount) + BigInt(allocation.amount);
          addressMap.set(address, { ...existing, amount: newAmount.toString() });
        } else {
          addressMap.set(address, allocation);
        }
      });
      
      const uniqueAllocations = Array.from(addressMap.values());
      
      // Sort by wallet address for consistency
      uniqueAllocations.sort((a, b) => a.walletAddress.localeCompare(b.walletAddress));
      
      // Create merkle tree
      const treeData = await this.generateMerkleTree(uniqueAllocations);
      
      // Create merkle tree document
      const merkleTree = new MerkleTreeModel({
        name,
        description,
        root: treeData.root,
        totalAmount: treeData.totalAmount,
        totalUsers: uniqueAllocations.length,
        leaves: treeData.leaves,
        adminId,
        metadata: {
          snapshotDate: new Date(),
          criteria: description,
          notes: `Generated from ${allocations.length} original allocations, ${uniqueAllocations.length} unique addresses`
        }
      });
      
      await merkleTree.save();
      
      logger.info('Merkle tree created', {
        id: merkleTree._id,
        name,
        totalUsers: uniqueAllocations.length,
        totalAmount: treeData.totalAmount,
        adminId
      });
      
      return merkleTree;
      
    } catch (error) {
      logger.error('Create merkle tree error', {
        error: error.message,
        name,
        allocationsCount: allocations?.length,
        adminId
      });
      throw error;
    }
  }
  
  /**
   * Generate merkle tree from allocations
   * @param {Array} allocations - Array of {walletAddress, amount}
   */
  async generateMerkleTree(allocations) {
    try {
      // Create leaves with index
      const leaves = allocations.map((allocation, index) => ({
        walletAddress: allocation.walletAddress,
        amount: allocation.amount,
        index
      }));
      
      // Generate merkle tree leaves (hashes)
      const treeLeaves = leaves.map(leaf => 
        this.createLeafHash(leaf.walletAddress, leaf.amount)
      );
      
      // Create merkle tree
      const merkleTree = new MerkleTree(treeLeaves, keccak256, { sortPairs: true });
      const root = merkleTree.getHexRoot();
      
      // Generate proofs for each leaf
      const leavesWithProofs = leaves.map((leaf, index) => ({
        ...leaf,
        proof: merkleTree.getHexProof(treeLeaves[index])
      }));
      
      // Calculate total amount
      const totalAmount = allocations.reduce((sum, allocation) => {
        return sum + BigInt(allocation.amount);
      }, BigInt(0)).toString();
      
      return {
        root,
        totalAmount,
        leaves: leavesWithProofs,
        tree: merkleTree // Return tree for additional operations if needed
      };
      
    } catch (error) {
      logger.error('Generate merkle tree error', error);
      throw error;
    }
  }
  
  /**
   * Create leaf hash for merkle tree
   * @param {string} walletAddress - Wallet address
   * @param {string} amount - Amount as string
   */
  createLeafHash(walletAddress, amount) {
    return keccak256(Buffer.concat([
      Buffer.from(walletAddress.slice(2), 'hex'), // Remove 0x prefix
      Buffer.from(BigInt(amount).toString(16).padStart(64, '0'), 'hex') // Pad to 32 bytes
    ]));
  }
  
  /**
   * Verify merkle proof
   * @param {string} walletAddress - Wallet address
   * @param {string} amount - Amount as string
   * @param {Array} proof - Merkle proof array
   * @param {string} root - Merkle root
   */
  verifyProof(walletAddress, amount, proof, root) {
    try {
      const leaf = this.createLeafHash(walletAddress, amount);
      return MerkleTree.verify(proof, leaf, root);
    } catch (error) {
      logger.error('Verify proof error', {
        error: error.message,
        walletAddress,
        amount
      });
      return false;
    }
  }
  
  /**
   * Get proof for wallet address from active merkle tree
   * @param {string} walletAddress - Wallet address
   */
  async getProofForWallet(walletAddress) {
    try {
      if (!this.activeMerkleTree) {
        await this.loadActiveMerkleTree();
      }
      
      if (!this.activeMerkleTree) {
        return null;
      }
      
      return this.activeMerkleTree.getProofForWallet(walletAddress);
      
    } catch (error) {
      logger.error('Get proof for wallet error', {
        error: error.message,
        walletAddress
      });
      return null;
    }
  }
  
  /**
   * Check if wallet is eligible in active merkle tree
   * @param {string} walletAddress - Wallet address
   */
  async isWalletEligible(walletAddress) {
    try {
      if (!this.activeMerkleTree) {
        await this.loadActiveMerkleTree();
      }
      
      if (!this.activeMerkleTree) {
        return false;
      }
      
      return this.activeMerkleTree.isWalletEligible(walletAddress);
      
    } catch (error) {
      logger.error('Check wallet eligibility error', {
        error: error.message,
        walletAddress
      });
      return false;
    }
  }
  
  /**
   * Update user allocations in database based on merkle tree
   * @param {string} merkleTreeId - Merkle tree ID
   */
  async updateUserAllocations(merkleTreeId) {
    try {
      const merkleTree = await MerkleTreeModel.findById(merkleTreeId);
      
      if (!merkleTree) {
        throw new Error('Merkle tree not found');
      }
      
      const bulkOps = [];
      
      for (const leaf of merkleTree.leaves) {
        bulkOps.push({
          updateOne: {
            filter: { walletAddress: leaf.walletAddress },
            update: {
              $set: {
                totalClaimable: leaf.amount,
                merkleProof: leaf.proof
              }
            },
            upsert: true
          }
        });
      }
      
      if (bulkOps.length > 0) {
        await User.bulkWrite(bulkOps);
        
        logger.info('User allocations updated', {
          merkleTreeId,
          updatedCount: bulkOps.length
        });
      }
      
      return bulkOps.length;
      
    } catch (error) {
      logger.error('Update user allocations error', {
        error: error.message,
        merkleTreeId
      });
      throw error;
    }
  }
  
  /**
   * Validate merkle tree integrity
   * @param {string} merkleTreeId - Merkle tree ID
   */
  async validateMerkleTree(merkleTreeId) {
    try {
      const merkleTree = await MerkleTreeModel.findById(merkleTreeId);
      
      if (!merkleTree) {
        throw new Error('Merkle tree not found');
      }
      
      // Validate tree integrity
      const validation = merkleTree.validateIntegrity();
      if (!validation.valid) {
        return validation;
      }
      
      // Regenerate tree and compare root
      const allocations = merkleTree.leaves.map(leaf => ({
        walletAddress: leaf.walletAddress,
        amount: leaf.amount
      }));
      
      const regeneratedTree = await this.generateMerkleTree(allocations);
      
      if (regeneratedTree.root !== merkleTree.root) {
        return {
          valid: false,
          error: 'Merkle root mismatch when regenerating tree'
        };
      }
      
      // Verify all proofs
      for (const leaf of merkleTree.leaves) {
        const isValid = this.verifyProof(
          leaf.walletAddress,
          leaf.amount,
          leaf.proof,
          merkleTree.root
        );
        
        if (!isValid) {
          return {
            valid: false,
            error: `Invalid proof for address ${leaf.walletAddress}`
          };
        }
      }
      
      return { valid: true };
      
    } catch (error) {
      logger.error('Validate merkle tree error', {
        error: error.message,
        merkleTreeId
      });
      
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  /**
   * Activate merkle tree
   * @param {string} merkleTreeId - Merkle tree ID
   */
  async activateMerkleTree(merkleTreeId) {
    try {
      const merkleTree = await MerkleTreeModel.findById(merkleTreeId);
      
      if (!merkleTree) {
        throw new Error('Merkle tree not found');
      }
      
      // Validate before activation
      const validation = await this.validateMerkleTree(merkleTreeId);
      if (!validation.valid) {
        throw new Error(`Cannot activate invalid tree: ${validation.error}`);
      }
      
      // Activate tree (this will deactivate others)
      await merkleTree.activate();
      
      // Update local reference
      this.activeMerkleTree = merkleTree;
      
      // Update user allocations
      await this.updateUserAllocations(merkleTreeId);
      
      logger.info('Merkle tree activated', {
        id: merkleTree._id,
        name: merkleTree.name,
        totalUsers: merkleTree.totalUsers,
        totalAmount: merkleTree.totalAmount
      });
      
      return merkleTree;
      
    } catch (error) {
      logger.error('Activate merkle tree error', {
        error: error.message,
        merkleTreeId
      });
      throw error;
    }
  }
  
  /**
   * Get active merkle tree info
   */
  async getActiveMerkleTree() {
    if (!this.activeMerkleTree) {
      await this.loadActiveMerkleTree();
    }
    
    return this.activeMerkleTree;
  }
  
  /**
   * Import allocations from CSV
   * @param {string} csvData - CSV data string
   */
  parseCsvAllocations(csvData) {
    try {
      const lines = csvData.trim().split('\n');
      const allocations = [];
      
      // Skip header if present
      const startIndex = lines[0].toLowerCase().includes('address') || lines[0].toLowerCase().includes('wallet') ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [walletAddress, amount] = line.split(',').map(item => item.trim());
        
        if (!walletAddress || !amount) {
          logger.warn(`Skipping invalid line ${i + 1}: ${line}`);
          continue;
        }
        
        allocations.push({
          walletAddress,
          amount
        });
      }
      
      return allocations;
      
    } catch (error) {
      logger.error('Parse CSV allocations error', error);
      throw new Error('Failed to parse CSV data');
    }
  }
}

module.exports = new MerkleService();