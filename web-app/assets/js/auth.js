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

function handleLogin() {
  const email = document.getElementById("email").value;
  //const role = document.getElementById("user-role").value;

  if (!email) {
    alert("Please enter email to continue.");
    return;
  }

  localStorage.setItem("email", email);
  //localStorage.setItem("userRole", role);

  if (email === "admin") {
    window.location.href = "/web-app/src/admin/dashboard.html";
  } else {
    window.location.href = "/web-app/src/user/trail-preferences.html";
  }
}

function handleRegister() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!email || !password || !confirmPassword) {
    alert("Please fill up the form to continue.");
    return;
  }

  localStorage.setItem("email", email);
  //localStorage.setItem("userRole", role);

  if (email === "admin") {
    window.location.href = "/web-app/src/admin/dashboard.html";
  } else {
    window.location.href = "/web-app/src/user/trail-preferences.html";
  }
}
