import { readFile } from 'node:fs/promises';

export async function migrate(db) {
  await db.query(await readFile(new URL('../migrations/001-platform.sql', import.meta.url), 'utf8'));
}

export function postgresDatabase(pool) {
  return {
    query: (sql, params) => pool.query(sql, params),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end()
  };
}
