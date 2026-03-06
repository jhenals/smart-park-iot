import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { createApp } from "vue";
import App from "./App.vue";

const params = new URLSearchParams(window.location.search);
const token = params.get("token");

if (token) {
  localStorage.setItem("accessToken", token);
  console.log("Access token stored in localStorage.");
  window.history.replaceState({}, document.title, window.location.pathname);
}

createApp(App).mount("#app");
