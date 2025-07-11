 particlesJS('particles-js', {
  particles: { number: { value: 80 }, color: { value: "#7289DA" }, 
    shape: { type: "circle" }, opacity: { value: 0.5 }, size: { value: 3 },
    line_linked: { enable: true, distance: 150, color: "#7289DA", opacity: 0.4, width: 1 },
    move: { enable: true, speed: 2 }
  },
  interactivity: {
    events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" }},
    modes: { grab: { distance: 200, line_linked: { opacity: 0.7 }}}
  },
  retina_detect: true
});
AOS.init();


async function checkLoginStatus() {
  try {
    const res = await fetch("http://localhost:5000/api/dashboard", {
      credentials: "include"
    });

    const isLoggedIn = res.ok;

    document.getElementById("dashboardLink").style.display = isLoggedIn ? "inline-block" : "none";
    document.getElementById("settingsLink").style.display = isLoggedIn ? "inline-block" : "none";
    document.getElementById("logoutBtn").style.display = isLoggedIn ? "inline-block" : "none";

    document.getElementById("loginBtn").style.display = isLoggedIn ? "none" : "inline-block";
    document.getElementById("registerBtn").style.display = isLoggedIn ? "none" : "inline-block";

  } catch (err) {
    console.error("Erreur réseau lors de la vérification de connexion", err);
  }
}

// Appelle la fonction au chargement de la page
checkLoginStatus();

function logout() {
  fetch("http://localhost:5000/api/logout", {
    credentials: "include"
  }).then(() => {
    window.location.href = "login.html";
  });
}

async function logout() {
  await fetch("http://localhost:5000/api/logout", { credentials: "include" });
  window.location.href = "login.html";
}

async function loadDashboard() {
  try {
    const res = await fetch("http://localhost:5000/api/dashboard", { credentials: "include" });
    if (!res.ok) {
      console.log("Pas connecté, mais on ne redirige pas ici");
      // window.location.href = "login.html"; // commente cette ligne pour tester
      return;
    }
    const data = await res.json();
    document.getElementById("profile").innerHTML = `
      <h3>Bienvenue, ${data.username}</h3>
      <p>🚀 Nombre de raids bloqués : ${data.raidsBlocked}</p>
    `;
  } catch (err) {
    console.error(err);
  }
}


// Appelle la fonction quand la page est prête
window.addEventListener("DOMContentLoaded", loadDashboard);

document.getElementById('homeBtn').addEventListener('click', () => {
  window.location.href = 'index.html'; // Ou la page d'accueil
});

document.getElementById("addServerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const discordServerId = document.getElementById("discordServerId").value.trim();
  const serverName = document.getElementById("serverName").value.trim();

  if (!discordServerId || !serverName) {
    document.getElementById("addServerMessage").textContent = "Tous les champs sont obligatoires.";
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // pour envoyer cookie JWT
      body: JSON.stringify({ discordServerId, name: serverName })
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById("addServerMessage").textContent = `Serveur "${data.name}" ajouté avec succès !`;
      // Optionnel : reset formulaire
      e.target.reset();
      // Optionnel : rafraîchir la liste des serveurs affichés
      loadUserServers();
    } else {
      document.getElementById("addServerMessage").textContent = data.msg || "Erreur lors de l'ajout.";
    }
  } catch (err) {
    document.getElementById("addServerMessage").textContent = "Erreur réseau.";
  }
});

async function loadUserServers() {
  try {
    const res = await fetch("http://localhost:5000/api/servers", { credentials: "include" });
    if (!res.ok) throw new Error("Non autorisé");

    const servers = await res.json();

    const container = document.getElementById("serversList");
    container.innerHTML = "";

    servers.forEach(s => {
      const div = document.createElement("div");
      div.textContent = `${s.name} (ID: ${s.discordServerId})`;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Erreur chargement serveurs", err);
  }
}

// Appelle cette fonction quand la page est chargée
window.addEventListener("DOMContentLoaded", () => {
  loadUserServers();
});
