# Gensyn Testnet: OP Stack Canonical Bridge Contracts

## Summary

- Gensyn Testnet is an OP Stack L2 settling on **Ethereum Sepolia** (chain ID **685685**, hex `0xa7675`)
- L2 RPC: `https://gensyn-testnet.g.alchemy.com/public`
- Explorer: `https://gensyn-testnet.explorer.alchemy.com`
- Fault proofs enabled (OptimismPortal v5.0.0, PermissionedDisputeGame)
- Not listed in the OP Superchain Registry as of 2026-03-25
- All L1 contracts deployed in a single tx at Sepolia block 7874016 ([`0xde9ac9...`](https://sepolia.etherscan.io/tx/0xde9ac90c366d32c85f74c62e38f99dca65af45789eab4c1eb704a63dbdb6a5bf))

---

## L1 Contracts (Sepolia)

### Core Bridge

| Contract                        | Address                                      | Version |
| ------------------------------- | -------------------------------------------- | ------- |
| OptimismPortal                  | `0xd77fdbc9eff43c74150479401d9ad431f979dd81` | 5.0.0   |
| L1CrossDomainMessenger          | `0x57a0881abe0b3cc44885bcbd015c9a7bb8ee7bac` | 2.10.0  |
| L1StandardBridge                | `0xaf99ffa3281548a1c30fcb443f066eaff2d297d4` | -       |
| SystemConfig                    | `0xf2c5aa355f27de7bf908b1acc106525929c439f3` | 3.7.0   |
| L1ERC721Bridge                  | `0xc30281719158df2f6ccf09034fa98e8fd49ee9b8` | 2.8.0   |
| OptimismMintableERC20Factory    | `0x279046f6a146e3356ec578ee5ef0831048bd9bc6` | 1.10.1  |

### Fault Proof System

| Contract                   | Address                                      | Version       |
| -------------------------- | -------------------------------------------- | ------------- |
| DisputeGameFactory         | `0x60645f5ee1e82c2df2421bbcd949b04b90cd514f` | 1.2.0         |
| AnchorStateRegistry        | `0xd1aceb0b1c5f8332e94e8df423e6e8fb3777ba08` | 1.3.0         |
| DelayedWETH                | `0x7c7b03f8e5a77fd65fbe29d9f32109b7de61578b` | 2.0.1-beta.3  |
| PermissionedDisputeGame    | `0xa0a14f0dab7132068b85eb6ebd148fdc1b207dc6` | 1.3.1         |

### Infrastructure

| Contract          | Address                                      |
| ----------------- | -------------------------------------------- |
| ProxyAdmin        | `0x3b7c68a407cefa044331ab0abb8732be7d1cf8a7` |
| AddressManager    | `0xe559837dc786ab7591b4b6075fefc3baf2440ee4` |
| SuperchainConfig  | `0xc2be75506d5724086deb7245bd260cc9753911be` |

### Key Roles

| Role                 | Address                                      |
| -------------------- | -------------------------------------------- |
| Guardian             | `0x7a50f00e8d05b95f98fe38d8bee366a7324dcf7e` |
| SystemConfig Owner   | `0x14c3f93933bdf167e987b0c5047fc48bbb1f870f` |
| Batcher              | `0x4ea09d8f3fb494a11072ff05b1be2241adceed09` |
| Unsafe Block Signer  | `0x838ce5723631a1ac8d21fb93b670be1bdac8f07f` |

---

## L2 Predeploys (Gensyn Testnet)

Standard OP Stack predeploys, all behind ERC-1967 proxies:

| Contract                        | Address                                      | Version       |
| ------------------------------- | -------------------------------------------- | ------------- |
| L2CrossDomainMessenger          | `0x4200000000000000000000000000000000000007` | 2.1.1-beta.1  |
| GasPriceOracle                  | `0x420000000000000000000000000000000000000F` | -             |
| L2StandardBridge                | `0x4200000000000000000000000000000000000010` | 1.11.1-beta.1 |
| SequencerFeeVault               | `0x4200000000000000000000000000000000000011` | -             |
| OptimismMintableERC20Factory    | `0x4200000000000000000000000000000000000012` | -             |
| L1BlockNumber                   | `0x4200000000000000000000000000000000000013` | -             |
| L2ProxyAdmin                    | `0x4200000000000000000000000000000000000014` | -             |
| L1Block                         | `0x4200000000000000000000000000000000000015` | -             |
| L2ToL1MessagePasser             | `0x4200000000000000000000000000000000000016` | -             |
| L2ERC721Bridge                  | `0x4200000000000000000000000000000000000017` | 1.4.1-beta.1  |
| OptimismMintableERC721Factory   | `0x4200000000000000000000000000000000000018` | -             |
| BaseFeeVault                    | `0x4200000000000000000000000000000000000019` | -             |
| L1FeeVault                      | `0x420000000000000000000000000000000000001a` | -             |
| SchemaRegistry                  | `0x4200000000000000000000000000000000000020` | -             |
| EAS                             | `0x4200000000000000000000000000000000000021` | -             |

---

## Bridging ETH: Sepolia to Gensyn Testnet (Deposit)

Deposits land on L2 after the next L1 epoch is derived (typically a few minutes).

### Option A: Via L1StandardBridge (recommended)

The simplest method. Call `depositETH` or `depositETHTo` on the L1StandardBridge at `0xaf99ffa3281548a1c30fcb443f066eaff2d297d4` on Sepolia.

**depositETH** sends ETH to the same address on L2:

```solidity
// Solidity
IL1StandardBridge bridge = IL1StandardBridge(0xaF99ffa3281548A1c30Fcb443F066eAfF2D297d4);
bridge.depositETH{value: msg.value}(
    200_000,  // _minGasLimit (safe default for simple transfer)
    ""        // _extraData (unused, pass empty bytes)
);
```

**depositETHTo** sends ETH to a different address on L2:

```solidity
bridge.depositETHTo{value: msg.value}(
    0xRecipientOnL2,
    200_000,
    ""
);
```

**Using cast (Foundry):**

```bash
# Deposit 0.1 ETH to your own address on Gensyn Testnet
cast send 0xaf99ffa3281548a1c30fcb443f066eaff2d297d4 \
  "depositETH(uint32,bytes)" 200000 "0x" \
  --value 0.1ether \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY

# Deposit 0.1 ETH to a specific address on Gensyn Testnet
cast send 0xaf99ffa3281548a1c30fcb443f066eaff2d297d4 \
  "depositETHTo(address,uint32,bytes)" $RECIPIENT 200000 "0x" \
  --value 0.1ether \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY
```

**Using ethers.js / viem:**

```javascript
// ethers.js v6
import { ethers } from "ethers";

const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const L1_STANDARD_BRIDGE = "0xaf99ffa3281548a1c30fcb443f066eaff2d297d4";

const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const bridge = new ethers.Contract(
  L1_STANDARD_BRIDGE,
  ["function depositETH(uint32 _minGasLimit, bytes _extraData) payable"],
  wallet
);

const tx = await bridge.depositETH(200_000, "0x", {
  value: ethers.parseEther("0.1"),
});
console.log("Deposit tx:", tx.hash);
await tx.wait();
```

```typescript
// viem
import { createWalletClient, http, parseEther } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(PRIVATE_KEY);
const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

const hash = await client.sendTransaction({
  to: "0xaf99ffa3281548a1c30fcb443f066eaff2d297d4",
  value: parseEther("0.1"),
  data: encodeFunctionData({
    abi: [
      {
        name: "depositETH",
        type: "function",
        inputs: [
          { name: "_minGasLimit", type: "uint32" },
          { name: "_extraData", type: "bytes" },
        ],
        outputs: [],
        stateMutability: "payable",
      },
    ],
    functionName: "depositETH",
    args: [200000, "0x"],
  }),
});
```

### Option B: Via OptimismPortal (low-level)

For advanced use cases. Call `depositTransaction` on the OptimismPortal at `0xd77fdbc9eff43c74150479401d9ad431f979dd81`.

```bash
# Low-level deposit: send 0.1 ETH to your own address on L2
cast send 0xd77fdbc9eff43c74150479401d9ad431f979dd81 \
  "depositTransaction(address,uint256,uint64,bool,bytes)" \
  $YOUR_ADDRESS \
  0.1ether \
  100000 \
  false \
  "0x" \
  --value 0.1ether \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY
```

**Note:** Messages sent directly to the OptimismPortal have no replay protection. Prefer the L1StandardBridge or L1CrossDomainMessenger for most use cases.

### Option C: Direct ETH send to OptimismPortal

The OptimismPortal has a `receive()` function. Sending ETH directly to the portal address deposits it to the sender's L2 address.

```bash
cast send 0xd77fdbc9eff43c74150479401d9ad431f979dd81 \
  --value 0.1ether \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY
```

---

## Bridging ERC-20 Tokens: Sepolia to Gensyn Testnet

Before bridging an ERC-20 token, it must have a corresponding "OptimismMintable" representation on L2. You can deploy one using the L2 `OptimismMintableERC20Factory` at `0x4200000000000000000000000000000000000012`.

### Step 1: Create the L2 token (one-time setup)

```bash
# On Gensyn Testnet L2, create a bridgeable representation of the L1 token
cast send 0x4200000000000000000000000000000000000012 \
  "createOptimismMintableERC20(address,string,string)" \
  $L1_TOKEN_ADDRESS \
  "Token Name" \
  "TKN" \
  --rpc-url https://gensyn-testnet.g.alchemy.com/public \
  --private-key $PRIVATE_KEY
```

### Step 2: Approve the L1StandardBridge

```bash
# On Sepolia, approve the bridge to spend your tokens
cast send $L1_TOKEN_ADDRESS \
  "approve(address,uint256)" \
  0xaf99ffa3281548a1c30fcb443f066eaff2d297d4 \
  $AMOUNT \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY
```

### Step 3: Deposit the ERC-20

```bash
cast send 0xaf99ffa3281548a1c30fcb443f066eaff2d297d4 \
  "depositERC20(address,address,uint256,uint32,bytes)" \
  $L1_TOKEN_ADDRESS \
  $L2_TOKEN_ADDRESS \
  $AMOUNT \
  200000 \
  "0x" \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY
```

---

## Withdrawing Assets: Gensyn Testnet to Sepolia

Withdrawals use the fault proof system and require multiple steps with waiting periods.

### Step 1: Initiate withdrawal on L2

```bash
# Withdraw ETH from L2 to L1
cast send 0x4200000000000000000000000000000000000010 \
  "withdraw(address,uint256,uint32,bytes)" \
  0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000 \
  $AMOUNT \
  200000 \
  "0x" \
  --rpc-url https://gensyn-testnet.g.alchemy.com/public \
  --private-key $PRIVATE_KEY
```

The special address `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000` represents native ETH on OP Stack L2s.

### Step 2: Wait for state proposal

After initiating, wait for the withdrawal's L2 output root to be proposed on L1 via the DisputeGameFactory. This can take several hours depending on the chain's proposal frequency.

### Step 3: Prove the withdrawal on L1

Call `proveWithdrawalTransaction` on the OptimismPortal (`0xd77fdbc9eff43c74150479401d9ad431f979dd81`) with the withdrawal transaction details and Merkle proof. The Optimism SDK or `op-withdrawal-tool` can generate the required proof data.

### Step 4: Wait for the challenge period

With fault proofs (OptimismPortal v5.0.0), the challenge period is enforced by the dispute game. Finalization depends on the game resolving in favor of the withdrawal (typically 3.5-7 days on production, may be shorter on testnet).

### Step 5: Finalize the withdrawal on L1

```bash
cast send 0xd77fdbc9eff43c74150479401d9ad431f979dd81 \
  "finalizeWithdrawalTransaction((uint256,address,address,uint256,uint256,bytes))" \
  "($NONCE,$SENDER,$TARGET,$VALUE,$GAS_LIMIT,$DATA)" \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY
```

### Using the Optimism SDK for Withdrawals

The Optimism SDK automates the proof generation and multi-step withdrawal process:

```javascript
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import { publicActionsL1, publicActionsL2 } from "viem/op-stack";

const gensyn = {
  id: 685685,
  name: "Gensyn Testnet",
  network: "gensyn-testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://gensyn-testnet.g.alchemy.com/public"] },
  },
  contracts: {
    portal: {
      [sepolia.id]: {
        address: "0xd77fdbc9eff43c74150479401d9ad431f979dd81",
      },
    },
    l1StandardBridge: {
      [sepolia.id]: {
        address: "0xaf99ffa3281548a1c30fcb443f066eaff2d297d4",
      },
    },
    l2OutputOracle: {
      // Fault proofs: use DisputeGameFactory instead
      [sepolia.id]: {
        address: "0x60645f5ee1e82c2df2421bbcd949b04b90cd514f",
      },
    },
  },
};

const l1Client = createPublicClient({
  chain: sepolia,
  transport: http(),
}).extend(publicActionsL1());

const l2Client = createPublicClient({
  chain: gensyn,
  transport: http(),
}).extend(publicActionsL2());

// Use l1Client and l2Client for deposit/withdrawal operations
```

---

## Sending Arbitrary Messages (L1 to L2)

Use the L1CrossDomainMessenger for cross-chain contract calls with replay protection:

```bash
cast send 0x57a0881abe0b3cc44885bcbd015c9a7bb8ee7bac \
  "sendMessage(address,bytes,uint32)" \
  $L2_TARGET_CONTRACT \
  $ENCODED_CALLDATA \
  500000 \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY
```

On L2, the target contract can verify the sender via the L2CrossDomainMessenger (`0x4200000000000000000000000000000000000007`) by calling `xDomainMessageSender()`.

---

## Network Configuration

```
Chain ID:            685685 (0xa7675)
L2 RPC:              https://gensyn-testnet.g.alchemy.com/public
Explorer:            https://gensyn-testnet.explorer.alchemy.com
L1 (Settlement):     Ethereum Sepolia (chain ID 11155111)
Block time:          ~2 seconds
Gas price:           ~0.01 gwei
```

**Adding to MetaMask / wallet:**

| Field          | Value                                          |
| -------------- | ---------------------------------------------- |
| Network Name   | Gensyn Testnet                                 |
| RPC URL        | `https://gensyn-testnet.g.alchemy.com/public`  |
| Chain ID       | 685685                                         |
| Currency       | ETH                                            |
| Explorer       | `https://gensyn-testnet.explorer.alchemy.com`  |

---

*Last verified: 2026-03-25. Contract addresses discovered by querying the L2 predeploys and tracing L1 counterparts via RPC calls.*
