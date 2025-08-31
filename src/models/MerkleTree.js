const mongoose = require('mongoose');

const merkleTreeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  root: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{64}$/.test(v);
      },
      message: 'Invalid merkle root format'
    }
  },
  totalAmount: {
    type: String, // Using string to handle large numbers
    required: true
  },
  totalUsers: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  version: {
    type: Number,
    default: 1
  },
  leaves: [{
    walletAddress: {
      type: String,
      required: true,
      lowercase: true
    },
    amount: {
      type: String,
      required: true
    },
    index: {
      type: Number,
      required: true
    },
    proof: {
      type: [String],
      required: true
    }
  }],
  metadata: {
    blockNumber: Number,
    snapshotDate: Date,
    criteria: String,
    notes: String
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
merkleTreeSchema.index({ name: 1 });
merkleTreeSchema.index({ root: 1 });
merkleTreeSchema.index({ isActive: 1 });
merkleTreeSchema.index({ 'leaves.walletAddress': 1 });
merkleTreeSchema.index({ 'leaves.index': 1 });
merkleTreeSchema.index({ createdAt: -1 });

// Virtual for formatted total amount
merkleTreeSchema.virtual('formattedTotalAmount').get(function() {
  return (BigInt(this.totalAmount) / BigInt('1000000000000000000')).toString();
});

// Instance method to get proof for wallet address
merkleTreeSchema.methods.getProofForWallet = function(walletAddress) {
  const leaf = this.leaves.find(leaf => 
    leaf.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  
  if (!leaf) {
    return null;
  }
  
  return {
    amount: leaf.amount,
    index: leaf.index,
    proof: leaf.proof
  };
};

// Instance method to check if wallet is eligible
merkleTreeSchema.methods.isWalletEligible = function(walletAddress) {
  return this.leaves.some(leaf => 
    leaf.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
};

// Instance method to get wallet allocation
merkleTreeSchema.methods.getWalletAllocation = function(walletAddress) {
  const leaf = this.leaves.find(leaf => 
    leaf.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  
  return leaf ? leaf.amount : '0';
};

// Instance method to activate tree
merkleTreeSchema.methods.activate = async function() {
  // Deactivate all other trees first
  await this.constructor.updateMany(
    { _id: { $ne: this._id } },
    { isActive: false }
  );
  
  this.isActive = true;
  return this.save();
};

// Instance method to validate tree integrity
merkleTreeSchema.methods.validateIntegrity = function() {
  // Check if all leaves have unique indices
  const indices = this.leaves.map(leaf => leaf.index);
  const uniqueIndices = [...new Set(indices)];
  
  if (indices.length !== uniqueIndices.length) {
    return { valid: false, error: 'Duplicate indices found' };
  }
  
  // Check if indices are sequential starting from 0
  indices.sort((a, b) => a - b);
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] !== i) {
      return { valid: false, error: 'Non-sequential indices' };
    }
  }
  
  // Check if total amount matches sum of leaf amounts
  const calculatedTotal = this.leaves.reduce((sum, leaf) => {
    return sum + BigInt(leaf.amount);
  }, BigInt(0));
  
  if (calculatedTotal.toString() !== this.totalAmount) {
    return { valid: false, error: 'Total amount mismatch' };
  }
  
  return { valid: true };
};

// Static method to get active tree
merkleTreeSchema.statics.getActiveTree = function() {
  return this.findOne({ isActive: true }).populate('adminId', 'name email');
};

// Static method to create new tree from data
merkleTreeSchema.statics.createFromData = async function(data, adminId) {
  const { MerkleTree } = require('merkletreejs');
  const keccak256 = require('keccak256');
  
  // Validate input data
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid data provided');
  }
  
  // Sort data by wallet address for consistency
  data.sort((a, b) => a.walletAddress.localeCompare(b.walletAddress));
  
  // Create leaves
  const leaves = data.map((item, index) => ({
    walletAddress: item.walletAddress.toLowerCase(),
    amount: item.amount,
    index
  }));
  
  // Generate merkle tree
  const treeLeaves = leaves.map(leaf => 
    keccak256(Buffer.concat([
      Buffer.from(leaf.walletAddress.slice(2), 'hex'),
      Buffer.from(BigInt(leaf.amount).toString(16).padStart(64, '0'), 'hex')
    ]))
  );
  
  const merkleTree = new MerkleTree(treeLeaves, keccak256, { sortPairs: true });
  const root = merkleTree.getHexRoot();
  
  // Generate proofs for each leaf
  const leavesWithProofs = leaves.map((leaf, index) => ({
    ...leaf,
    proof: merkleTree.getHexProof(treeLeaves[index])
  }));
  
  // Calculate total amount
  const totalAmount = leaves.reduce((sum, leaf) => {
    return sum + BigInt(leaf.amount);
  }, BigInt(0)).toString();
  
  return {
    root,
    totalAmount,
    totalUsers: leaves.length,
    leaves: leavesWithProofs
  };
};

const MerkleTreeModel = mongoose.model('MerkleTree', merkleTreeSchema);

module.exports = MerkleTreeModel;