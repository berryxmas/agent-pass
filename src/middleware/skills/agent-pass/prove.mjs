// One real agent visit to the app's agent route, on testnet: the 402, the USDC
// payment over MPP, the pass, and a second call on the pass with no payment.
//
//   AGENT_SECRET="$(stellar keys secret <test agent>)" node prove.mjs <url> [method] [json body]
//
// The test agent's secret comes in the environment and is never printed. The
// last line is JSON with the hashes, for the skill to read.

import { Keypair } from '@stellar/stellar-sdk';
import { Mppx, stellar } from '@stellar/mpp/charge/client';
import { Receipt } from 'mppx';

const [url, method = 'GET', body] = process.argv.slice(2);
if (!url || !process.env.AGENT_SECRET) {
  console.error('usage: AGENT_SECRET="$(stellar keys secret <test agent>)" node prove.mjs <url> [method] [json body]');
  process.exit(2);
}
const init = (headers = {}) => ({
  method,
  headers: body ? { 'content-type': 'application/json', ...headers } : headers,
  ...(body ? { body } : {}),
});
const agent = Keypair.fromSecret(process.env.AGENT_SECRET);
const tx = (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

console.log(`agent  ${agent.publicKey()}`);
console.log(`${method.padEnd(6)} ${url}`);

const first = await fetch(url, init());
console.log(`\n1. ${first.status} ${first.statusText}  (no pass yet: the gate asks for payment)`);
if (first.status !== 402) {
  console.error(`expected 402 from the agent route, got ${first.status}`);
  process.exit(1);
}

let price = '';
const mppx = Mppx.create({
  polyfill: false,
  methods: [
    stellar.charge({
      keypair: agent,
      onProgress: (e) => {
        if (e.type === 'challenge') {
          price = e.amount;
          console.log(`\n2. paying ${e.amount} USDC to ${e.recipient} over MPP`);
        }
      },
    }),
  ],
});
const paid = await mppx.fetch(url, init());
const receipt = paid.headers.get('payment-receipt');
const token = paid.headers.get('agent-pass');
if (!paid.ok || !receipt || !token) {
  console.error(`expected 200 with a receipt and a pass, got ${paid.status}: ${await paid.text()}`);
  process.exit(1);
}
const payment = Receipt.deserialize(receipt).reference;
const claims = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
console.log(`   paid    ${tx(payment)}`);
console.log(`\n3. pass    signed by the app's key ${claims.app}`);
console.log(`   issued  ${tx(claims.issue)}`);
console.log(`   expires ${new Date(claims.exp * 1000).toISOString()}`);
console.log(`\n4. ${paid.status} ${paid.statusText}`);
console.log(`   ${(await paid.text()).slice(0, 300)}`);

const again = await fetch(url, init({ 'agent-pass': token }));
console.log(`\n5. with the pass, no payment: ${again.status} ${again.statusText}`);
if (!again.ok) process.exit(1);

console.log(JSON.stringify({ app: claims.app, agent: claims.agent, price, payment, issue: claims.issue, expires: claims.exp, again: again.status }));
