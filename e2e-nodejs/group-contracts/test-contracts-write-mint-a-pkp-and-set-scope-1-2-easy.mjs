import path from 'path';
import { success, fail, testThis } from '../../tools/scripts/utils.mjs';
import LITCONFIG from '../../lit.config.json' assert { type: 'json' };
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { ethers } from 'ethers';
import { AuthMethodType, AuthMethodScope } from '@lit-protocol/constants';
import { LitAuthClient } from '@lit-protocol/lit-auth-client';

export async function main() {
  // ========== Controller Setup ===========
  const provider = new ethers.providers.JsonRpcProvider(
    LITCONFIG.CHRONICLE_RPC
  );

  const controllerWallet = new ethers.Wallet(
    LITCONFIG.CONTROLLER_PRIVATE_KEY,
    provider
  );

  // ==================== LitContracts Setup ====================
  const contractClient = new LitContracts({
    signer: controllerWallet,
  });

  await contractClient.connect();

  // ==================== Test Logic ====================

  const authMethod = {
    authMethodType: AuthMethodType.EthWallet,
    accessToken: JSON.stringify(LITCONFIG.CONTROLLER_AUTHSIG),
  };

  const mintInfo = await contractClient.mintWithAuth({
    authMethod,
    scopes: [
      // AuthMethodScope.NoPermissions,
      AuthMethodScope.SignAnything,
      AuthMethodScope.OnlySignMessages,
    ],
  });

  if (!mintInfo.tx.transactionHash) {
    return fail(`failed to mint a PKP`);
  }

  const authId = LitAuthClient.getAuthIdByAuthMethod(authMethod);

  // ==================== Post-Validation ====================
  // NOTE: When using other auth methods, you might need to wait for a block to be mined before you can read the scopes
  // -- get the scopes
  const scopes =
    await contractClient.pkpPermissionsContract.read.getPermittedAuthMethodScopes(
      mintInfo.pkp.tokenId,
      AuthMethodType.EthWallet,
      authId,
      3
    );

  const signAnythingScope = scopes[1];
  const onlySignMessagesScope = scopes[2];

  if (!signAnythingScope) {
    return fail(`signAnythingScope should be true`);
  }

  if (!onlySignMessagesScope) {
    return fail(`onlySignMessagesScope should be true`);
  }

  // ==================== Success ====================
  return success(`ContractsSDK mints a PKP and set scope 1 and 2
Logs:
---
tokenId: ${mintInfo.pkp.tokenId}
transactionHash: ${mintInfo.tx.transactionHash}
signAnythingScope: ${signAnythingScope}
onlySignMessagesScope: ${onlySignMessagesScope}
`);
}

await testThis({ name: path.basename(import.meta.url), fn: main });
