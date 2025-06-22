let myData;

function animateOpenModal(m) {
  m.style.display = ""
  m.style.opacity = "1"
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

async function changeUsername() {
    const response = await fetch(`/api/users/${myData.username}/update`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            new_username: document.getElementById("username").value
        })
    })

    if (!response.ok) {
        const error = await response.json();
        return animateMessage(error.message || "Failed to change username", "red");
    }

    const data = await response.json();
    myData = data.user;
    animateMessage("Username changed successfully", "green");
}

async function changePassword() {
    if (document.getElementById("enterPassword").value !== document.getElementById("confirmPassword").value) {
        return animateMessage("Passwords do not match", "red");
    } else if (!document.getElementById("enterPassword").value || !document.getElementById("currentPassword").value || !document.getElementById("confirmPassword").value) {
        return animateMessage("Please fill out all fields", "red");
    }

    const response = await fetch(`/api/users/${myData.username}/update`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            current_password: document.getElementById("currentPassword").value,
            new_password: document.getElementById("enterPassword").value
        })
    })

    if (!response.ok) {
        const error = await response.json();
        return animateMessage(error.message || "Failed to change password", "red");
    }

    animateMessage("Password changed successfully", "green");
}

window.onload = async () => {
    animateOpenModal(document.getElementById("modal"));
    const response = await fetch("/api/me");
    if (!response.ok)
        return animateMessage("Failed to load user data", "red");
    myData = await response.json();
}