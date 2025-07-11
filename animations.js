document.addEventListener("DOMContentLoaded", () => {
  // Animation entrée du body
  document.body.classList.remove("preload");
  document.body.classList.add("loaded");

  // IntersectionObserver pour scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      } else {
        entry.target.classList.remove("visible");
      }
    });
  }, {
    threshold: 0.15
  });

  // Observer tous les éléments déjà marqués scroll-animate
  document.querySelectorAll('.scroll-animate').forEach(el => {
    observer.observe(el);
  });

  // Gestion spéciale du hero
  const hero = document.querySelector('#hero');
  if(hero) {
    setTimeout(() => {
      hero.classList.remove('stagger');
      hero.classList.add('scroll-animate');
      observer.observe(hero); // <-- observer le hero APRES avoir ajouté scroll-animate
    }, 2000);
  }
});
