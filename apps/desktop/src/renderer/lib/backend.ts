import { Predicate } from "effect";

export const BACKEND_URL = "http://127.0.0.1:8765";
const TOKEN_KEY = "cafebot:token";

export class BackendError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

export interface Finca {
  readonly id: string;
  readonly nombre: string;
  readonly region: string;
}

export interface Usuario {
  readonly id: string;
  readonly finca_id: string;
  readonly nombre: string;
  readonly email: string;
  readonly rol: string;
}

export interface Session {
  readonly token: string;
  readonly usuario: Usuario;
  readonly finca: Finca;
}

export interface Chat {
  readonly id: string;
  readonly titulo: string;
  readonly creado_en: string;
  readonly foto_count: number;
}

export interface Mensaje {
  readonly id: string;
  readonly rol: "user" | "assistant";
  readonly contenido: string;
  readonly sentimiento: string | null;
  readonly intencion: string | null;
  readonly foto_id: string | null;
  readonly creado_en: string;
}

export interface Album {
  readonly id: string;
  readonly chat_id: string;
  readonly titulo: string;
  readonly foto_count: number;
  readonly preview_foto_id: string | null;
  readonly creado_en: string;
}

export interface Foto {
  readonly id: string;
  readonly album_id: string;
  readonly chat_id: string;
  readonly nombre_archivo: string;
  readonly disease_id: string;
  readonly disease_name: string;
  readonly description: string;
  readonly confidence: number;
  readonly severity: string;
  readonly advice: string;
  readonly detector_status: string;
  readonly top_predictions: ReadonlyArray<{
    readonly disease_id: string;
    readonly disease_name: string;
    readonly confidence: number;
  }>;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token !== null) {
    headers.set("authorization", `Bearer ${token}`);
  }
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${BACKEND_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = Predicate.isString(data.detail) ? data.detail : JSON.stringify(data);
    } catch {
      // sin cuerpo JSON
    }
    throw new BackendError(res.status, detail);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (body: {
    readonly finca_nombre: string;
    readonly region: string;
    readonly nombre: string;
    readonly email: string;
    readonly password: string;
  }): Promise<Session> => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { readonly email: string; readonly password: string }): Promise<Session> =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  me: (): Promise<{ readonly usuario: Usuario; readonly finca: Finca }> => request("/auth/me"),

  createChat: (titulo: string): Promise<Chat> =>
    request("/chats", { method: "POST", body: JSON.stringify({ titulo }) }),

  listChats: (): Promise<{ readonly chats: ReadonlyArray<Chat> }> => request("/chats"),

  listMessages: (chatId: string): Promise<{ readonly messages: ReadonlyArray<Mensaje> }> =>
    request(`/chats/${chatId}/messages`),

  listAlbums: (): Promise<{ readonly albums: ReadonlyArray<Album> }> => request("/albums"),

  albumPhotos: (albumId: string): Promise<{ readonly photos: ReadonlyArray<Foto> }> =>
    request(`/albums/${albumId}/photos`),

  uploadPhoto: (chatId: string, file: File): Promise<Foto> => {
    const form = new FormData();
    form.append("file", file);
    return request(`/chats/${chatId}/photos`, { method: "POST", body: form });
  },

  rate: (body: {
    readonly state: string;
    readonly action: "knowledge_guided" | "classification_guided" | "llm_guided";
    readonly reward: number;
  }): Promise<unknown> => request("/rate", { method: "POST", body: JSON.stringify(body) }),

  fetchPhoto: async (fotoId: string): Promise<Blob> => {
    const token = getToken();
    const res = await fetch(`${BACKEND_URL}/photos/${fotoId}`, {
      headers: token === null ? {} : { authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new BackendError(res.status, res.statusText);
    }
    return res.blob();
  },
};
