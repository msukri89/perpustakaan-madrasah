let books = [];
let currentReview = null;
let currentBook = null;
let scannerStream = null;
let scannerFacingMode = "environment";
let editorImage = null;
let editorSourceWidth = 0;
let editorSourceHeight = 0;
let editorDisplayScale = 1;
let editorCorners = null;
let editorDraggingCorner = null;

document.addEventListener("DOMContentLoaded", function() {

  document.getElementById("version").textContent = CONFIG.VERSION;

  document.getElementById("searchInput").addEventListener("input", renderBooks);
  document.getElementById("categoryFilter").addEventListener("change", renderBooks);
  document.getElementById("typeFilter").addEventListener("change", renderBooks);
  document.getElementById("resetFilterBtn").addEventListener("click", resetFilters);
  document.getElementById("refreshBtn").addEventListener("click", checkBackend);
  document.getElementById("addBookBtn").addEventListener("click", openPhotoOptions);
  document.getElementById("bookPhotoInput").addEventListener("change", handlePhotoSelected);

  document.getElementById("closeScannerBtn").addEventListener("click", closeScanner);
  document.getElementById("chooseFileBtn").addEventListener("click", chooseFileFromScanner);
  document.getElementById("capturePhotoBtn").addEventListener("click", captureScannerPhoto);
  document.getElementById("switchCameraBtn").addEventListener("click", switchScannerCamera);

  document.getElementById("closePhotoEditorBtn").addEventListener("click", closePhotoEditor);
  document.getElementById("cancelPhotoEditorBtn").addEventListener("click", closePhotoEditor);
  document.getElementById("resetCropBtn").addEventListener("click", resetCropCorners);
  document.getElementById("useEditedPhotoBtn").addEventListener("click", useEditedPhoto);

  document.querySelectorAll(".crop-handle").forEach(function(handle) {
    handle.addEventListener("pointerdown", startCropDrag);
  });

  document.getElementById("photoEditorStage").addEventListener("pointermove", moveCropDrag);
  document.getElementById("photoEditorStage").addEventListener("pointerup", endCropDrag);
  document.getElementById("photoEditorStage").addEventListener("pointercancel", endCropDrag);

  document.getElementById("scannerModal").addEventListener("click", function(event) {
    if (event.target.id === "scannerModal") {
      closeScanner();
    }
  });

  document.getElementById("closeReviewBtn").addEventListener("click", closeReview);
  document.getElementById("cancelReviewBtn").addEventListener("click", closeReview);
  document.getElementById("saveReviewBtn").addEventListener("click", saveReviewedBook);

  document.getElementById("closeDetailBtn").addEventListener("click", closeDetail);
  document.getElementById("closeDetailFooterBtn").addEventListener("click", closeDetail);
  document.getElementById("editBookBtn").addEventListener("click", openEditBook);
  document.getElementById("closeEditBtn").addEventListener("click", closeEdit);
  document.getElementById("cancelEditBtn").addEventListener("click", closeEdit);
  document.getElementById("saveEditBtn").addEventListener("click", saveEditedBook);

  document.getElementById("detailModal").addEventListener("click", function(event) {
    if (event.target.id === "detailModal") {
      closeDetail();
    }
  });

  document.getElementById("editModal").addEventListener("click", function(event) {
    if (event.target.id === "editModal") {
      closeEdit();
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


async function openPhotoOptions() {

  const modal = document.getElementById("scannerModal");
  modal.hidden = false;
  document.body.classList.add("modal-open");

  await startScannerCamera();
}


function openPhotoPicker() {

  const input = document.getElementById("bookPhotoInput");

  input.value = "";
  input.click();
}


function chooseFileFromScanner() {

  closeScanner();
  openPhotoPicker();
}


async function startScannerCamera() {

  stopScannerCamera();

  const video = document.getElementById("scannerVideo");
  const message = document.getElementById("scannerCameraMessage");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

    message.hidden = false;
    message.textContent =
      "Kamera tidak tersedia di browser ini. Gunakan tombol Pilih dari HP.";

    document.getElementById("capturePhotoBtn").disabled = true;
    document.getElementById("switchCameraBtn").disabled = true;
    return;
  }

  try {

    scannerStream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: scannerFacingMode
          },
          width: {
            ideal: 1280,
            max: 1920
          },
          height: {
            ideal: 720,
            max: 1080
          },
          frameRate: {
            ideal: 24,
            max: 30
          }
        },
        audio: false
      });

    video.srcObject = scannerStream;

    message.hidden = true;
    document.getElementById("capturePhotoBtn").disabled = false;
    document.getElementById("switchCameraBtn").disabled = false;

  } catch (error) {

    console.error(error);

    message.hidden = false;
    message.textContent =
      "Kamera tidak dapat dibuka. Izinkan akses kamera atau gunakan Pilih dari HP.";

    document.getElementById("capturePhotoBtn").disabled = true;
  }
}


