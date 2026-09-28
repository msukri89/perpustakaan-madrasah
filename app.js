let books = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("version").textContent = CONFIG.VERSION;
  document.getElementById("searchInput").addEventListener("input", renderBooks);
  document.getElementById("refreshBtn").addEventListener("click", checkBackend);
  checkBackend();
});

async function checkBackend() {
  const badge = document.getElementById("connectionStatus");
  const info = document.getElementById("resultInfo");

  badge.className = "status-badge checking";
  badge.textContent = "Memeriksa koneksi...";

  if (!CONFIG.BACKEND_URL || CONFIG.BACKEND_URL.includes("PASTE_URL")) {
    badge.className = "status-badge offline";
    badge.textContent = "Backend belum diatur";
    info.textContent = "Frontend siap. URL Apps Script belum dimasukkan ke config.js.";
    return;
  }

  try {
    const response = await fetch(CONFIG.BACKEND_URL, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) throw new Error("HTTP " + response.status);

    const data = await response.json();

    badge.className = "status-badge online";
    badge.textContent = "● Backend aktif";

    if (Array.isArray(data)) {
      books = data;
      renderBooks();
    } else {
      info.textContent = data.status || "Backend berhasil terhubung.";
    }
  } catch (error) {
    badge.className = "status-badge offline";
    badge.textContent = "● Belum terhubung";
    info.textContent = "Backend belum dapat mengambil data. Struktur API akan kita sambungkan setelah kontrak endpoint dikunci.";
    console.error(error);
  }
}

function renderBooks() {
  const grid = document.getElementById("booksGrid");
  const query = document.getElementById("searchInput").value.trim().toLowerCase();

  const filtered = books.filter(book => {
    const text = Object.values(book).join(" ").toLowerCase();
    return text.includes(query);
  });

  document.getElementById("resultInfo").textContent =
    filtered.length + " koleksi ditemukan";

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔎</div>
        <h3>Tidak ada koleksi</h3>
        <p>Coba gunakan kata pencarian yang berbeda.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(book => {
    const title = book.judul || book.title || book.nama || "Tanpa judul";
    const author = book.penulis || book.author || "-";
    const code = book.kode || book.code || "-";
    const image = book.foto || book.image || book.url || "";

    return `
      <article class="book-card">
        <div class="book-cover">
          ${image ? `<img src="${escapeHtml(image)}" alt="" style="width:100%;height:100%;object-fit:cover">` : "📖"}
        </div>
        <div class="book-info">
          <h3 class="book-title">${escapeHtml(title)}</h3>
          <p class="book-meta">Penulis: ${escapeHtml(author)}<br>Kode: ${escapeHtml(code)}</p>
        </div>
      </article>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
