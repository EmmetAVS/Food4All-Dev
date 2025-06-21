let branches;
let userData;
let collections;

function handleDateUpdate() {
  if (document.getElementById("collectionSubmitDate").value >= new Date().toISOString().split("T")[0]) {
    document.getElementById("collectionSubmitStatus").value = "planned";
    document.getElementById("collectionSubmitStatus").disabled = true;
  } else {
    document.getElementById("collectionSubmitStatus").disabled = false;
  }
}

function animateOpenModal(m) {
  m.style.display = ""
  m.style.opacity = "1"
  m.style.background = "rgba(0, 0, 0, 0.8)"
  m.style.animation = "fade-in 0.3s"
  m.children[0].style.animation = "move-up 0.3s"

  const date = document.getElementById("collectionSubmitDate");
  const source = document.getElementById("collectionSubmitSource");
  const quantity = document.getElementById("collectionSubmitQuantity");
  const status = document.getElementById("collectionSubmitStatus");

  date.value = new Date().toISOString().split("T")[0];
  source.value = "";
  quantity.value = "";
  status.value = "donated";
  document.getElementById("modalTitle").innerText = "Submit Collection";

  date.disabled = false;
  source.disabled = false;
  quantity.disabled = false;
  status.disabled = false;
  document.getElementById("modalSubmit").disabled = false;
  document.getElementById("modalSubmit").onclick = () => modalClose("use");
}

function animateCloseModal(m) {
  setTimeout(function() {
    m.style.display = "none"
  }, 301)
  m.children[0].style.animation = "move-down 0.3s"
  m.style.animation = "fade-out 0.3s"
  m.style.opacity = 0
}

function modalClose(str) {
    const modal = document.getElementById("modal");
    

    console.log(str);

    if (!modal) return;
    else if (str == "ignore") {
        animateCloseModal(modal);
        return;
    }

    const branch = document.getElementById("collectionSubmitBranch").value;
    const date = document.getElementById("collectionSubmitDate").value;
    const source = document.getElementById("collectionSubmitSource").value;
    let quantity = document.getElementById("collectionSubmitQuantity").value;
    if (quantity <= 0 || quantity == "") quantity = -1; // -1 means N/A
    const status = document.getElementById("collectionSubmitStatus").value;

    if (!branch || !date || !source || !status) {
        animateMessage("Please fill in all fields", "red");
        return;
    }

    if (str == "use") {

        fetch("/api/collections/create", 
          {
            method: "POST", 
            headers: {"Content-Type": "application/json"}, 
            body: JSON.stringify({
                branch: branch,
                timestamp: (new Date(date)).getTime(),
                source: source,
                quantity: quantity,
                status: status
            })
          }
        ).then(response => {
            if (!response.ok) {
                animateMessage("Failed to create collection: " + response.json().message, "red");
                return;
            }
            else {
                animateMessage("Collection created successfully", "green");
                update();
            }
        }
        )
    } else if (str) {
        fetch(`/api/collections/${str}/update`, 
          {
            method: "POST",
            headers: {"Content-Type": "application/json"}, 
            body: JSON.stringify({
                branch: branch,
                timestamp: (new Date(date)).getTime(),
                source: source,
                quantity: quantity,
                status: status
            })
          }
        ).then(response => {
            if (!response.ok) {
                animateMessage("Failed to update collection: " + response.json().message, "red");
                return;
            }
            else {
                animateMessage("Collection updated successfully", "green");
                update();
            }
        });
    }

    animateCloseModal(modal);
}