function stopScannerCamera() {

  if (scannerStream) {

    scannerStream.getTracks().forEach(function(track) {
      track.stop();
    });

    scannerStream = null;
  }

  const video = document.getElementById("scannerVideo");

  if (video) {
    video.srcObject = null;
  }
}


function closeScanner() {

  stopScannerCamera();

  const modal = document.getElementById("scannerModal");

  if (modal) {
    modal.hidden = true;
  }

  if (
    document.getElementById("reviewModal").hidden &&
    document.getElementById("detailModal").hidden &&
    document.getElementById("editModal").hidden
  ) {
    document.body.classList.remove("modal-open");
  }
}


async function switchScannerCamera() {

  scannerFacingMode =
    scannerFacingMode === "environment"
      ? "user"
      : "environment";

  await startScannerCamera();
}


async function captureScannerPhoto() {

  const video =
    document.getElementById("scannerVideo");

  if (
    !scannerStream ||
    !video.videoWidth ||
    !video.videoHeight
  ) {
    return;
  }

  const canvas =
    document.createElement("canvas");

  const maxSide = 1800;

  const scale =
    Math.min(
      1,
      maxSide /
        Math.max(
          video.videoWidth,
          video.videoHeight
        )
    );

  canvas.width =
    Math.round(
      video.videoWidth * scale
    );

  canvas.height =
    Math.round(
      video.videoHeight * scale
    );

  const context =
    canvas.getContext(
      "2d",
      { alpha: false }
    );

  context.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  canvas.toBlob(
    async function(blob) {

      if (!blob) {
        alert("Foto tidak berhasil dibuat.");
        return;
      }

      closeScanner();

      await openPhotoEditor(
        blob,
        "BUKU_SCAN_" + Date.now() + ".jpg"
      );

    },
    "image/jpeg",
    0.90
  );
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

    updateDashboardStats();
    updateFilterOptions();

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
  const file =
    input.files && input.files.length
      ? input.files[0]
      : null;

  input.value = "";

  if (!file) {
    hideUpload();
    return;
  }

  await openPhotoEditor(
    file,
    file.name || ("BUKU_" + Date.now() + ".jpg")
  );
}


async function processPhotoFile(file, filename) {

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

    const dataUrl =
      await compressImage(
        file,
        1600,
        0.82
      );

    showUpload(
      "Membaca foto dengan AI...",
      "Foto sedang disimpan dan dibaca Gemini."
    );

    const response =
      await fetch(
        CONFIG.BACKEND_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },
          body: JSON.stringify({
            action: "upload",
            image: dataUrl,
            filename:
              filename ||
              ("BUKU_" + Date.now() + ".jpg")
          })
        }
      );

    if (!response.ok) {
      throw new Error(
        "HTTP " + response.status
      );
    }

    const result =
      await response.json();

    if (!result.success) {

      throw new Error(
        result.message ||
        "Upload gagal."
      );
    }

    if (
      !result.aiSuccess ||
      !result.analysis
    ) {

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

    alert(
      "Proses foto gagal: " +
      error.message
    );
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

  currentBook = book;

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

  if (
    document.getElementById("reviewModal").hidden &&
    document.getElementById("editModal").hidden
  ) {
    document.body.classList.remove("modal-open");
  }
}


