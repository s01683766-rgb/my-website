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
      const data = result.rows.length > 0 ? result.rows[0].data : { users: [], accounts: [], fds: [], ledger: [], editRequests: [] };
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      
      // Handle full sync fallback
      if (body.action === 'FULL_SYNC' || !body.action) {
        const payloadData = body.action === 'FULL_SYNC' ? body.data : body;
        await client.query(
          'INSERT INTO app_store (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1',
          [JSON.stringify(payloadData)]
        );
        client.release();
        return { statusCode: 200, body: JSON.stringify({ status: 'SUCCESS', mode: 'FULL' }) };
      }

      // Handle Live Feed-Based Row Updates (Bank/LIC Grade)
      const resCurrent = await client.query('SELECT data FROM app_store WHERE id = 1');
      let dbState = resCurrent.rows.length > 0 ? resCurrent.rows[0].data : { users: [], accounts: [], fds: [], ledger: [], editRequests: [] };
      
      if (!dbState.accounts) dbState.accounts = [];
      if (!dbState.ledger) dbState.ledger = [];
      if (!dbState.fds) dbState.fds = [];
      if (!dbState.users) dbState.users = [];

      if (body.action === 'ADD_TXN') {
        const { accNo, amount, txType, purpose, narrative, operator } = body;
        const acc = dbState.accounts.find(a => a.accountNumber === accNo);
        if (acc) {
          if (txType === 'CR') acc.balance += parseFloat(amount);
          if (txType === 'DR') acc.balance -= parseFloat(amount);
        }
        dbState.ledger.unshift({
          seq: dbState.ledger.length + 1,
          timestamp: new Date().toLocaleTimeString(),
          accNo,
          type: txType,
          amount: parseFloat(amount),
          operator,
          narrative: `${purpose}: ${narrative}`
        });
      } else if (body.action === 'ADD_ACC') {
        dbState.accounts.push(body.account);
        dbState.ledger.unshift({
          seq: dbState.ledger.length + 1,
          timestamp: new Date().toLocaleTimeString(),
          accNo: body.account.accountNumber,
          type: 'ACC_OPEN',
          amount: 0,
          operator: body.operator,
          narrative: 'ACCOUNT OPENED'
        });
      }

      await client.query(
        'INSERT INTO app_store (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1',
        [JSON.stringify(dbState)]
      );
      client.release();
      return { statusCode: 200, body: JSON.stringify({ status: 'SUCCESS', mode: 'FEED', db: dbState }) };
    }

    client.release();
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

module.exports = { handler };
