import axios from "axios";

const API = axios.create({
  baseURL: "https://fuzzy-space-guide-r5646xqvwpqcpqpx-5500.app.github.dev",
});

API.interceptors.request.use((req) => {
  if (localStorage.getItem("user_info")) {
    req.headers.Authorization = `Bearer ${JSON.parse(
      localStorage.getItem("user_info").token
    )}`;
  }

  return req;
});

export const signIn = (data) => {
  console.log(data);
  API.post("/users/signin", data);
};
export const signInGoogle = (accessToken) =>
  API.post("/users/signin", {
    googleAccessToken: accessToken,
  });

export const signUp = (data) => API.post("/users/signup", data);
export const signUpGoogle = (accessToken) =>
  API.post("/users/signup", {
    googleAccessToken: accessToken,
  });
