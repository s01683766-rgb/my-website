const { Client } = require('pg');

exports.handler = async function(event, context) {
  const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
  if (apiKey !== process.env.API_SECRET_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: 'SYNC REJECTED: Unauthorized' }) };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Ensure state table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS prs_app_state (
        id INT PRIMARY KEY DEFAULT 1,
        payload JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // HANDLE GET: Fetch saved state from CockroachDB when loading fresh
    if (event.httpMethod === 'GET') {
      const res = await client.query('SELECT payload FROM prs_app_state WHERE id = 1');
      await client.end();
      if (res.rows.length > 0) {
        return { 
          statusCode: 200, 
          body: JSON.stringify(res.rows[0].payload) 
        };
      }
      return { statusCode: 200, body: null };
    }

    // HANDLE POST: Save/Upsert state blob to CockroachDB
    if (event.httpMethod === 'POST') {
      await client.query(`
        UPSERT INTO prs_app_state (id, payload, updated_at) 
        VALUES (1, $1::JSONB, NOW())
      `, [event.body]);

      await client.end();
      return { statusCode: 200, body: JSON.stringify({ status: 'SYNCED TO COCKROACHDB' }) };
    }

    await client.end();
    return { statusCode: 405, body: 'Method Not Allowed' };

  } catch (err) {
    try { await client.end(); } catch(e){}
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
