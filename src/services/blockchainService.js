const { ethers } = require('ethers');
const MerkleTreeModel = require('../models/MerkleTree');
const ClaimTransaction = require('../models/ClaimTransaction');
const User = require('../models/User');
const logger = require('../utils/logger');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.wallet = null;
    this.initialized = false;
    
    this.initializeProvider();
  }
  
  initializeProvider() {
    try {
      // Initialize provider based on environment
      const rpcUrl = process.env.NETWORK === 'mainnet' 
        ? process.env.BSC_RPC_URL 
        : process.env.BSC_TESTNET_RPC_URL;
      
      if (!rpcUrl) {
        logger.warn('No RPC URL configured, blockchain features will be limited');
        return;
      }
      
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Initialize wallet if private key is provided
      if (process.env.PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        logger.info('Blockchain wallet initialized');
      }
      
      // Initialize contract if address is provided
      if (process.env.CONTRACT_ADDRESS && this.wallet) {
        // Basic ERC20-like ABI for token contract with claim functionality
        const contractABI = [
          "function claim(uint256 amount, bytes32[] calldata merkleProof) external",
          "function adminClaim(address to, uint256 amount, bytes32[] calldata merkleProof) external",
          "function updateMerkleRoot(bytes32 newRoot) external",
          "function balanceOf(address account) external view returns (uint256)",
          "function totalSupply() external view returns (uint256)",
          "function name() external view returns (string)",
          "function symbol() external view returns (string)",
          "function decimals() external view returns (uint8)",
          "function merkleRoot() external view returns (bytes32)",
          "function claimed(address account) external view returns (uint256)",
          "event Claim(address indexed account, uint256 amount)",
          "event AdminClaim(address indexed admin, address indexed account, uint256 amount)",
          "event MerkleRootUpdated(bytes32 oldRoot, bytes32 newRoot)"
        ];
        
        this.contract = new ethers.Contract(
          process.env.CONTRACT_ADDRESS,
          contractABI,
          this.wallet
        );
        
        logger.info('Smart contract initialized', {
          address: process.env.CONTRACT_ADDRESS,
          network: process.env.NETWORK
        });
      }
      
      this.initialized = true;
      
    } catch (error) {
      logger.error('Failed to initialize blockchain service', error);
    }
  }
  
  async getNetworkInfo() {
    if (!this.provider) {
      throw new Error('Blockchain provider not initialized');
    }
    
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        chainId: network.chainId.toString(),
        name: network.name,
        blockNumber,
        rpcUrl: process.env.NETWORK === 'mainnet' 
          ? process.env.BSC_RPC_URL 
          : process.env.BSC_TESTNET_RPC_URL,
        contractAddress: process.env.CONTRACT_ADDRESS || null
      };
      
    } catch (error) {
      logger.error('Get network info error', error);
      throw error;
    }
  }
  
  async getTokenPrice() {
    // In a real implementation, you would fetch from a price oracle or DEX
    // For now, return a mock response
    return {
      price: "0.01", // USD
      change24h: "+2.5%",
      marketCap: "1000000",
      volume24h: "50000",
      lastUpdated: new Date().toISOString()
    };
  }
  
  async getContractInfo() {
    if (!this.contract) {
      throw new Error('Smart contract not initialized');
    }
    
    try {
      const [name, symbol, decimals, totalSupply, merkleRoot] = await Promise.all([
        this.contract.name(),
        this.contract.symbol(),
        this.contract.decimals(),
        this.contract.totalSupply(),
        this.contract.merkleRoot()
      ]);
      
      return {
        address: process.env.CONTRACT_ADDRESS,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
        merkleRoot,
        network: process.env.NETWORK
      };
      
    } catch (error) {
      logger.error('Get contract info error', error);
      throw error;
    }
  }
  
  async getWalletBalance(address) {
    if (!this.provider) {
      throw new Error('Blockchain provider not initialized');
    }
    
    try {
      const ethBalance = await this.provider.getBalance(address);
      
      let tokenBalance = '0';
      if (this.contract) {
        try {
          tokenBalance = await this.contract.balanceOf(address);
        } catch (error) {
          logger.warn('Failed to get token balance', { address, error: error.message });
        }
      }
      
      return {
        address,
        ethBalance: ethers.formatEther(ethBalance),
        tokenBalance: tokenBalance.toString()
      };
      
    } catch (error) {
      logger.error('Get wallet balance error', error);
      throw error;
    }
  }
  
  async getTransactionStatus(hash) {
    if (!this.provider) {
      throw new Error('Blockchain provider not initialized');
    }
    
    try {
      const tx = await this.provider.getTransaction(hash);
      
      if (!tx) {
        return {
          hash,
          status: 'not_found',
          exists: false
        };
      }
      
      const receipt = await this.provider.getTransactionReceipt(hash);
      
      return {
        hash,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value || 0),
        gasUsed: receipt?.gasUsed?.toString(),
        gasPrice: ethers.formatUnits(tx.gasPrice || 0, 'gwei'),
        confirmations: receipt ? await tx.confirmations() : 0,
        exists: true
      };
      
    } catch (error) {
      logger.error('Get transaction status error', error);
      throw error;
    }
  }
  
  async processPendingClaims() {
    if (!this.contract) {
      throw new Error('Smart contract not initialized');
    }
    
    try {
      const pendingClaims = await ClaimTransaction.getPendingClaims();
      const results = [];
      
      for (const claim of pendingClaims) {
        try {
          // Update status to processing
          await claim.updateStatus('processing');
          
          // Process based on claim type
          let txHash;
          if (claim.type === 'self_claim') {
            txHash = await this.processSelfClaim(claim);
          } else if (claim.type === 'admin_claim') {
            txHash = await this.processAdminClaim(claim._id);
          }
          
          results.push({
            claimId: claim._id,
            status: 'processed',
            transactionHash: txHash
          });
          
        } catch (error) {
          logger.error('Failed to process claim', {
            claimId: claim._id,
            error: error.message
          });
          
          await claim.updateStatus('failed', {
            failureReason: error.message
          });
          
          results.push({
            claimId: claim._id,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      return {
        processedCount: pendingClaims.length,
        results
      };
      
    } catch (error) {
      logger.error('Process pending claims error', error);
      throw error;
    }
  }
  
  async processSelfClaim(claim) {
    // In a real implementation, self-claims would typically be processed
    // by the user's wallet directly calling the contract
    // This method is mainly for monitoring and updating our database
    
    logger.blockchain('Processing self-claim', {
      claimId: claim._id,
      walletAddress: claim.walletAddress,
      amount: claim.amount
    });
    
    // Return a mock transaction hash for demonstration
    // In reality, we would monitor the blockchain for actual transactions
    const mockTxHash = '0x' + require('crypto').randomBytes(32).toString('hex');
    
    await claim.updateStatus('completed', {
      transactionHash: mockTxHash
    });
    
    // Update user's claimed amount
    const user = await User.findById(claim.user);
    if (user) {
      await user.updateClaim(claim.amount);
    }
    
    return mockTxHash;
  }
  
  async processAdminClaim(claimId) {
    if (!this.contract) {
      throw new Error('Smart contract not initialized');
    }
    
    try {
      const claim = await ClaimTransaction.findById(claimId);
      
      if (!claim) {
        throw new Error('Claim not found');
      }
      
      if (claim.status !== 'pending') {
        throw new Error('Claim is not in pending status');
      }
      
      // Update status to processing
      await claim.updateStatus('processing');
      
      // Prepare transaction
      const tx = await this.contract.adminClaim(
        claim.walletAddress,
        claim.amount,
        claim.merkleProof
      );
      
      logger.blockchain('Admin claim transaction sent', {
        claimId: claim._id,
        transactionHash: tx.hash,
        walletAddress: claim.walletAddress,
        amount: claim.amount
      });
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        await claim.updateStatus('completed', {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          gasUsed: receipt.gasUsed.toString()
        });
        
        // Update user's claimed amount
        const user = await User.findById(claim.user);
        if (user) {
          await user.updateClaim(claim.amount);
        }
        
        return {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: 'completed'
        };
      } else {
        await claim.updateStatus('failed', {
          failureReason: 'Transaction failed on blockchain'
        });
        
        throw new Error('Transaction failed on blockchain');
      }
      
    } catch (error) {
      const claim = await ClaimTransaction.findById(claimId);
      if (claim && claim.status === 'processing') {
        await claim.updateStatus('failed', {
          failureReason: error.message
        });
      }
      
      logger.error('Process admin claim error', {
        claimId,
        error: error.message
      });
      
      throw error;
    }
  }
  
  async updateMerkleRoot(merkleTreeId) {
    if (!this.contract) {
      throw new Error('Smart contract not initialized');
    }
    
    try {
      const merkleTree = await MerkleTreeModel.findById(merkleTreeId);
      
      if (!merkleTree) {
        throw new Error('Merkle tree not found');
      }
      
      // Validate tree integrity
      const validation = merkleTree.validateIntegrity();
      if (!validation.valid) {
        throw new Error(`Invalid merkle tree: ${validation.error}`);
      }
      
      // Update merkle root on contract
      const tx = await this.contract.updateMerkleRoot(merkleTree.root);
      
      logger.blockchain('Merkle root update transaction sent', {
        merkleTreeId,
        transactionHash: tx.hash,
        newRoot: merkleTree.root
      });
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Activate the merkle tree
        await merkleTree.activate();
        
        return {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          newRoot: merkleTree.root,
          status: 'completed'
        };
      } else {
        throw new Error('Transaction failed on blockchain');
      }
      
    } catch (error) {
      logger.error('Update merkle root error', {
        merkleTreeId,
        error: error.message
      });
      
      throw error;
    }
  }
  
  async getGasPrice() {
    if (!this.provider) {
      throw new Error('Blockchain provider not initialized');
    }
    
    try {
      const gasPrice = await this.provider.getFeeData();
      
      return {
        gasPrice: ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei'),
        maxFeePerGas: ethers.formatUnits(gasPrice.maxFeePerGas || 0, 'gwei'),
        maxPriorityFeePerGas: ethers.formatUnits(gasPrice.maxPriorityFeePerGas || 0, 'gwei')
      };
      
    } catch (error) {
      logger.error('Get gas price error', error);
      throw error;
    }
  }
  
  async getBlockInfo(blockNumber) {
    if (!this.provider) {
      throw new Error('Blockchain provider not initialized');
    }
    
    try {
      const block = await this.provider.getBlock(blockNumber || 'latest');
      
      return {
        number: block.number,
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: block.timestamp,
        gasLimit: block.gasLimit.toString(),
        gasUsed: block.gasUsed.toString(),
        transactionCount: block.transactions.length
      };
      
    } catch (error) {
      logger.error('Get block info error', error);
      throw error;
    }
  }
  
  async verifyMerkleProof(walletAddress, amount, proof, merkleRoot) {
    try {
      const { MerkleTree } = require('merkletreejs');
      const keccak256 = require('keccak256');
      
      // Create leaf hash
      const leaf = keccak256(Buffer.concat([
        Buffer.from(walletAddress.slice(2), 'hex'),
        Buffer.from(BigInt(amount).toString(16).padStart(64, '0'), 'hex')
      ]));
      
      // Verify proof
      const isValid = MerkleTree.verify(proof, leaf, merkleRoot);
      
      return isValid;
      
    } catch (error) {
      logger.error('Verify merkle proof error', error);
      return false;
    }
  }
  
  async getContractEvents(options = {}) {
    if (!this.contract) {
      throw new Error('Smart contract not initialized');
    }
    
    try {
      const { fromBlock = 'earliest', toBlock = 'latest', limit = 100 } = options;
      
      // Get claim events
      const claimFilter = this.contract.filters.Claim();
      const adminClaimFilter = this.contract.filters.AdminClaim();
      const merkleUpdateFilter = this.contract.filters.MerkleRootUpdated();
      
      const [claimEvents, adminClaimEvents, merkleUpdateEvents] = await Promise.all([
        this.contract.queryFilter(claimFilter, fromBlock, toBlock),
        this.contract.queryFilter(adminClaimFilter, fromBlock, toBlock),
        this.contract.queryFilter(merkleUpdateFilter, fromBlock, toBlock)
      ]);
      
      // Combine and sort events
      const allEvents = [
        ...claimEvents.map(e => ({ ...e, type: 'Claim' })),
        ...adminClaimEvents.map(e => ({ ...e, type: 'AdminClaim' })),
        ...merkleUpdateEvents.map(e => ({ ...e, type: 'MerkleRootUpdated' }))
      ].sort((a, b) => b.blockNumber - a.blockNumber);
      
      return {
        events: allEvents.slice(0, limit),
        total: allEvents.length,
        fromBlock,
        toBlock
      };
      
    } catch (error) {
      logger.error('Get contract events error', error);
      throw error;
    }
  }
  
  async getConnectionHealth() {
    try {
      const health = {
        provider: !!this.provider,
        contract: !!this.contract,
        wallet: !!this.wallet,
        network: null,
        blockNumber: null,
        connected: false
      };
      
      if (this.provider) {
        try {
          const network = await this.provider.getNetwork();
          const blockNumber = await this.provider.getBlockNumber();
          
          health.network = {
            chainId: network.chainId.toString(),
            name: network.name
          };
          health.blockNumber = blockNumber;
          health.connected = true;
          
        } catch (error) {
          logger.warn('Provider health check failed', error);
        }
      }
      
      return health;
      
    } catch (error) {
      logger.error('Get connection health error', error);
      return {
        provider: false,
        contract: false,
        wallet: false,
        network: null,
        blockNumber: null,
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = new BlockchainService();