import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.query.secret !== process.env.SEED_SECRET) return res.status(403).end();
  const passwordHash = await bcrypt.hash('Eddyj@n786', 10);
  await kv.hset('user:ward@ch41r.com', {
    email: 'ward@ch41r.com',
    passwordHash,
    createdAt: new Date().toISOString()
  });
  res.status(200).json({ done: true });
}
