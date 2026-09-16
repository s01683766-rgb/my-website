export async function onRequest(context) {
  const { env, request } = context;

  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== 'CRIS_SECURE_998877') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { Client } = await import('pg');
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
  });

  try {
    await client.connect();

    if (request.method === 'GET') {
      const result = await client.query('SELECT data FROM app_store WHERE id = 1');
      const data = result.rows.length > 0
        ? result.rows[0].data
        : { users: [], accounts: [], ledger: [], editRequests: [], settings: { onlineDebitOnly: false } };

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'POST') {
      const payload = await request.json();

      await client.query(
        'INSERT INTO app_store (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1',
        [JSON.stringify(payload)]
      );

      return new Response(JSON.stringify({ status: 'SUCCESS' }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  } finally {
    context.waitUntil(client.end());
  }
}
