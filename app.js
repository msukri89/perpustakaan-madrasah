let books = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("version").textContent = CONFIG.VERSION;
  document.getElementById("searchInput").addEventListener("input", renderBooks);
  document.getElementById("refreshBtn").addEventListener("click", checkBackend);
  document.getElementById("addBookBtn").addEventListener("click", () => {
    document.getElementById("bookPhotoInput").click();
  });
  document.getElementById("bookPhotoInput").addEventListener("change", handlePhotoSelected);
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
    info.textContent = "Frontend siap. URL Apps Script belum dimasukkan.";
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
    info.textContent = "Backend belum dapat diakses.";
    console.error(error);
  }
}

async function handlePhotoSelected(event) {
  const file = event.target.files[0];
  event.target.value = "";

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("File yang dipilih bukan foto.");
    return;
  }

  showUpload("Menyiapkan foto...", "Foto sedang dikompres sebelum dikirim.");

  try {
    const dataUrl = await compressImage(file, 1600, 0.82);

    showUpload("Mengunggah foto...", "Mengirim foto ke Google Drive.");

    const response = await fetch(CONFIG.BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        image: dataUrl,
        filename: "BUKU_" + Date.now() + ".jpg"
      })
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Upload gagal.");
    }

    hideUpload();
    alert("Alhamdulillah! Foto berhasil disimpan ke FOTO KOLEKSI.");
  } catch (error) {
    hideUpload();
    console.error(error);
    alert("Upload gagal: " + error.message);
  }
}

function showUpload(title, message) {
  document.getElementById("uploadTitle").textContent = title;
  document.getElementById("uploadMessage").textContent = message;
  document.getElementById("uploadBox").hidden = false;
  document.getElementById("addBookBtn").disabled = true;
}

function hideUpload() {
  document.getElementById("uploadBox").hidden = true;
  document.getElementById("addBookBtn").disabled = false;
}

function compressImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
      img.src = reader.result;
    };

    reader.onerror = () => reject(new Error("Gagal membaca foto."));
    reader.readAsDataURL(file);
  });
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
        <h3>Belum ada koleksi</h3>
        <p>Belum ada data buku yang ditampilkan.</p>
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
