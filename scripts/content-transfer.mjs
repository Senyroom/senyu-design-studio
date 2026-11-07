import fs from 'node:fs/promises';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ quiet: true });
const db = new PrismaClient();
const models = ['user', 'category', 'article', 'setting', 'media', 'contentVersion'];
const dateFields = ['createdAt', 'updatedAt', 'publishedAt', 'deletedAt'];
const [mode, filename] = process.argv.slice(2);
try {
  if (!filename || !['export', 'import'].includes(mode)) throw new Error('Usage: node scripts/content-transfer.mjs export|import <private-file.json>');
  if (mode === 'export') {
    const snapshot = { version: 1, exportedAt: new Date().toISOString(), data: {} };
    await db.$transaction(async tx => {
      for (const model of models) snapshot.data[model] = await tx[model].findMany();
    });
    await fs.writeFile(filename, JSON.stringify(snapshot), { mode: 0o600, flag: 'wx' });
    console.log(Object.fromEntries(models.map(model => [model, snapshot.data[model].length])));
  } else {
    const snapshot = JSON.parse(await fs.readFile(filename, 'utf8'));
    if (snapshot.version !== 1 || models.some(model => !Array.isArray(snapshot.data[model]))) throw new Error('Invalid content snapshot');
    await db.$transaction(async tx => {
      for (const model of models) if (await tx[model].count()) throw new Error(`Import requires empty ${model} table`);
      for (const model of models) {
        for (const original of snapshot.data[model]) {
          const row = { ...original };
          for (const field of dateFields) if (row[field]) row[field] = new Date(row[field]);
          // Omit SQL-null JSON fields so Prisma does not interpret them as JSON null.
          for (const field of ['published', 'variants']) if (row[field] === null) delete row[field];
          await tx[model].create({ data: row });
        }
      }
    }, { timeout: 60000 });
    console.log('Content imported; sessions and queued publish jobs were not transferred.');
  }
} finally {
  await db.$disconnect();
}
