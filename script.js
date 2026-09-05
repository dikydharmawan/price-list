document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("searchInput");
  const priceRow = document.getElementById("priceRow");
  const listView = document.getElementById("listView");
  const detailView = document.getElementById("detailView");
  const detailContent = document.getElementById("detailContent");
  const btnBack = document.getElementById("btnBack");

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
    return "https://wa.me/" + wa + "?text=" + encodeURIComponent(pesan);
  }

  function buatIkon(layanan) {
    return layanan.ikon.type === "img"
      ? '<img src="' +
          layanan.ikon.src +
          '" alt="' +
          escapeHtml(layanan.ikon.alt || layanan.nama + " Logo") +
          '" class="product-logo" />'
      : '<i class="' + layanan.ikon.class + '"></i>';
  }

  // Tampilan utama: grid tile sederhana, tanpa harga
  function buatTile(layanan) {
    return (
      '<div class="col-4 col-md-3 col-lg-2">' +
      '<button type="button" class="service-card service-card-grid product-' +
      escapeHtml(layanan.id) +
      ' text-center" data-id="' +
      escapeHtml(layanan.id) +
      '">' +
      '<span class="service-icon">' +
      buatIkon(layanan) +
      "</span>" +
      '<h3 class="service-name">' +
      escapeHtml(layanan.nama) +
      "</h3>" +
      '<span class="service-view-hint"><i class="bi bi-chevron-right"></i></span>' +
      "</button>" +
      "</div>"
    );
  }

  var dataSaatIni = null;
  var layananTerbuka = null;

  function renderDaftar(data) {
    dataSaatIni = data;
    const cards = (data.layanan || [])
      .map(function (layanan) {
        return buatTile(layanan);
      })
      .join("");
    priceRow.innerHTML = cards;

    // Stagger reveal: tiles fade up one by one
    const allCards = priceRow.querySelectorAll(".service-card");
    allCards.forEach(function (card, i) {
      const delay = i * 60;
      card.style.transitionDelay = delay + "ms";
      setTimeout(function () {
        card.classList.add("is-visible");
        setTimeout(function () {
          card.style.transitionDelay = "";
        }, delay + 700);
      }, 40);
    });
  }

  // Tampilan detail: harga & paket per layanan
  function renderDetail(layanan) {
    const wa = (dataSaatIni && dataSaatIni.wa) || "6283847105847";
    const grupHtml = (layanan.grup || [])
      .map(function (g) {
        const paketHtml = (g.paket || [])
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

    detailContent.innerHTML =
      '<div class="detail-card product-' +
      escapeHtml(layanan.id) +
      '">' +
      '<div class="detail-head">' +
      '<span class="service-icon">' +
      buatIkon(layanan) +
      "</span>" +
      '<h2 class="detail-title">' +
      escapeHtml(layanan.nama) +
      "</h2>" +
      "</div>" +
      grupHtml +
      "</div>";
  }

  function bukaDetail(id) {
    if (!dataSaatIni) return;
    const layanan = (dataSaatIni.layanan || []).find(function (l) {
      return String(l.id) === String(id);
    });
    if (!layanan) return;
    layananTerbuka = layanan.id;
    renderDetail(layanan);
    listView.classList.add("d-none");
    detailView.classList.remove("d-none");
    detailView.classList.add("is-visible");
    window.scrollTo({ top: 0 });
  }

  function kembaliKeDaftar() {
    layananTerbuka = null;
    detailView.classList.add("d-none");
    listView.classList.remove("d-none");
    window.scrollTo({ top: 0 });
  }

  priceRow.addEventListener("click", function (e) {
    const card = e.target.closest(".service-card-grid");
    if (card) bukaDetail(card.getAttribute("data-id"));
  });

  btnBack.addEventListener("click", kembaliKeDaftar);

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
          if (layananTerbuka !== null) {
            const layanan = (data.layanan || []).find(function (l) {
              return String(l.id) === String(layananTerbuka);
            });
            if (layanan) renderDetail(layanan);
            else kembaliKeDaftar();
          }
        }
      })
      .catch(function (err) {
        if (!lastHash) {
          priceRow.innerHTML =
            '<div class="col-12 text-center text-muted">Data gagal dimuat. Hubungi admin via WA.</div>';
        }
        console.error(err);
      });
  }

  muatDanRender();

  // Auto-refresh: cek perubahan tiap 30 detik
  setInterval(muatDanRender, 30000);

  // Refresh cepat saat tab kembali aktif / difokuskan
  window.addEventListener("focus", muatDanRender);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) muatDanRender();
  });

  // Search — listener dipasang SEKALI saja (bukan tiap render)
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

  // Scroll Animations for static sections (payment, notes, footer)
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const fadeElements = document.querySelectorAll(".fade-in-section");
  fadeElements.forEach(function (el) {
    observer.observe(el);
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