function openEditBook() {

  if (!currentBook) {
    return;
  }

  setValue("editJudul", currentBook.judul);
  setValue("editPenulis", currentBook.penulis);
  setValue("editPenerbit", currentBook.penerbit);
  setValue("editTahun", currentBook.tahun_terbit);
  setValue("editJenis", currentBook.jenis);
  setValue("editKategori", currentBook.kategori);
  setValue("editSubkategori", currentBook.subkategori);
  setValue("editLokasi", currentBook.lokasi_rak);

  const message = document.getElementById("editMessage");
  message.hidden = true;
  message.textContent = "";
  message.className = "save-message";

  document.getElementById("saveEditBtn").disabled = false;
  document.getElementById("saveEditBtn").textContent = "💾 Simpan Perubahan";

  document.getElementById("detailModal").hidden = true;
  document.getElementById("editModal").hidden = false;
  document.body.classList.add("modal-open");

  setTimeout(function() {
    document.getElementById("editJudul").focus();
  }, 50);
}


function closeEdit() {

  document.getElementById("editModal").hidden = true;

  if (document.getElementById("reviewModal").hidden) {
    document.body.classList.remove("modal-open");
  }
}


async function saveEditedBook() {

  if (!currentBook || !currentBook.id) {
    return;
  }

  const judul = getValue("editJudul");

  if (!judul) {
    showEditMessage("Judul buku wajib diisi.", true, false);
    document.getElementById("editJudul").focus();
    return;
  }

  const button = document.getElementById("saveEditBtn");

  button.disabled = true;
  button.textContent = "Menyimpan...";

  showEditMessage(
    "Menyimpan perubahan ke koleksi...",
    false,
    false
  );

  try {

    const payload = {
      action: "update",
      id: currentBook.id,
      judul: judul,
      penulis: getValue("editPenulis"),
      penerbit: getValue("editPenerbit"),
      tahun_terbit: getValue("editTahun"),
      jenis: getValue("editJenis"),
      kategori: getValue("editKategori"),
      subkategori: getValue("editSubkategori"),
      lokasi_rak: getValue("editLokasi")
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
      throw new Error(result.message || "Perubahan gagal disimpan.");
    }

    showEditMessage(
      "✓ Perubahan berhasil disimpan.",
      false,
      true
    );

    button.textContent = "✓ Tersimpan";

    setTimeout(async function() {
      closeEdit();
      currentBook = null;
      await checkBackend();
      alert("Alhamdulillah, perubahan buku berhasil disimpan.");
    }, 800);

  } catch (error) {

    console.error(error);

    showEditMessage(
      "Gagal menyimpan: " + error.message,
      true,
      false
    );

    button.disabled = false;
    button.textContent = "💾 Simpan Perubahan";
  }
}


