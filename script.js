document.addEventListener("DOMContentLoaded", function () {
  // Search Functionality
  const searchInput = document.getElementById("searchInput");
  const serviceCards = document.querySelectorAll(".service-card");

  searchInput.addEventListener("input", function (e) {
    const searchTerm = e.target.value.toLowerCase();

    serviceCards.forEach((card) => {
      const serviceName = card
        .querySelector(".service-name")
        .textContent.toLowerCase();
      const parentCol = card.parentElement;

      if (serviceName.includes(searchTerm)) {
        parentCol.style.display = "block";
        // Add animation for reappearing items
        card.style.animation = "fadeIn 0.5s ease forwards";
      } else {
        parentCol.style.display = "none";
      }
    });
  });

  // Back to Top Button
  const backToTopBtn = document.getElementById("backToTop");

  const scrollBar = document.getElementById("scrollProgress");
  function updateScrollProgress() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    scrollBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
  }

  window.addEventListener("scroll", function () {
    if (window.scrollY > 300) {
      backToTopBtn.style.display = "flex";
    } else {
      backToTopBtn.style.display = "none";
    }
    updateScrollProgress();
  });
  updateScrollProgress();

  backToTopBtn.addEventListener("click", function () {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  // Cursor Glow Follower
  const cursorGlow = document.createElement("div");
  cursorGlow.className = "cursor-glow";
  document.body.appendChild(cursorGlow);

  window.addEventListener("mousemove", function (e) {
    cursorGlow.style.transform =
      "translate3d(" + (e.clientX - 220) + "px," + (e.clientY - 220) + "px,0)";
  });

  // Scroll Animations
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        // Stagger reveal: cards fade up one by one
        const cards = entry.target.querySelectorAll(".service-card");
        cards.forEach((card, i) => {
          const delay = i * 90;
          card.style.transitionDelay = delay + "ms";
          setTimeout(() => {
            card.classList.add("is-visible");
            setTimeout(() => {
              card.style.transitionDelay = "";
            }, delay + 700);
          }, 40);
        });
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const fadeElements = document.querySelectorAll(".fade-in-section");
  fadeElements.forEach((el) => observer.observe(el));

  // Navbar Active State
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav-link");

  window.addEventListener("scroll", () => {
    let current = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (pageYOffset >= sectionTop - 200) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href").includes(current)) {
        link.classList.add("active");
      }
    });
  });
});

// Add keyframes for search animation
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(styleSheet);
