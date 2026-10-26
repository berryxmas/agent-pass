// One pass, two apps. The agent buys a pass at the first app (the sample
// bookshop on Vercel, built from the published package), then calls Book
// Reviews, a second app that never took its money and holds no key.

import { Keypair } from '@stellar/stellar-sdk';
import { Mppx, stellar } from '@stellar/mpp/charge/client';
import { Receipt } from 'mppx';
import { PASS_HEADER, type PassClaims } from '../src/middleware/index.ts';
import { PROOF_HEADER, signProof } from '../src/second-app/honor.ts';

const FIRST = process.env.FIRST_APP_URL ?? 'https://agent-pass-sample.vercel.app/agent/books';
const SECOND = process.env.SECOND_APP_URL ?? 'http://localhost:4100/agent/reviews';
const agent = Keypair.fromSecret(process.env.STELLAR_SECRET!);
const tx = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
const short = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;
const show = async (label: string, res: Response) => {
  const body = await res.json();
  console.log(`   ${label}: ${res.status}  ${body.error ?? `${body.reviews.length} reviews, on the pass sold by ${short(body.pass.from)}`}`);
};

console.log(`agent ${agent.publicKey()}\n`);
console.log(`1. first app  ${FIRST}`);
const mppx = Mppx.create({
  polyfill: false,
  methods: [stellar.charge({ keypair: agent, onProgress: (e) => { if (e.type === 'challenge') console.log(`   402, paying ${e.amount} USDC to ${e.recipient}`); } })],
});
const paid = await mppx.fetch(FIRST);
const token = paid.headers.get(PASS_HEADER);
if (!paid.ok || !token) throw new Error(`first app answered ${paid.status} with no pass`);
const claims = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString()) as PassClaims;
console.log(`   paid  ${tx(Receipt.deserialize(paid.headers.get('payment-receipt')!).reference)}`);
console.log(`   pass  ${tx(claims.issue)}  (in the shared contract)`);

const host = new URL(SECOND).host;
console.log(`\n2. second app ${SECOND}  (no payment, no key of the first app)`);
await show('no pass', await fetch(SECOND));
await show('the pass, copied by someone without the agent key', await fetch(SECOND, { headers: { [PASS_HEADER]: token, [PROOF_HEADER]: signProof(Keypair.random(), host) } }));
await show('the pass + signed by the agent key', await fetch(SECOND, { headers: { [PASS_HEADER]: token, [PROOF_HEADER]: signProof(agent, host) } }));
