const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("./database.db");

// Buat tabel kalau belum ada
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS pendaftar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      wa TEXT NOT NULL,
      umur INTEGER NOT NULL,
      asal_kota TEXT NOT NULL,
      id_game TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Simpan data pendaftar
app.post("/api/register", (req, res) => {
  const { nama, wa, umur, asal_kota, id } = req.body;

  if (!nama || !wa || !umur || !asal_kota || !id) {
    return res.status(400).json({ message: "Semua field wajib diisi." });
  }

  const umurInt = parseInt(umur, 10);
  if (Number.isNaN(umurInt) || umurInt <= 0) {
    return res.status(400).json({ message: "Umur tidak valid." });
  }

  const sql = `
    INSERT INTO pendaftar (nama, wa, umur, asal_kota, id_game)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(sql, [nama, wa, umurInt, asal_kota, id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal menyimpan data." });
    }

    res.json({
      message: "Data berhasil disimpan!",
      insertedId: this.lastID
    });
  });
});

// Middleware admin sederhana
function requireAdmin(req, res, next) {
  const password = req.headers["x-admin-password"];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Password admin salah." });
  }
  next();
}

// Ambil semua data
app.get("/api/admin/registrations", requireAdmin, (req, res) => {
  db.all("SELECT * FROM pendaftar ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal mengambil data." });
    }
    res.json(rows);
  });
});

// Hitung total data
app.get("/api/admin/stats", requireAdmin, (req, res) => {
  db.get("SELECT COUNT(*) AS total FROM pendaftar", [], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal mengambil statistik." });
    }
    res.json({ total: row.total });
  });
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
