-- Modelo de datos de Cafebot: fincas (cuentas), usuarios, chats, mensajes,
-- álbumes y fotos. Persistencia en SQLite.

CREATE TABLE IF NOT EXISTS finca (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  region TEXT,
  creada_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usuario (
  id TEXT PRIMARY KEY,
  finca_id TEXT NOT NULL REFERENCES finca(id),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'admin',
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat (
  id TEXT PRIMARY KEY,
  finca_id TEXT NOT NULL REFERENCES finca(id),
  titulo TEXT NOT NULL,
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mensaje (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chat(id),
  finca_id TEXT NOT NULL REFERENCES finca(id),
  rol TEXT NOT NULL,
  contenido TEXT NOT NULL,
  sentimiento TEXT,
  intencion TEXT,
  foto_id TEXT,
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS album (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE REFERENCES chat(id),
  finca_id TEXT NOT NULL REFERENCES finca(id),
  titulo TEXT NOT NULL,
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS foto (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL REFERENCES album(id),
  chat_id TEXT NOT NULL REFERENCES chat(id),
  finca_id TEXT NOT NULL REFERENCES finca(id),
  archivo TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  mime TEXT NOT NULL,
  disease_id TEXT,
  disease_name TEXT,
  description TEXT,
  confidence REAL,
  severity TEXT,
  advice TEXT,
  detector_status TEXT NOT NULL DEFAULT 'unavailable',
  top_predictions TEXT,
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dialogo_estado (
  chat_id TEXT PRIMARY KEY REFERENCES chat(id),
  finca_id TEXT NOT NULL REFERENCES finca(id),
  foto_id TEXT REFERENCES foto(id),
  vision_inicial TEXT NOT NULL DEFAULT '{}',
  pregunta_id TEXT NOT NULL,
  pregunta_numero INTEGER NOT NULL DEFAULT 1,
  hipotesis TEXT NOT NULL,
  evidencia TEXT NOT NULL DEFAULT '[]',
  actualizado_en TEXT NOT NULL
);
