let books = [];
let currentReview = null;

document.addEventListener("DOMContentLoaded", function() {

  document.getElementById("version").textContent = CONFIG.VERSION;

  document.getElementById("searchInput").addEventListener("input", renderBooks);
  document.getElementById("refreshBtn").addEventListener("click", checkBackend);
  document.getElementById("addBookBtn").addEventListener("click", openPhotoPicker);
  document.getElementById("bookPhotoInput").addEventListener("change", handlePhotoSelected);

  document.getElementById("closeReviewBtn").addEventListener("click", closeReview);
  document.getElementById("cancelReviewBtn").addEventListener("click", closeReview);
  document.getElementById("saveReviewBtn").addEventListener("click", saveReviewedBook);

  document.getElementById("closeDetailBtn").addEventListener("click", closeDetail);
  document.getElementById("closeDetailFooterBtn").addEventListener("click", closeDetail);

  document.getElementById("detailModal").addEventListener("click", function(event) {
    if (event.target.id === "detailModal") {
      closeDetail();
    }
  });

  document.getElementById("reviewModal").addEventListener("click", function(event) {
    if (event.target.id === "reviewModal") {
      closeReview();
    }
  });

  hideUpload();
  checkBackend();
});


function openPhotoPicker() {
  const input = document.getElementById("bookPhotoInput");
  input.value = "";
  input.click();
}


function getListUrl() {
  const separator = CONFIG.BACKEND_URL.includes("?") ? "&" : "?";
  return CONFIG.BACKEND_URL + separator + "action=list";
}


