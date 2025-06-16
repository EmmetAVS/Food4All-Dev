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
        } else {
            response.json().then(data => {
                alert(data.message || "An error occurred while creating the branch.");
            });
        }
    })
}

window.onload = () => {
    animateOpenModal(document.getElementById("content"), false);
}