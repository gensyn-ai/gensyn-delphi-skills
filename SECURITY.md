# Reporting a Vulnerability

If you believe you have found a security vulnerability in Delphi — whether in our smart contracts, web application, backend services, or supporting infrastructure — please report it responsibly.

**Email:** [security@gensyn.ai](mailto:security@gensyn.ai)

You must send reports using our PGP key:

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

mDMEad7mABYJKwYBBAHaRw8BAQdA5jgn04VFLMr8riLTbcPS2gavMNW3S/MYZt3C
uTSkPMm0JEdlbnN5biBTZWN1cml0eSA8c2VjdXJpdHlAZ2Vuc3luLmFpPoiwBBMW
CgBYFiEElfoJAj52tz1JoRyg9mUfY6jYjqEFAmne5gAbFIAAAAAABAAObWFudTIs
Mi41KzEuMTIsMCwzAhsDBQkDwmcABAsJCAcEFQoJCAUWAgMBAAIeBQIXgAAKCRD2
ZR9jqNiOoRY3AP48++sxxquoOh5v6ry71vhKQUjZXCbcXsq4j9MNVpvhOQEA7Ltu
gyR7HYg0Ne40+0eDZ99sDNNXlZThwlfjQpeaTAu4OARp3uYAEgorBgEEAZdVAQUB
AQdApB3j0T8DFhY3b8SAwqZ2mhHYV/ES+UfZS7m/foxWIwEDAQgHiJoEGBYKAEIW
IQSV+gkCPna3PUmhHKD2ZR9jqNiOoQUCad7mABsUgAAAAAAEAA5tYW51MiwyLjUr
MS4xMiwwLDMCGwwFCQPCZwAACgkQ9mUfY6jYjqEeRgD/WiNenWTv5Nq9++TLLl8F
xVY+6bOFLCmRsYo7STtCLGMA/23OoHE8gl7e7yZDUChq8xUOk5m7DwkK2B60yAv0
znQL
=4TDL
-----END PGP PUBLIC KEY BLOCK-----
```

**Do not** open a public GitHub issue for security vulnerabilities.

### What to Include

- A description of the vulnerability and its potential impact.
- Steps to reproduce or a proof of concept.
- The affected component(s): smart contracts, web UI, indexer, API, or infrastructure.
- Relevant contract addresses, transaction hashes, or network details (testnet vs. mainnet) if applicable.
- Your contact information for follow-up.

## Scope

The following are in scope for security reports:

### Smart Contracts

Delphi smart contracts are deployed on the Delphi network (EVM-compatible, Solidity 0.8.30). Core contracts include:

| Contract                 | Testnet Address                              |
| ------------------------ | -------------------------------------------- |
| DelphiFactory            | `0xd03CEC55802f0D44D844384E1144B25717315E5A` |
| DynamicParimutuelGateway | `0x7b8FDBD187B0Be5e30e48B1995df574A62667147` |

Issues of interest include but are not limited to:

- Loss or theft of user funds (token balances, market positions, or collateral).
- Manipulation of market outcomes, pricing, or settlement logic.
- Unauthorized market creation, initialization, or state transitions.
- Rounding, precision, or overflow errors in `DynamicParimutuelMath` that enable value extraction.
- Proxy or initialization flaws (clone-based deployment via `Clones.clone()`).
- Denial of service against market operations (buy, sell, redeem, liquidate).
- Access control bypasses on gateway initialization or factory registration.

### Web Application and Backend Services

- [delphi.gensyn.ai](https://delphi.gensyn.ai) — the Delphi web interface.
- Authentication and wallet connectivity (Privy, WalletConnect, SIWE, EIP-7702 smart wallet flows).
- The Delphi indexer and its API.
- The hosted REE (Reproducible Execution Environment) auth and inference APIs.

### Out of Scope

- Third-party services not operated by Delphi (e.g., Alchemy, Privy, WalletConnect, Cloudflare).
- Vulnerabilities in upstream dependencies (OpenZeppelin, Foundry, etc.) that are not exploitable in Delphi's specific usage — please report these to the respective upstream projects.
- Social engineering attacks against Delphi staff.
- Denial of service via volumetric network flooding.
- Issues in testnet-only code (MockToken, TestToken, DelphiFaucetUpgradeable) that do not affect production contracts — though we still welcome these reports at lower priority.

## Disclosure Policy

We follow a coordinated disclosure model:

1. **Triage.** Reports are reviewed by the security team. We prioritize by severity — critical smart contract vulnerabilities (fund loss, unauthorized state changes) are triaged immediately; lower-severity issues are assessed as capacity allows.
2. **Remediation.** Confirmed vulnerabilities are remediated as rapidly as possible, with critical issues taking precedence. For critical smart contract vulnerabilities, we may deploy emergency mitigations — including contract pauses or frontend restrictions — before the full fix is complete.
3. **Coordination.** We will coordinate with you on a disclosure timeline. We ask that you give us a reasonable window — generally 90 days for non-critical issues, shorter for critical issues with active exploitation risk — before any public disclosure.
4. **Credit.** With your permission, we will publicly credit you for the discovery in any advisory or post-mortem we publish.

We may not respond to every report individually, but we read all of them. If your report describes a critical or high-severity issue, you will hear from us.

## Safe Harbor

Delphi will not pursue legal action against security researchers who:

- Act in good faith to avoid privacy violations, degradation of user experience, disruption to production systems, and destruction of data.
- Only interact with accounts they own or with explicit permission of the account holder.
- Do not exploit a vulnerability beyond the minimum necessary to demonstrate the issue.
- Report the vulnerability promptly and do not disclose it publicly before coordinated resolution.
- Do not extract, move, or otherwise interact with funds belonging to other users.

## Severity Classification

We use the following severity levels when triaging reports:

| Severity     | Smart Contract Examples                                                                                                                      | Application / Infra Examples                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Critical** | Direct theft of user funds; unauthorized minting or burning of positions; manipulation of market settlement                                  | Remote code execution; authentication bypass granting access to admin functions or user wallets; private key exposure                           |
| **High**     | Permanent freezing of funds; griefing attacks that block market settlement or redemption; economic exploits via rounding or precision errors | Privilege escalation; unauthorized access to backend data (user positions, wallet mappings); indexer data corruption affecting displayed prices |
| **Medium**   | Temporary denial of service against specific markets; minor economic inefficiency exploitable under narrow conditions                        | Cross-site scripting (XSS) in the web UI; CSRF; information disclosure of non-sensitive internal data                                           |
| **Low**      | Theoretical issues requiring unrealistic preconditions; gas optimization issues                                                              | UI bugs with no security impact; missing security headers with no demonstrated exploit path                                                     |

## Contact

- **Security reports:** [security@gensyn.ai](mailto:security@gensyn.ai)
- **General inquiries:** [hello@gensyn.ai](mailto:hello@gensyn.ai)