function showEditMessage(text, isError, isSuccess) {

  const message = document.getElementById("editMessage");

  message.hidden = false;
  message.textContent = text;

  message.className =
    "save-message " +
    (isError ? "error" : isSuccess ? "success" : "");
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


async function openPhotoEditor(blob, filename) {

  const modal =
    document.getElementById("photoEditorModal");

  const canvas =
    document.getElementById("photoEditorCanvas");

  const image =
    new Image();

  const objectUrl =
    URL.createObjectURL(blob);

  image.onload = function() {

    URL.revokeObjectURL(objectUrl);

    const sourceMaxSide = 1800;

    const sourceScale =
      Math.min(
        1,
        sourceMaxSide /
          Math.max(
            image.naturalWidth,
            image.naturalHeight
          )
      );

    const sourceCanvas =
      document.createElement("canvas");

    editorSourceWidth =
      Math.max(
        1,
        Math.round(
          image.naturalWidth *
          sourceScale
        )
      );

    editorSourceHeight =
      Math.max(
        1,
        Math.round(
          image.naturalHeight *
          sourceScale
        )
      );

    sourceCanvas.width =
      editorSourceWidth;

    sourceCanvas.height =
      editorSourceHeight;

    sourceCanvas
      .getContext(
        "2d",
        { alpha: false }
      )
      .drawImage(
        image,
        0,
        0,
        editorSourceWidth,
        editorSourceHeight
      );

    editorImage =
      sourceCanvas;

    const maxWidth = 1000;
    const maxHeight = 720;

    editorDisplayScale =
      Math.min(
        1,
        maxWidth / editorSourceWidth,
        maxHeight / editorSourceHeight
      );

    canvas.width =
      Math.max(
        1,
        Math.round(
          editorSourceWidth *
          editorDisplayScale
        )
      );

    canvas.height =
      Math.max(
        1,
        Math.round(
          editorSourceHeight *
          editorDisplayScale
        )
      );

    const context =
      canvas.getContext(
        "2d",
        { alpha: false }
      );

    context.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    editorCorners = {
      tl: {
        x: canvas.width * 0.08,
        y: canvas.height * 0.08
      },
      tr: {
        x: canvas.width * 0.92,
        y: canvas.height * 0.08
      },
      br: {
        x: canvas.width * 0.92,
        y: canvas.height * 0.92
      },
      bl: {
        x: canvas.width * 0.08,
        y: canvas.height * 0.92
      }
    };

    modal.dataset.filename =
      filename ||
      ("BUKU_" + Date.now() + ".jpg");

    modal.hidden = false;
    document.body.classList.add("modal-open");

    requestAnimationFrame(
      updateCropEditorUI
    );
  };

  image.onerror = function() {

    URL.revokeObjectURL(objectUrl);

    alert(
      "Foto tidak dapat dibuka untuk diedit."
    );
  };

  image.src = objectUrl;
}


function closePhotoEditor() {

  const modal =
    document.getElementById(
      "photoEditorModal"
    );

  modal.hidden = true;

  editorImage = null;
  editorCorners = null;
  editorDraggingCorner = null;

  if (
    document.getElementById("reviewModal").hidden &&
    document.getElementById("detailModal").hidden &&
    document.getElementById("editModal").hidden &&
    document.getElementById("scannerModal").hidden
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}


function resetCropCorners() {

  if (!editorCorners) {
    return;
  }

  const canvas =
    document.getElementById(
      "photoEditorCanvas"
    );

  editorCorners = {
    tl: {
      x: canvas.width * 0.08,
      y: canvas.height * 0.08
    },
    tr: {
      x: canvas.width * 0.92,
      y: canvas.height * 0.08
    },
    br: {
      x: canvas.width * 0.92,
      y: canvas.height * 0.92
    },
    bl: {
      x: canvas.width * 0.08,
      y: canvas.height * 0.92
    }
  };

  updateCropEditorUI();
}


function startCropDrag(event) {

  event.preventDefault();

  editorDraggingCorner =
    event.currentTarget.dataset.corner;

  event.currentTarget.setPointerCapture(
    event.pointerId
  );

  updateCropPointFromPointer(event);
}


function moveCropDrag(event) {

  if (!editorDraggingCorner) {
    return;
  }

  updateCropPointFromPointer(event);
}


function endCropDrag() {

  editorDraggingCorner = null;
}


function updateCropPointFromPointer(event) {

  if (
    !editorCorners ||
    !editorDraggingCorner
  ) {
    return;
  }

  const canvas =
    document.getElementById(
      "photoEditorCanvas"
    );

  const rect =
    canvas.getBoundingClientRect();

  let x =
    event.clientX -
    rect.left;

  let y =
    event.clientY -
    rect.top;

  x =
    Math.max(
      6,
      Math.min(
        rect.width - 6,
        x
      )
    );

  y =
    Math.max(
      6,
      Math.min(
        rect.height - 6,
        y
      )
    );

  editorCorners[
    editorDraggingCorner
  ] = {
    x:
      x *
      canvas.width /
      rect.width,

    y:
      y *
      canvas.height /
      rect.height
  };

  updateCropEditorUI();
}


function updateCropEditorUI() {

  if (!editorCorners) {
    return;
  }

  const canvas =
    document.getElementById(
      "photoEditorCanvas"
    );

  const stage =
    document.getElementById(
      "photoEditorStage"
    );

  const canvasRect =
    canvas.getBoundingClientRect();

  const stageRect =
    stage.getBoundingClientRect();

  const sx =
    canvasRect.width /
    canvas.width;

  const sy =
    canvasRect.height /
    canvas.height;

  const points = {};

  Object.keys(editorCorners)
    .forEach(function(key) {

      points[key] = {
        x:
          editorCorners[key].x *
          sx +
          canvasRect.left -
          stageRect.left,

        y:
          editorCorners[key].y *
          sy +
          canvasRect.top -
          stageRect.top
      };

    });

  const polygon =
    document.getElementById(
      "cropPolygon"
    );

  polygon.style.width =
    stageRect.width + "px";

  polygon.style.height =
    stageRect.height + "px";

  polygon.style.left = "0";
  polygon.style.top = "0";

  polygon.style.clipPath =
    "polygon(" +
      points.tl.x + "px " + points.tl.y + "px," +
      points.tr.x + "px " + points.tr.y + "px," +
      points.br.x + "px " + points.br.y + "px," +
      points.bl.x + "px " + points.bl.y + "px)";

  document.querySelectorAll(
    ".crop-handle"
  ).forEach(function(handle) {

    const point =
      points[
        handle.dataset.corner
      ];

    handle.style.left =
      point.x + "px";

    handle.style.top =
      point.y + "px";

  });
}


async function useEditedPhoto() {

  if (
    !editorImage ||
    !editorCorners
  ) {
    return;
  }

  const button =
    document.getElementById(
      "useEditedPhotoBtn"
    );

  button.disabled = true;
  button.textContent =
    "Memproses...";

  try {

    const outputBlob =
      await createPerspectiveCrop();

    if (!outputBlob) {
      throw new Error(
        "Hasil crop tidak berhasil dibuat."
      );
    }

    const modal =
      document.getElementById(
        "photoEditorModal"
      );

    const filename =
      modal.dataset.filename ||
      ("BUKU_" + Date.now() + ".jpg");

    closePhotoEditor();

    await processPhotoFile(
      outputBlob,
      filename
    );

  } catch (error) {

    console.error(error);

    alert(
      "Foto belum dapat dirapikan: " +
      error.message
    );

  } finally {

    button.disabled = false;
    button.textContent =
      "✓ Gunakan Foto";
  }
}


function createPerspectiveCrop() {

  return new Promise(function(resolve) {

    const sourceCanvas =
      document.createElement("canvas");

    sourceCanvas.width =
      editorSourceWidth;

    sourceCanvas.height =
      editorSourceHeight;

    const sourceContext =
      sourceCanvas.getContext(
        "2d",
        { alpha: false }
      );

    sourceContext.drawImage(
      editorImage,
      0,
      0,
      editorSourceWidth,
      editorSourceHeight
    );

    const scale =
      editorDisplayScale;

    const sourceCorners = [
      {
        x: editorCorners.tl.x / scale,
        y: editorCorners.tl.y / scale
      },
      {
        x: editorCorners.tr.x / scale,
        y: editorCorners.tr.y / scale
      },
      {
        x: editorCorners.br.x / scale,
        y: editorCorners.br.y / scale
      },
      {
        x: editorCorners.bl.x / scale,
        y: editorCorners.bl.y / scale
      }
    ];

    const topWidth =
      distance(
        sourceCorners[0],
        sourceCorners[1]
      );

    const bottomWidth =
      distance(
        sourceCorners[3],
        sourceCorners[2]
      );

    const leftHeight =
      distance(
        sourceCorners[0],
        sourceCorners[3]
      );

    const rightHeight =
      distance(
        sourceCorners[1],
        sourceCorners[2]
      );

    const baseWidth =
      Math.max(
        topWidth,
        bottomWidth
      );

    const baseHeight =
      Math.max(
        leftHeight,
        rightHeight
      );

    if (
      baseWidth < 50 ||
      baseHeight < 50
    ) {
      resolve(null);
      return;
    }

    const ratio =
      baseHeight /
      baseWidth;

    const outputWidth =
      Math.min(
        1400,
        Math.max(
          500,
          Math.round(baseWidth)
        )
      );

    const outputHeight =
      Math.min(
        1900,
        Math.max(
          600,
          Math.round(
            outputWidth * ratio
          )
        )
      );

    const outputCanvas =
      document.createElement("canvas");

    outputCanvas.width =
      outputWidth;

    outputCanvas.height =
      outputHeight;

    const outputContext =
      outputCanvas.getContext(
        "2d",
        { alpha: false }
      );

    /*
     * Kita membutuhkan transformasi KEBALIKAN:
     *
     * output (persegi panjang hasil)
     *              ↓
     * source (4 sudut foto asli)
     *
     * Sebelumnya transformasi dibuat dari
     * source -> output tetapi kemudian dipakai
     * seolah-olah output -> source. Akibatnya
     * sampling gambar salah dan hasil foto bisa
     * hanya mengambil sebagian area, misalnya
     * judul hanya terbaca "KISA".
     */
    const homography =
      solveHomography(
        [
          { x: 0, y: 0 },
          { x: outputWidth, y: 0 },
          { x: outputWidth, y: outputHeight },
          { x: 0, y: outputHeight }
        ],
        sourceCorners
      );

    const imageData =
      sourceContext.getImageData(
        0,
        0,
        editorSourceWidth,
        editorSourceHeight
      );

    const outputData =
      outputContext.createImageData(
        outputWidth,
        outputHeight
      );

    const source =
      imageData.data;

    const target =
      outputData.data;

    for (
      let y = 0;
      y < outputHeight;
      y++
    ) {

      for (
        let x = 0;
        x < outputWidth;
        x++
      ) {

        const denominator =
          homography[6] * x +
          homography[7] * y +
          1;

        const sx =
          (
            homography[0] * x +
            homography[1] * y +
            homography[2]
          ) /
          denominator;

        const sy =
          (
            homography[3] * x +
            homography[4] * y +
            homography[5]
          ) /
          denominator;

        const x0 =
          Math.floor(sx);

        const y0 =
          Math.floor(sy);

        const x1 =
          x0 + 1;

        const y1 =
          y0 + 1;

        const fx =
          sx - x0;

        const fy =
          sy - y0;

        const outIndex =
          (
            y *
            outputWidth +
            x
          ) * 4;

        if (
          x0 < 0 ||
          y0 < 0 ||
          x1 >= editorSourceWidth ||
          y1 >= editorSourceHeight
        ) {

          target[outIndex] = 255;
          target[outIndex + 1] = 255;
          target[outIndex + 2] = 255;
          target[outIndex + 3] = 255;

          continue;
        }

        const i00 =
          (
            y0 *
            editorSourceWidth +
            x0
          ) * 4;

        const i10 =
          (
            y0 *
            editorSourceWidth +
            x1
          ) * 4;

        const i01 =
          (
            y1 *
            editorSourceWidth +
            x0
          ) * 4;

        const i11 =
          (
            y1 *
            editorSourceWidth +
            x1
          ) * 4;

        for (
          let channel = 0;
          channel < 3;
          channel++
        ) {

          const top =
            source[i00 + channel] *
              (1 - fx) +
            source[i10 + channel] *
              fx;

          const bottom =
            source[i01 + channel] *
              (1 - fx) +
            source[i11 + channel] *
              fx;

          target[
            outIndex + channel
          ] =
            top *
              (1 - fy) +
            bottom *
              fy;
        }

        target[
          outIndex + 3
        ] = 255;
      }
    }

    outputContext.putImageData(
      outputData,
      0,
      0
    );

    outputCanvas.toBlob(
      function(blob) {
        resolve(blob);
      },
      "image/jpeg",
      0.90
    );
  });
}


function distance(a, b) {

  return Math.hypot(
    b.x - a.x,
    b.y - a.y
  );
}


function solveHomography(source, target) {

  const matrix = [];
  const vector = [];

  for (
    let i = 0;
    i < 4;
    i++
  ) {

    const x = source[i].x;
    const y = source[i].y;
    const X = target[i].x;
    const Y = target[i].y;

    matrix.push([
      x, y, 1,
      0, 0, 0,
      -X * x,
      -X * y
    ]);

    vector.push(X);

    matrix.push([
      0, 0, 0,
      x, y, 1,
      -Y * x,
      -Y * y
    ]);

    vector.push(Y);
  }

  return gaussianSolve(
    matrix,
    vector
  );
}


function gaussianSolve(matrix, vector) {

  const n = vector.length;

  for (
    let i = 0;
    i < n;
    i++
  ) {

    let maxRow = i;

    for (
      let row = i + 1;
      row < n;
      row++
    ) {

      if (
        Math.abs(matrix[row][i]) >
        Math.abs(matrix[maxRow][i])
      ) {
        maxRow = row;
      }
    }

    [
      matrix[i],
      matrix[maxRow]
    ] = [
      matrix[maxRow],
      matrix[i]
    ];

    [
      vector[i],
      vector[maxRow]
    ] = [
      vector[maxRow],
      vector[i]
    ];

    const pivot =
      matrix[i][i];

    if (
      Math.abs(pivot) <
      1e-12
    ) {
      throw new Error(
        "Sudut foto tidak valid."
      );
    }

    for (
      let column = i;
      column < n;
      column++
    ) {
      matrix[i][column] /=
        pivot;
    }

    vector[i] /=
      pivot;

    for (
      let row = 0;
      row < n;
      row++
    ) {

      if (row === i) {
        continue;
      }

      const factor =
        matrix[row][i];

      if (
        Math.abs(factor) <
        1e-12
      ) {
        continue;
      }

      for (
        let column = i;
        column < n;
        column++
      ) {
        matrix[row][column] -=
          factor *
          matrix[i][column];
      }

      vector[row] -=
        factor *
        vector[i];
    }
  }

  return vector;
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


function updateDashboardStats() {

  const categories = new Set();
  const types = new Set();
  const racks = new Set();

  books.forEach(function(book) {

    const category =
      String(book.kategori || "").trim();

    const type =
      String(book.jenis || "").trim();

    const rack =
      String(book.lokasi_rak || "").trim();

    if (category) {
      categories.add(category);
    }

    if (type) {
      types.add(type);
    }

    if (rack) {
      racks.add(rack);
    }
  });

  document.getElementById("statTotal").textContent =
    books.length;

  document.getElementById("statCategories").textContent =
    categories.size;

  document.getElementById("statTypes").textContent =
    types.size;

  document.getElementById("statRacks").textContent =
    racks.size;
}


function updateFilterOptions() {

  const categorySelect =
    document.getElementById("categoryFilter");

  const typeSelect =
    document.getElementById("typeFilter");

  const currentCategory =
    categorySelect.value;

  const currentType =
    typeSelect.value;

  const categories = [...new Set(
    books
      .map(function(book) {
        return String(book.kategori || "").trim();
      })
      .filter(Boolean)
  )].sort(function(a, b) {
    return a.localeCompare(b, "id");
  });

  const types = [...new Set(
    books
      .map(function(book) {
        return String(book.jenis || "").trim();
      })
      .filter(Boolean)
  )].sort(function(a, b) {
    return a.localeCompare(b, "id");
  });

  categorySelect.innerHTML =
    '<option value="">Semua Kategori</option>' +
    categories.map(function(category) {
      return '<option value="' +
        escapeHtml(category) +
        '">' +
        escapeHtml(category) +
        '</option>';
    }).join("");

  typeSelect.innerHTML =
    '<option value="">Semua Jenis</option>' +
    types.map(function(type) {
      return '<option value="' +
        escapeHtml(type) +
        '">' +
        escapeHtml(type) +
        '</option>';
    }).join("");

  if (categories.includes(currentCategory)) {
    categorySelect.value = currentCategory;
  }

  if (types.includes(currentType)) {
    typeSelect.value = currentType;
  }
}


function resetFilters() {

  document.getElementById("searchInput").value = "";
  document.getElementById("categoryFilter").value = "";
  document.getElementById("typeFilter").value = "";

  renderBooks();
}


function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function renderBooks() {

  const grid = document.getElementById("booksGrid");

  const query =
    document.getElementById("searchInput")
      .value
      .trim()
      .toLowerCase();

  const selectedCategory =
    document.getElementById("categoryFilter").value;

  const selectedType =
    document.getElementById("typeFilter").value;

  const filtered = books.filter(function(book) {

    const text =
      [
        book.judul,
        book.penulis,
        book.kode_buku,
        book.kategori,
        book.subkategori,
        book.jenis,
        book.penerbit,
        book.tahun_terbit,
        book.lokasi_rak
      ]
        .join(" ")
        .toLowerCase();

    const matchesSearch =
      !query ||
      text.includes(query);

    const matchesCategory =
      !selectedCategory ||
      book.kategori === selectedCategory;

    const matchesType =
      !selectedType ||
      book.jenis === selectedType;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesType
    );
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
