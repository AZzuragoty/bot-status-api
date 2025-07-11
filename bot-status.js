const antiRaidUrl = "http://51.75.118.18:20052/status";
const gestionUrl = "http://147.135.213.131:20117/status";

async function fetchBotStatus(url, statusId, guildsId, usersId) {
  const statusElem = document.getElementById(statusId);
  const guildsElem = document.getElementById(guildsId);
  const usersElem = document.getElementById(usersId);
  const statusDot = statusElem.querySelector('.status-dot');

  if (!statusElem || !guildsElem || !usersElem) return;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    if (data.online) {
      statusDot.className = 'status-dot status-online';
      statusElem.childNodes[1].nodeValue = ' En ligne';
      guildsElem.textContent = data.guilds || 0;
      usersElem.textContent = data.users || 0;
    } else {
      statusDot.className = 'status-dot status-offline';
      statusElem.childNodes[1].nodeValue = ' Hors ligne';
      guildsElem.textContent = "-";
      usersElem.textContent = "-";
    }
  } catch (error) {
    statusDot.className = 'status-dot status-offline';
    statusElem.childNodes[1].nodeValue = ' Impossible de contacter';
    guildsElem.textContent = "-";
    usersElem.textContent = "-";
    console.error(`Erreur fetch status ${url}:`, error);
  }
}

function updateAll() {
  fetchBotStatus(antiRaidUrl, "bot-status-anti", "bot-guilds-anti", "bot-users-anti");
  fetchBotStatus(gestionUrl, "bot-status-gestion", "bot-guilds-gestion", "bot-users-gestion");
}

window.addEventListener("DOMContentLoaded", () => {
  updateAll();
  setInterval(updateAll, 30000);
});
