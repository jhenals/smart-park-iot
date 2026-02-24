import { signUp, signIn } from "./auth.js";
import { goToHomepage } from "./modules/utils.js";

$(document).ready(function () {
  $(".login-info-box").fadeOut();
  $(".login-show").addClass("show-log-panel");
});

$('.login-reg-panel input[type="radio"]').on("change", function () {
  if ($("#log-login-show").is(":checked")) {
    $(".register-info-box").fadeOut();
    $(".login-info-box").fadeIn();

    $(".white-panel").addClass("right-log");
    $(".register-show").addClass("show-log-panel");
    $(".login-show").removeClass("show-log-panel");
  } else if ($("#log-reg-show").is(":checked")) {
    $(".register-info-box").fadeIn();
    $(".login-info-box").fadeOut();

    $(".white-panel").removeClass("right-log");

    $(".login-show").addClass("show-log-panel");
    $(".register-show").removeClass("show-log-panel");
  }
});

async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  await signIn(email, password);
}

async function handleRegister() {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const confirmPassword = document.getElementById("reg-confirm-password").value;
  await signUp(email, password, confirmPassword);
}

function goToHomePage() {
  goToHomepage();
}

window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.goToHomePage = goToHomePage;