async function checkBackend() {

  const badge = document.getElementById("connectionStatus");
  const info = document.getElementById("resultInfo");

  badge.className = "status-badge checking";
  badge.textContent = "Memeriksa koleksi...";

  if (!CONFIG.BACKEND_URL || CONFIG.BACKEND_URL.includes("PASTE_URL")) {
    badge.className = "status-badge offline";
    badge.textContent = "Backend belum diatur";
    info.textContent = "Frontend siap. URL Apps Script belum dimasukkan.";
    return;
  }

  try {

    const response = await fetch(getListUrl(), {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Backend gagal membaca koleksi.");
    }

    books = Array.isArray(data.books) ? data.books : [];

    badge.className = "status-badge online";
    badge.textContent = "● Backend aktif";

    renderBooks();

  } catch (error) {

    badge.className = "status-badge offline";
    badge.textContent = "● Belum terhubung";
    info.textContent = "Backend belum dapat membaca koleksi.";
    console.error(error);
  }
}


async function handlePhotoSelected(event) {

  const input = event.target;
  const file = input.files && input.files.length ? input.files[0] : null;

  if (!file) {
    hideUpload();
    input.value = "";
    return;
  }

  input.value = "";

  if (!file.type || !file.type.startsWith("image/")) {
    hideUpload();
    alert("File yang dipilih bukan foto.");
    return;
  }

  if (file.size <= 0) {
    hideUpload();
    alert("Foto kosong atau tidak dapat dibaca.");
    return;
  }

  showUpload(
    "Menyiapkan foto...",
    "Foto sedang dikompres sebelum dikirim."
  );

  try {

    const dataUrl = await compressImage(file, 1600, 0.82);

    showUpload(
      "Membaca foto dengan AI...",
      "Foto sedang disimpan dan dibaca Gemini."
    );

    const response = await fetch(CONFIG.BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "upload",
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

    if (!result.aiSuccess || !result.analysis) {
      throw new Error(
        result.aiMessage ||
        "Foto berhasil disimpan, tetapi AI gagal membaca buku."
      );
    }

    hideUpload();

    showReview(
      result.analysis,
      result.fileUrl,
      result.fileId
    );

  } catch (error) {

    hideUpload();
    console.error(error);
    alert("Proses foto gagal: " + error.message);
  }
}


function showUpload(title, message) {

  const box = document.getElementById("uploadBox");

  document.getElementById("uploadTitle").textContent = title;
  document.getElementById("uploadMessage").textContent = message;

  box.hidden = false;
  document.getElementById("addBookBtn").disabled = true;
}


function hideUpload() {

  const box = document.getElementById("uploadBox");

  if (box) {
    box.hidden = true;
  }

  const button = document.getElementById("addBookBtn");

  if (button) {
    button.disabled = false;
  }
}


function showReview(analysis, fileUrl, fileId) {

  currentReview = {
    judul: analysis.judul || "",
    penulis: analysis.penulis || "",
    penerbit: analysis.penerbit || "",
    tahun_terbit: analysis.tahun_terbit || "",
    jenis: analysis.jenis || "",
    kategori: analysis.kategori || "",
    subkategori: analysis.subkategori || "",
    confidence: analysis.confidence || "",
    catatan: analysis.catatan || "",
    fileUrl: fileUrl || "",
    fileId: fileId || ""
  };

  setValue("reviewJudul", currentReview.judul);
  setValue("reviewPenulis", currentReview.penulis);
  setValue("reviewPenerbit", currentReview.penerbit);
  setValue("reviewTahun", currentReview.tahun_terbit);
  setValue("reviewJenis", currentReview.jenis);
  setValue("reviewKategori", currentReview.kategori);
  setValue("reviewSubkategori", currentReview.subkategori);
  setValue("reviewLokasi", "");
  setValue("reviewCatatan", currentReview.catatan);

  document.getElementById("reviewConfidence").textContent =
    currentReview.confidence || "-";

  const message = document.getElementById("saveReviewMessage");
  message.hidden = true;
  message.textContent = "";
  message.className = "save-message";

  const button = document.getElementById("saveReviewBtn");
  button.disabled = false;
  button.textContent = "💾 Simpan ke Koleksi";

  const modal = document.getElementById("reviewModal");
  modal.hidden = false;
  document.body.classList.add("modal-open");

  setTimeout(function() {
    document.getElementById("reviewJudul").focus();
  }, 50);
}


function closeReview() {

  const modal = document.getElementById("reviewModal");

  modal.hidden = true;
  document.body.classList.remove("modal-open");
  currentReview = null;
}


function showDetail(book) {

  setText("detailTitle", book.judul || "Detail Buku");
  setText("detailBookTitle", book.judul || "Tanpa judul");
  setText("detailBookAuthor", book.penulis ? "Penulis: " + book.penulis : "Penulis: -");
  setText("detailBookCode", book.kode_buku || "-");
  setText("detailJenis", book.jenis || "-");
  setText("detailKategori", book.kategori || "-");
  setText("detailSubkategori", book.subkategori || "-");
  setText("detailPenerbit", book.penerbit || "-");
  setText("detailTahun", book.tahun_terbit || "-");
  setText("detailLokasi", book.lokasi_rak || "-");
  setText("detailTanggal", book.tanggal_input || "-");

  const cover = document.getElementById("detailCover");
  cover.innerHTML = "";
  cover.className = "detail-cover";

  if (book.fileId) {
    const image = document.createElement("img");

    image.src =
      "https://drive.google.com/thumbnail?id=" +
      encodeURIComponent(book.fileId) +
      "&sz=w800";

    image.alt = "Sampul " + (book.judul || "buku");
    image.loading = "eager";

    image.onerror = function() {
      cover.innerHTML = "📖";
      cover.classList.add("cover-fallback");
    };

    cover.appendChild(image);

  } else {
    cover.textContent = "📖";
    cover.classList.add("cover-fallback");
  }

  const modal = document.getElementById("detailModal");
  modal.hidden = false;
  document.body.classList.add("modal-open");
}


function closeDetail() {
  const modal = document.getElementById("detailModal");

  modal.hidden = true;

  if (document.getElementById("reviewModal").hidden) {
    document.body.classList.remove("modal-open");
  }
}


function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value == null ? "" : String(value);
  }
}


async function saveReviewedBook() {

  if (!currentReview) {
    return;
  }

  const judul = getValue("reviewJudul");

  if (!judul) {
    showSaveMessage("Judul buku wajib diisi.", true, false);
    document.getElementById("reviewJudul").focus();
    return;
  }

  const button = document.getElementById("saveReviewBtn");

  button.disabled = true;
  button.textContent = "Menyimpan...";

  showSaveMessage(
    "Menyimpan data buku ke koleksi...",
    false,
    false
  );

  try {

    const payload = {
      action: "save",
      judul: judul,
      penulis: getValue("reviewPenulis"),
      penerbit: getValue("reviewPenerbit"),
      tahun_terbit: getValue("reviewTahun"),
      jenis: getValue("reviewJenis"),
      kategori: getValue("reviewKategori"),
      subkategori: getValue("reviewSubkategori"),
      lokasi_rak: getValue("reviewLokasi"),
      fileUrl: currentReview.fileUrl,
      fileId: currentReview.fileId
    };

    const response = await fetch(CONFIG.BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Data gagal disimpan.");
    }

    showSaveMessage(
      "✓ Buku berhasil disimpan ke koleksi.",
      false,
      true
    );

    button.textContent = "✓ Tersimpan";

    setTimeout(async function() {
      closeReview();
      await checkBackend();
      alert("Alhamdulillah, buku berhasil disimpan ke koleksi.");
    }, 900);

  } catch (error) {

    console.error(error);

    showSaveMessage(
      "Gagal menyimpan: " + error.message,
      true,
      false
    );

    button.disabled = false;
    button.textContent = "💾 Simpan ke Koleksi";
  }
}


