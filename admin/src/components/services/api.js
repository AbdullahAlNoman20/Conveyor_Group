import axios from "axios";

// During this design/testing phase there is no real backend (per client
// instruction). All "API calls" resolve against static JSON files served
// from /public/data, fetched with Axios so the data-fetching layer is
// already shaped like a real REST client and can be re-pointed at a real
// backend later by changing only this baseURL.
export const api = axios.create({
  baseURL: "/data",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Centralized error normalization so every screen gets a consistent shape.
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong while loading data.";
    return Promise.reject({ ...error, message });
  }
);
