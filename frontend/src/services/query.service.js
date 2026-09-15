import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3610",
  headers: { "Content-Type": "application/json" },
});

/**
 * The backend answers with the Link Loom envelope { status, success, message,
 * result }. Unwrapping it here keeps every component free of that detail.
 */
const unwrap = async (request) => {
  try {
    const { data } = await request;

    if (!data?.success) {
      return { ok: false, message: data?.message || "La consulta no pudo completarse" };
    }

    return { ok: true, data: data.result };
  } catch (error) {
    const message = error.response?.data?.message || error.message;

    return { ok: false, message };
  }
};

export const queryService = {
  getCatalog: () => unwrap(client.get("/catalog/schema")),
  ask: (payload) => unwrap(client.post("/query/ask", payload)),
  execute: (payload) => unwrap(client.post("/query/execute", payload)),
  restate: (payload) => unwrap(client.post("/query/restate", payload)),
};
