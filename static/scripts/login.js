function animateOpenModal(m) {
  m.style.display = ""
  m.style.opacity = "1"
}

window.onload = () => {
    animateOpenModal(document.getElementById("modal"));
}

function animateMessage(text, color) {
    const m = document.getElementsByClassName("message-container")[0];
    console.log(m);
    document.getElementById("message").innerText = text;
    m.style.display = "block"
    m.style.animation = "fade-in 0.3s"
    m.style.backgroundColor = color || "red;"

    setTimeout(() => {
        m.style.animation = "fade-out 0.3s"
        setTimeout(() => {
            m.style.display = "none";
        }, 300);
    }, 2000);
}

function login() {
    username = document.getElementById("username").value;
    password = document.getElementById("password").value;

    if (username === "" || password === "") {
        animateMessage("Please fill in all fields", "red");
        return;
    }

    fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    }).then(response => {
        if (response.ok) {

            animateMessage("Login successful", "green");
            response.json().then(data => {
                const expires = new Date();
                expires.setDate(expires.getDate() + 7);
                document.cookie = `token=${data.user.token}; path=/; expires=${expires.toUTCString()}`;
                window.location.href = "/view";
            });
        } else {
            response.json().then(data => {
                animateMessage(data.message || "Login failed", "red");
            });
        }
    }).catch(error => {
        console.error("Error:", error);
        animateMessage("An error occurred. Please try again.", "red");
    });
}