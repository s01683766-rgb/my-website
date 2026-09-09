const { Client } = require('pg');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

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
    
    // Ensure table exists in CockroachDB
    await client.query(`
      CREATE TABLE IF NOT EXISTS prs_app_state (
        id INT PRIMARY KEY DEFAULT 1,
        payload JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Upsert full state blob
    await client.query(`
      UPSERT INTO prs_app_state (id, payload, updated_at) 
      VALUES (1, $1::JSONB, NOW())
    `, [event.body]);

    await client.end();
    return { statusCode: 200, body: JSON.stringify({ status: 'SYNCED TO COCKROACHDB' }) };
  } catch (err) {
    try { await client.end(); } catch(e){}
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
