function animateOpenModal(m, val) {
  m.style.display = ""
  m.style.opacity = "1"

  if (val) {
    document.getElementById("content").style.display = "none";
    document.getElementById("content").style.opacity = 0;
  }
}

function animateCloseModal(m) {
  setTimeout(function() {
    m.style.display = "none"
  }, 301)
  m.children[0].style.animation = "move-down 0.3s"
  m.style.animation = "fade-out 0.3s"
  m.style.opacity = 0

  document.getElementById("content").style.display = "";
  document.getElementById("content").style.opacity = 1;
}

function branchCreate() {
    const branchName = document.getElementById("branchName").value;
    const branchAcronym = document.getElementById("branchAcronym").value;

    fetch("/api/branches/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: branchName,
            acronym: branchAcronym
        })
    }).then(response => {
        if (response.ok) {
            animateCloseModal(document.getElementById("modal"));
            document.getElementById("branchName").value = "";
            document.getElementById("branchAcronym").value = "";
            animateMessage("Branch created successfully!", "green");
        } else {
            response.json().then(data => {
                animateMessage(data.message || "An error occurred while creating the branch.", "red");
            });
        }
    })
}

function animateMessage(text, color) {
    const m = document.getElementsByClassName("message-container")[0];
    m.style.zIndex = "10000";
    document.getElementById("message").innerText = text;
    m.style.display = "block"
    m.style.animation = "fade-in 0.3s"
    m.style.backgroundColor = color || "red;"

    setTimeout(() => {
        m.style.animation = "fade-out 0.3s"
        setTimeout(() => {
            m.style.display = "none";
            m.style.zIndex = "0";
        }, 300);
    }, 2000);
}

async function upgradeUser() {
    const username = document.getElementById("upgradeUsername").value;

    const response = await fetch(`/api/users/${username}/upgrade`);
    if (!response.ok) {
        animateMessage("Failed to upgrade user. Please try again.", "red");
    } else {
        animateMessage("User upgraded to admin successfully!", "green");
    }
}

window.onload = () => {
    animateOpenModal(document.getElementById("content"), false);
}