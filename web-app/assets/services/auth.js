function handleLogin() {
  const username = document.getElementById("username").value;
  const role = document.getElementById("user-role").value;

  if (!username) {
    alert("Please enter username to continue.");
    return;
  }

  localStorage.setItem("username", username);
  localStorage.setItem("userRole", role);

  if (role === "admin") {
    window.location.href = "/admin.html";
  } else {
    window.location.href = "../components/trail-preferences.html";
  }
}
