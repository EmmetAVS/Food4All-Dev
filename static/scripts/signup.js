function animateOpenModal(m) {
  m.style.display = ""
  m.style.opacity = "1"
}

window.onload = () => {
    animateOpenModal(document.getElementById("modal"));

    fetch("/api/branches")
        .then(response => response.json()).then(data => {
            const branchSelect = document.getElementById("branch");
            console.log(data);
            for (let branch in data.branches) {
                const option = document.createElement("option");
                option.value = branch;
                option.textContent = branch;
                branchSelect.appendChild(option);
            }})
        .catch(error => {
            console.log(error);
            animateMessage("Failed to load branches", "red");
        }
    )
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

function signup() {
    username = document.getElementById("username").value;
    password = document.getElementById("password").value;
    confirmPassword = document.getElementById("confirmPassword").value;
    email = document.getElementById("email").value;
    branch = document.getElementById("branch").value;

    if (username === "" || password === "" || confirmPassword === "" || email === "") {
        animateMessage("Please fill in all fields", "red");
        return;
    }

    if (password != confirmPassword) {
        animateMessage("Passwords are not the same", "red");
        return;
    }

    fetch("/api/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password,
            email: email,
            branch: branch
        })
    }).then(response => {
        if (response.ok) {

            animateMessage("Login successful", "green");
            response.json().then(data => {
                const expires = new Date();
                expires.setDate(expires.getDate() + 7);
                document.cookie = `token=${data.user.token}; path=/; expires=${expires.toUTCString()}`;
                console.log(document.cookie);
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