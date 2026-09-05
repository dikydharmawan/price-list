document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("searchInput");

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  function buatTautanWa(wa, pesan) {
    return (
      "https://wa.me/" +
      wa +
      "?text=" +
      encodeURIComponent(pesan)
    );
  }

  function buatKartu(layanan, wa) {
    const ikon =
      layanan.ikon.type === "img"
        ? '<img src="' +
          layanan.ikon.src +
          '" alt="' +
          escapeHtml(layanan.ikon.alt || layanan.nama + " Logo") +
          '" class="product-logo" />'
        : '<i class="' + layanan.ikon.class + '"></i>';

    const grupHtml = layanan.grup
      .map(function (g) {
        const paketHtml = g.paket
          .map(function (p) {
            return (
              '<a href="' +
              buatTautanWa(wa, p.pesan) +
              '" class="price-btn" target="_blank" rel="noopener">' +
              escapeHtml(p.label) +
              "</a>"
            );
          })
          .join("");
        return (
          '<div class="pack-group"><p class="pack-group-title">' +
          escapeHtml(g.judul) +
          "</p>" +
          paketHtml +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="col-6 col-md-4 col-lg-3">' +
      '<div class="service-card product-' +
      escapeHtml(layanan.id) +
      ' text-center">' +
      '<div class="service-icon">' +
      ikon +
      "</div>" +
      '<h3 class="service-name">' +
      escapeHtml(layanan.nama) +
      "</h3>" +
      grupHtml +
      "</div>" +
      "</div>"
    );
  }

  function renderDaftar(data) {
    const container = document.getElementById("priceRow");
    const wa = data.wa || "6283847105847";
    const cards = (data.layanan || [])
      .map(function (layanan) {
        return buatKartu(layanan, wa);
      })
      .join("");
    container.innerHTML = cards;

    // Stagger reveal: cards fade up one by one
    const allCards = container.querySelectorAll(".service-card");
    allCards.forEach(function (card, i) {
      const delay = i * 90;
      card.style.transitionDelay = delay + "ms";
      setTimeout(function () {
        card.classList.add("is-visible");
        setTimeout(function () {
          card.style.transitionDelay = "";
        }, delay + 700);
      }, 40);
    });
  }

  // Search — listener dipasang SEKALI saja (bukan tiap render)
  var searchTermSebelumnya = "";
  searchInput.addEventListener("input", function (e) {
    const searchTerm = e.target.value.toLowerCase();
    const allCards = document.querySelectorAll("#priceRow .service-card");
    allCards.forEach(function (card) {
      const serviceName = card
        .querySelector(".service-name")
        .textContent.toLowerCase();
      const parentCol = card.parentElement;
      if (serviceName.includes(searchTerm)) {
        parentCol.style.display = "block";
        card.style.animation = "fadeIn 0.5s ease forwards";
      } else {
        parentCol.style.display = "none";
      }
    });
    searchTermSebelumnya = searchTerm;
  });

  function ambilData() {
    return fetch("api/data", { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("Gagal memuat API");
      return res.json();
    });
  }

  function ambilDataCadangan() {
    return fetch("data.json?v=" + Date.now()).then(function (res) {
      if (!res.ok) throw new Error("Gagal memuat data.json");
      return res.json();
    });
  }

  var lastHash = "";

  function muatDanRender() {
    ambilData()
      .catch(function () {
        return ambilDataCadangan();
      })
      .then(function (data) {
        var h = JSON.stringify(data);
        if (h !== lastHash) {
          lastHash = h;
          renderDaftar(data);
        }
      })
      .catch(function (err) {
        if (!lastHash) {
          document.getElementById("priceRow").innerHTML =
            '<div class="col-12 text-center text-muted">Data gagal dimuat. Hubungi admin via WA.</div>';
        }
        console.error(err);
      });
  }

  muatDanRender();

  // Auto-refresh: cek perubahan tiap 30 detik
  setInterval(muatDanRender, 30000);

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

  // Scroll Animations for static sections (payment, notes, footer)
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
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