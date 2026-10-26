import express from 'express';
import { agentPass } from '@nicko-ai/agent-pass';

const BOOKS = [
  { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', price: 12.5, inStock: true },
  { title: 'Piranesi', author: 'Susanna Clarke', price: 11.0, inStock: true },
  { title: 'The Dispossessed', author: 'Ursula K. Le Guin', price: 10.5, inStock: false },
  { title: 'Kindred', author: 'Octavia E. Butler', price: 13.0, inStock: true },
];

const app = express();

const gate = agentPass({
  price: process.env.AGENT_PASS_PRICE,
  ttlSeconds: Number(process.env.AGENT_PASS_TTL_SECONDS),
  appSecret: process.env.AGENT_PASS_APP_SECRET,
  mppSecretKey: process.env.AGENT_PASS_MPP_SECRET,
});
app.use('/agent', gate);
app.use('/agent-pass', gate.dashboard);

app.get('/', (_req, res) => res.type('html').send('<h1>Bookshop</h1><p>Used books, fair prices.</p><a href="/api/books">Catalogue</a>'));

function books(req, res) {
  const q = String(req.query.q ?? '').toLowerCase();
  res.json({ books: BOOKS.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) });
}

app.get('/api/books', books);
app.get('/agent/books', books);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Bookshop on http://localhost:${port}`));
