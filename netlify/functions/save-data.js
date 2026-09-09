const { Client } = require('pg');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    const { name, email } = JSON.parse(event.body);

    await client.query(
      'INSERT INTO users (name, email) VALUES ($1, $2)',
      [name, email]
    );

    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data saved successfully!' }),
    };
  } catch (error) {
    await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
