// agentPass(): the one line an app adds to open a second door for AI agents.
//
// No pass: 402 with an MPP charge challenge (USDC on Stellar).
// Paid: the MPP charge server verifies and settles the payment, then this
// middleware records a pass in the agent_pass contract and returns a signed
// session token in the `Agent-Pass` header.
// Pass presented: the token is checked locally (signature and expiry), with no
// network call. Any other app can ask the contract with `passIsValid()`.
// The returned middleware carries `.dashboard`: the owner's sales page, read live
// from the public ledger, to mount wherever the owner likes.

import type { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Keypair, Networks, contract, rpc } from '@stellar/stellar-sdk';
import { Mppx, Store, stellar } from '@stellar/mpp/charge/server';
import { USDC_SAC_TESTNET } from '@stellar/mpp';
import { Credential, Receipt } from 'mppx';
import { dashboardHandler, passLength } from './dashboard.ts';

export { dashboardHandler, dashboardHtml, passLength, type DashboardConfig } from './dashboard.ts';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const PASSPHRASE = Networks.TESTNET;
const SECONDS_PER_LEDGER = 5;
export const PASS_HEADER = 'agent-pass';
/** The shared agent_pass contract on testnet, deployed once for every app. */
export const AGENT_PASS_CONTRACT = 'CDLR2ABHIPQ7SNWJKT3S5EE7DFTZ2VB2FJLISODIFNLYCRUCZKBFYJKU';

export type PassClaims = {
  app: string; // the app's Stellar address, which signs the token and is paid
  agent: string; // the paying agent's Stellar address
  exp: number; // unix seconds
  payment: string; // MPP payment transaction hash
  issue: string; // agent_pass.issue transaction hash
};

export type AgentPassOptions = {
  price: string; // in USDC, e.g. '0.50'
  appSecret: string; // the app's Stellar secret key: receives USDC, signs issue and tokens
  contractId?: string; // the agent_pass contract; default the shared one
  mppSecretKey: string; // binds MPP challenges to this server
  ttlSeconds?: number; // default one hour
};

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export function signPass(claims: PassClaims, app: Keypair): string {
  const body = b64url(JSON.stringify(claims));
  return `${body}.${b64url(app.sign(Buffer.from(body)))}`;
}

/** Local check: signed by `appAddress` and not expired. Returns the claims or null. */
export function verifyPass(token: string, appAddress: string, nowSeconds = Date.now() / 1000): PassClaims | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    if (!Keypair.fromPublicKey(appAddress).verify(Buffer.from(body), Buffer.from(sig, 'base64url'))) return null;
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as PassClaims;
    if (claims.app !== appAddress || !(claims.exp > nowSeconds)) return null;
    return claims;
  } catch {
    return null;
  }
}

function passContract(contractId: string, publicKey: string, signer?: Keypair) {
  return contract.Client.from({
    contractId,
    rpcUrl: RPC_URL,
    networkPassphrase: PASSPHRASE,
    publicKey,
    ...(signer ? contract.basicNodeSigner(signer, PASSPHRASE) : {}),
  }) as Promise<contract.Client & Record<string, (args: object) => Promise<contract.AssembledTransaction<unknown>>>>;
}

/** The hash of an `issue` that succeeded on chain. signAndSend() also resolves when the
 * transaction lands but fails, so a pass is handed out only on status SUCCESS. */
export function confirmIssued(sent: Pick<contract.SentTransaction<unknown>, 'sendTransactionResponse' | 'getTransactionResponse'>): string {
  const hash = sent.sendTransactionResponse?.hash;
  const status = sent.getTransactionResponse?.status;
  if (!hash || status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`agent_pass.issue ${hash ?? '(not sent)'} ended with status ${status ?? 'unknown'}`);
  }
  return hash;
}

/** Any app can ask the contract whether `agent` holds a live pass at `app`. Read-only, no fee. */
export async function passIsValid(contractId: string, app: string, agent: string): Promise<boolean> {
  const client = await passContract(contractId, app);
  const tx = await client.valid({ app, agent });
  return tx.result as boolean;
}

export type AgentPassMiddleware = ((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<void>) & {
  /** The owner's dashboard, the app's real sales from the ledger: `app.use('/agent-pass', gate.dashboard)`. */
  dashboard: ReturnType<typeof dashboardHandler>;
};

export function agentPass(options: AgentPassOptions): AgentPassMiddleware {
  const app = Keypair.fromSecret(options.appSecret);
  const ttl = options.ttlSeconds ?? 3600;
  const contractId = options.contractId ?? AGENT_PASS_CONTRACT;
  const server = new rpc.Server(RPC_URL);
  const client = passContract(contractId, app.publicKey(), app);
  const mppx = Mppx.create({
    secretKey: options.mppSecretKey,
    methods: [
      stellar.charge({
        recipient: app.publicKey(),
        currency: USDC_SAC_TESTNET,
        network: 'stellar:testnet',
        store: Store.memory(),
      }),
    ],
  });

  // The app's account signs every issue, so issues run one at a time.
  let queue: Promise<unknown> = Promise.resolve();
  const issue = (agent: string) => {
    const run = queue.then(async () => {
      // The raw call: the parsed one decodes the whole ledger and fails on value types this SDK does not know yet.
      const { sequence } = await server._getLatestLedger();
      const expiryLedger = sequence + Math.ceil(ttl / SECONDS_PER_LEDGER);
      const tx = await (await client).issue({ app: app.publicKey(), agent, expiry_ledger: expiryLedger });
      return confirmIssued(await tx.signAndSend());
    });
    queue = run.catch(() => {});
    return run;
  };

  const middleware = async function agentPassMiddleware(req: ExpressRequest, res: ExpressResponse, next: NextFunction): Promise<void> {
    const token = req.get(PASS_HEADER);
    const held = token ? verifyPass(token, app.publicKey()) : null;
    if (held) {
      res.locals.agentPass = held;
      next();
      return;
    }

    const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
      method: req.method,
      headers: req.headers as Record<string, string>,
    });
    const result = await mppx.charge({ amount: options.price, description: `Agent Pass, ${passLength(ttl)}` })(request);
    if (result.status === 402) {
      res.status(402);
      result.challenge.headers.forEach((value, key) => res.setHeader(key, value));
      res.send(await result.challenge.text());
      return;
    }

    // Paid and settled. The MPP server checked that the transfer came from the credential's source.
    const receiptHeaders = result.withReceipt(new Response()).headers;
    const payment = Receipt.deserialize(receiptHeaders.get('payment-receipt')!).reference;
    const agent = Credential.fromRequest(request).source!.split(':').pop()!;
    let issueHash: string;
    try {
      issueHash = await issue(agent);
    } catch (error) {
      console.error(`[agent-pass] ${new Date().toISOString()} paid ${payment} but issue failed:`, error);
      res.status(502).json({ error: 'Payment received, pass not recorded. Retry with the same payment is not possible; contact the app.', payment });
      return;
    }
    const claims: PassClaims = { app: app.publicKey(), agent, exp: Math.floor(Date.now() / 1000) + ttl, payment, issue: issueHash };
    receiptHeaders.forEach((value, key) => res.setHeader(key, value));
    res.setHeader(PASS_HEADER, signPass(claims, app));
    res.locals.agentPass = claims;
    next();
  };
  return Object.assign(middleware, {
    dashboard: dashboardHandler({ app: app.publicKey(), price: options.price, ttlSeconds: ttl, contractId }),
  });
}
