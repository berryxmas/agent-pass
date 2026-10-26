// Book Reviews: a second, separate app. It sells nothing and holds no key; it
// lets in an agent that bought a pass at the sample app, Marta Icons
// (https://agent-pass-sample.vercel.app), checked against the shared contract.

import express from 'express';
import { passIsValid } from '../middleware/index.ts';
import { honorPass, type HonorOptions } from './honor.ts';

const PORT = Number(process.env.PORT ?? 4100);
/** The sample app's address (Marta Icons): it sells the passes this app honors. */
const SAMPLE_APP = 'GC3DF7VPQD6BLUYPGWVAT363AG3QORHCRY3OK4XTET6HDTMQ6MXLUNHD';

const REVIEWS = [
  { title: 'Piranesi', stars: 5, review: 'A house of endless halls, told with total calm.' },
  { title: 'Kindred', stars: 5, review: 'Time travel with no escape hatch.' },
  { title: 'The Dispossessed', stars: 4, review: 'Two worlds, argued fairly.' },
];

export function createApp(options: HonorOptions) {
  const app = express();
  app.use('/agent', honorPass(options));
  app.get('/agent/reviews', (_req, res) => {
    res.json({ reviews: REVIEWS, pass: { from: res.locals.agentPass.app, agent: res.locals.agentPass.agent } });
  });
  return app;
}

if (import.meta.main) {
  const apps = (process.env.HONOR_APPS ?? SAMPLE_APP).split(',').map((a) => a.trim()).filter(Boolean);
  const isValid = async (contractId: string, app: string, agent: string) => {
    const live = await passIsValid(contractId, app, agent);
    console.log(`agent_pass.valid(${app.slice(0, 4)}..., ${agent.slice(0, 4)}...) on ${contractId.slice(0, 4)}...: ${live}`);
    return live;
  };
  // The host agents call; behind a domain, set AUDIENCE to it.
  const audience = process.env.AUDIENCE ?? `localhost:${PORT}`;
  createApp({ apps, audience, contractId: process.env.AGENT_PASS_CONTRACT, isValid })
    .listen(PORT, () => console.log(`Book Reviews on http://localhost:${PORT}, honoring passes sold by ${apps.join(', ')}`));
}
