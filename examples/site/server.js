import express from 'express';
import { agentPass } from '@nicko-ai/agent-pass';
import { byId, search } from './icons.js';
import { page } from './page.js';
import { landing } from './landing.js';

const app = express();

const gate = agentPass({
  price: process.env.AGENT_PASS_PRICE,
  ttlSeconds: Number(process.env.AGENT_PASS_TTL_SECONDS),
  appSecret: process.env.AGENT_PASS_APP_SECRET,
  mppSecretKey: process.env.AGENT_PASS_MPP_SECRET,
});
app.use('/agent', gate);
app.use('/agent-pass', gate.dashboard);

const settings = { price: process.env.AGENT_PASS_PRICE, ttlSeconds: Number(process.env.AGENT_PASS_TTL_SECONDS) };
const store = page(settings);
app.get('/', (req, res) => res.type('html').send(landing({ ...settings, host: req.get('host') })));
app.get('/marta', (_req, res) => res.type('html').send(store));
app.use(express.static(new URL('./public', import.meta.url).pathname, { maxAge: '1h' }));

function icons(req, res) {
  const found = search(req.query.q);
  const base = req.baseUrl === '/agent' || req.path.startsWith('/agent/') ? '/agent/icons' : '/icons';
  res.json({ icons: found.map(({ id, name, category }) => ({ id, name, category, svg: `${base}/${id}.svg` })) });
}

function icon(req, res) {
  const found = byId.get(req.params.id);
  if (!found) return res.status(404).json({ error: 'No icon with that name' });
  res.type('image/svg+xml').send(found.svg);
}

app.get('/api/icons', icons);
app.get('/icons/:id.svg', icon);
app.get('/agent/icons', icons);
app.get('/agent/icons/:id.svg', icon);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Agent Pass on http://localhost:${port}  (the store: /marta, the dashboard: /agent-pass)`));
