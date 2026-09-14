const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const handler = async (event) => {
  const apiKey = event.headers['x-api-key'];
  if (apiKey !== 'CRIS_SECURE_998877') {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const client = await pool.connect();
    
    if (event.httpMethod === 'GET') {
      const result = await client.query('SELECT data FROM app_store WHERE id = 1');
      client.release();
      const data = result.rows.length > 0 ? result.rows[0].data : { users: [], accounts: [], ledger: [], editRequests: [], settings: { onlineDebitOnly: false } };
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    if (event.httpMethod === 'POST') {
      const payload = JSON.parse(event.body);
      
      await client.query(
        'INSERT INTO app_store (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1',
        [JSON.stringify(payload)]
      );
      client.release();
      return { statusCode: 200, body: JSON.stringify({ status: 'SUCCESS' }) };
    }

    client.release();
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

module.exports = { handler };