function showSaveMessage(text, isError, isSuccess) {

  const message = document.getElementById("saveReviewMessage");

  message.hidden = false;
  message.textContent = text;

  message.className =
    "save-message " +
    (isError ? "error" : isSuccess ? "success" : "");
}


function setValue(id, value) {

  const element = document.getElementById(id);

  if (element) {
    element.value = value == null ? "" : String(value);
  }
}


function getValue(id) {

  const element = document.getElementById(id);

  return element ? element.value.trim() : "";
}


function compressImage(file, maxSide, quality) {

  return new Promise(function(resolve, reject) {

    const reader = new FileReader();

    reader.onload = function() {

      const img = new Image();

      img.onload = function() {

        const scale = Math.min(
          1,
          maxSide / Math.max(img.width, img.height)
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Browser tidak dapat memproses foto."));
          return;
        }

        ctx.drawImage(
          img,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const result =
          canvas.toDataURL("image/jpeg", quality);

        if (!result || result.length < 100) {
          reject(new Error("Foto gagal diproses."));
          return;
        }

        resolve(result);
      };

      img.onerror = function() {
        reject(new Error("Foto tidak dapat dibaca."));
      };

      img.src = reader.result;
    };

    reader.onerror = function() {
      reject(new Error("Gagal membaca foto."));
    };

    reader.readAsDataURL(file);
  });
}


function renderBooks() {

  const grid = document.getElementById("booksGrid");

  const query =
    document.getElementById("searchInput")
      .value
      .trim()
      .toLowerCase();

  const filtered = books.filter(function(book) {

    const text =
      Object.values(book)
        .join(" ")
        .toLowerCase();

    return text.includes(query);
  });

  document.getElementById("resultInfo").textContent =
    filtered.length + " koleksi ditemukan";

  if (!filtered.length) {

    grid.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-icon">📚</div>' +
        '<h3>Belum ada koleksi</h3>' +
        '<p>Belum ada data buku yang sesuai dengan pencarian.</p>' +
      '</div>';

    return;
  }

  grid.innerHTML = "";

  filtered.forEach(function(book) {

    const title =
      book.judul ||
      "Tanpa judul";

    const author =
      book.penulis ||
      "-";

    const code =
      book.kode_buku ||
      "-";

    const category =
      [book.kategori, book.subkategori]
        .filter(Boolean)
        .join(" · ") || "-";

    const type =
      book.jenis ||
      "";

    const cover =
      document.createElement("div");

    cover.className = "book-cover";

    if (book.fileId) {

      const image =
        document.createElement("img");

      image.src =
        "https://drive.google.com/thumbnail?id=" +
        encodeURIComponent(book.fileId) +
        "&sz=w600";

      image.alt =
        "Sampul " + title;

      image.loading = "lazy";

      image.onerror = function() {
        cover.innerHTML = "📖";
        cover.classList.add("cover-fallback");
      };

      cover.appendChild(image);

    } else {

      cover.textContent = "📖";
      cover.classList.add("cover-fallback");
    }

    const info =
      document.createElement("div");

    info.className = "book-info";

    const titleEl =
      document.createElement("h3");

    titleEl.className = "book-title";
    titleEl.textContent = title;

    const authorEl =
      document.createElement("p");

    authorEl.className = "book-author";
    authorEl.textContent =
      "Penulis: " + author;

    const meta =
      document.createElement("p");

    meta.className = "book-meta";

    const metaParts = [
      code,
      type,
      category
    ].filter(Boolean);

    meta.textContent =
      metaParts.join(" · ");

    info.appendChild(titleEl);
    info.appendChild(authorEl);
    info.appendChild(meta);

    const card =
      document.createElement("article");

    card.className = "book-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Lihat detail " + title);

    card.addEventListener("click", function() {
      showDetail(book);
    });

    card.addEventListener("keydown", function(event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showDetail(book);
      }
    });

    card.appendChild(cover);
    card.appendChild(info);

    grid.appendChild(card);
  });
}