function modalOpen(collectionID) {
    animateOpenModal(document.getElementById("modal"));

    const disabled = !(collections[collectionID].submitted_by == userData.username || userData.is_admin);

    const branch = document.getElementById("collectionSubmitBranch")
    const date = document.getElementById("collectionSubmitDate")
    const source = document.getElementById("collectionSubmitSource")
    const quantity = document.getElementById("collectionSubmitQuantity")
    const status = document.getElementById("collectionSubmitStatus")

    branch.value = collections[collectionID].branch;
    date.value = new Date(collections[collectionID].time).toISOString().split("T")[0];
    source.value = collections[collectionID].source;
    quantity.value = collections[collectionID].quantity == -1 ? "" : collections[collectionID].quantity;
    status.value = collections[collectionID].status;

    date.disabled = disabled;
    source.disabled = disabled;
    quantity.disabled = disabled;
    status.disabled = disabled;
    document.getElementById("modalSubmit").disabled = disabled;
    document.getElementById("modalSubmit").onclick =  () => modalClose(collectionID);

    document.getElementById("modalTitle").innerText = `${disabled ? "View" : "Edit"} Collection`;
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

function setBranch(branch) {
}

async function getCollections() {
    fetch("/api/collections").then(response => {
        if (!response.ok) {
            animateMessage("Failed to load collections", "red");
            return {};
        }
        
        return response.json();
    }).then(data => {
        collections = data.collections;
        const collectionList = document.getElementById("listItems");
        collectionList.innerHTML = "";

        /*
        <div class="list-item">
          <div>Submitted By</div>
          <div>Branch Acronym</div>
          <div>Date</div>
          <div>Source</div>
          <div>Quantity</div>
          <div>Status</div>
        </div>
        */

        let collectionsList = Object.values(collections);
        collectionsList.sort((a, b) => {

            const dateA = new Date(a.time);
            const dateB = new Date(b.time);
            if (dateA - dateB == 0) {
                return (new Date(b.created)) - (new Date(a.created));
            }
            return dateB - dateA;

        });
        collectionsList.forEach((collection) => {
            //const collection = collections[collectionID];
            const date = new Date(collection.time);
            const dateString = date.toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' });

            let quantity = collection.quantity;

            if (collection.quantity == -1) {
                quantity = "N/A";
            }

            collectionList.innerHTML += `
            <div class="list-item" onclick="modalOpen('${collection.id}')">
              <div>${collection.submitted_by}</div>
              <div>${branches[collection.branch]['acronym']}</div>
              <div>${dateString}</div>
              <div>${collection.source}</div>
              <div>${quantity}</div>
              <div>${collection.status}</div>
            </div>`;
        });
    });
}

async function update() {
    await getCollections();
}

async function getBranches() {
    const response = await fetch("/api/branches");
    if (!response.ok) {
        animateMessage("Failed to load branches", "red");
        return;
    }

    const data = await response.json();
    branches = data.branches;
    const branchOptions = document.getElementById("branchOptions");
    const collectionSubmitBranch = document.getElementById("collectionSubmitBranch");
    let collectionSubmitBranchText = "";

    for (const branch in branches) {
        const acronym = branches[branch].acronym;
        branchOptions.innerHTML += `<button onclick="setBranch('${acronym}')">${acronym}</button>`

        if (branches[branch].name != userData.branch) {
            collectionSubmitBranchText += `<option value="${branches[branch].name}">${acronym}</option>`;
        } else {
            collectionSubmitBranchText = `<option value="${branches[branch].name}">${acronym}</option>` + collectionSubmitBranchText;
        }
    }

    collectionSubmitBranch.innerHTML = collectionSubmitBranchText;
}

async function main() {

    response = await fetch ("/api/me")
    if (!response.ok) {
        animateMessage("Failed to load user data", "red");
        return;
    }
        
    userData = await response.json()

    const endDate = (new Date());
    endDate.setFullYear(9999);
    endDate.setMonth(11);
    endDate.setDate(30);
    document.getElementById("startDate").value = new Date(0).toISOString().split("T")[0];
    document.getElementById("endDate").value = endDate.toISOString().split("T")[0];

    await getBranches();
    
    await getCollections();
}

/*

FINISH MODAL OPEN AND COLLECTION EDITING

*/
window.onload = main;