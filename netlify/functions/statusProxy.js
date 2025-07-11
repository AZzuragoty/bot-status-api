import fetch from 'node-fetch';

const BOT_URLS = {
  anti: "http://51.75.118.18:20052/status",
  gestion: "http://147.135.213.131:20117/status"
};

export async function handler(event) {
  const bot = event.queryStringParameters?.bot || "anti";
  const url = BOT_URLS[bot];

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Bot invalide" }),
    };
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Erreur HTTP: ${response.status}`
      };
    }
    const data = await response.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: data
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur proxy", details: error.message }),
    };
  }
}
