import axios from "axios";

// Plain client with no auth token and no 401 redirect — used for public endpoints.
const publicClient = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

export default publicClient;
