// honorPass(): let in an agent that bought its pass at another app.
//
// The agent sends two headers: the pass token the selling app gave it, and a
// fresh signature by its own Stellar key. The token proves which app sold the
// pass and to which agent; the signature proves the caller holds that agent's
// key, since an address alone is public and a token can be copied. The
// signature names this app and the time, and each one is let in once, so a
// signature made for another app, or seen on the wire, opens nothing here. Then
// the shared agent_pass contract answers whether the pass is still live.

import type { NextFunction, Request, Response } from 'express';
import { Keypair } from '@stellar/stellar-sdk';
import { AGENT_PASS_CONTRACT, PASS_HEADER, passIsValid, verifyPass } from '../middleware/index.ts';

export const PROOF_HEADER = 'agent-pass-proof';
const PROOF_WINDOW_SECONDS = 60;

const proofMessage = (audience: string, at: number) => Buffer.from(`agent-pass-proof:${audience}:${at}`);

/** The agent's side: sign the app it calls (its host) and the time, with its own key. */
export function signProof(agent: Keypair, audience: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  return `${nowSeconds}.${agent.sign(proofMessage(audience, nowSeconds)).toString('base64url')}`;
}

/** True when `proof` is `agent`'s signature over `audience` at a time within a minute of now. */
export function verifyProof(proof: string, agent: string, audience: string, nowSeconds = Date.now() / 1000): boolean {
  const [at, sig] = proof.split('.');
  const time = Number(at);
  if (!sig || !Number.isInteger(time) || Math.abs(nowSeconds - time) > PROOF_WINDOW_SECONDS) return false;
  try {
    return Keypair.fromPublicKey(agent).verify(proofMessage(audience, time), Buffer.from(sig, 'base64url'));
  } catch {
    return false;
  }
}

export type HonorOptions = {
  apps: string[]; // the selling apps whose passes this app accepts, by Stellar address
  audience: string; // this app's own name, the host agents call, e.g. 'reviews.example.com'; agents sign it
  contractId?: string; // the agent_pass contract; default the shared one
  isValid?: (contractId: string, app: string, agent: string) => Promise<boolean>; // for tests
};

export function honorPass(options: HonorOptions) {
  const contractId = options.contractId ?? AGENT_PASS_CONTRACT;
  const isValid = options.isValid ?? passIsValid;
  const refuse = (res: Response, error: string) => res.status(401).json({ error });
  // Proofs already let in, kept until they fall out of the time window.
  const used = new Map<string, number>();
  const firstUse = (proof: string, now: number) => {
    for (const [p, until] of used) if (until < now) used.delete(p);
    if (used.has(proof)) return false;
    used.set(proof, now + 2 * PROOF_WINDOW_SECONDS);
    return true;
  };

  return async function honorPassMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = req.get(PASS_HEADER);
    if (!token) return void refuse(res, 'No pass. Buy one at an app we honor.');
    const claims = options.apps.map((app) => verifyPass(token, app)).find(Boolean);
    if (!claims) return void refuse(res, 'Pass not signed by an app we honor, or expired.');
    const proof = req.get(PROOF_HEADER);
    if (!proof || !verifyProof(proof, claims.agent, options.audience)) {
      return void refuse(res, "No fresh signature by the pass's agent key.");
    }
    if (!firstUse(proof, Date.now() / 1000)) return void refuse(res, 'This signature was already used. Sign again.');
    let live: boolean;
    try {
      live = await isValid(contractId, claims.app, claims.agent);
    } catch (error) {
      console.error(`[honor-pass] ${new Date().toISOString()} contract check failed:`, error);
      return void res.status(502).json({ error: 'Could not reach the agent_pass contract.' });
    }
    if (!live) return void refuse(res, 'The contract has no live pass for this agent.');
    res.locals.agentPass = claims;
    next();
  };
}
