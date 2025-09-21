let branches;
let userData;
let collections;
let visibleCollectionIDs = [];
let activeBranch = null;
let earliestTimestamp = Number.MAX_SAFE_INTEGER, latestTimestamp = 0;

function swapMenuSectionVisibility(section) {
    const element = document.getElementById(section);

    for (const otherSections of document.getElementsByClassName("menu-options")) {
        if (otherSections.id == section && element.style.display.trim() != "") continue;
        otherSections.style.display = "none";
    }

    if (!element) return;
    console.log(element.style.display, section);
    element.style.display == "none" ?
        element.style.display = "flex" :
        element.style.display = "none";

    console.log(element.style.display, section);
}

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
    const image = document.getElementById("imageUpload");
    const receipt = document.getElementById("collectionReceiptQuantity");
    const donatedTo = document.getElementById("collectionDonationLocation");

    const now = new Date();
    date.value = now.getFullYear().toString().padStart(4, '0') + '-' + 
                (now.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                now.getDate().toString().padStart(2, '0');    source.value = "";
    quantity.value = "";
    status.value = "planned";
    document.getElementById("modalTitle").innerText = "Submit Collection";

    date.disabled = false;
    source.disabled = false;
    quantity.disabled = false;
    status.disabled = false;
    image.disabled = false;
    receipt.disabled = false;
    donatedTo.disabled = false;
    image.value = "";
    receipt.value = "";
    donatedTo.value = "";
    document.getElementById("modalSubmit").disabled = false;
    document.getElementById("modalSubmit").onclick = () => modalClose("use");
    document.getElementById("modalDelete").style.display = "none";
    document.getElementById("imageUploadLabel").innerHTML = `Upload an image:`;
}

function animateCloseModal(m) {
  setTimeout(function() {
    m.style.display = "none"
  }, 301)
  m.children[0].style.animation = "move-down 0.3s"
  m.style.animation = "fade-out 0.3s"
  m.style.opacity = 0
}

async function modalDelete(collectionID) {
    const modal = document.getElementById("modal");

    if (!modal) return;

    response = await fetch(`/api/collections/${collectionID}/delete`, 
        {
            method: "POST",
            headers: {"Content-Type": "application/json"},
        }
    );

    if (!response.ok) {
        animateMessage("Failed to delete collection: " + response.json().message, "red");
        return;
    }

    else animateMessage("Collection deleted successfully", "green");
    update();
    animateCloseModal(modal);
}

function modalClose(str) {
    const modal = document.getElementById("modal");

    if (!modal) return;
    else if (str == "ignore") {
        animateCloseModal(modal);
        return;
    }

    const branch = document.getElementById("collectionSubmitBranch").value;
    const date = document.getElementById("collectionSubmitDate").value;
    console.log(date);
    const source = document.getElementById("collectionSubmitSource").value;
    let quantity = document.getElementById("collectionSubmitQuantity").value;
    if (quantity <= 0 || quantity == "") quantity = -1; // -1 means N/A
    const status = document.getElementById("collectionSubmitStatus").value;

    let receipt = document.getElementById("collectionReceiptQuantity").value;
    if (receipt < 0 || receipt == "") receipt = 0;
    const donatedTo = document.getElementById("collectionDonationLocation").value;

    let image = null;
    const imageFile = document.getElementById("imageUpload").files[0];
    if (imageFile && (imageFile.size / 1024 / 1024).toFixed(2) > 8) {
        animateMessage("Image file is too large (max 8MB)", "red");
        return;
    }

    const processRequest = () => {
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
                    status: status,
                    receipt: receipt,
                    donated_to: donatedTo,
                    image: image ? image : null
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
                    time: (new Date(date)).getTime(),
                    source: source,
                    quantity: quantity,
                    status: status,
                    receipt: receipt,
                    donated_to: donatedTo,
                    image: image ? image : null
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

    if (imageFile) {
        const reader = new FileReader();

        reader.onload = function (e) {
            image = e.target.result ? e.target.result : null;
            console.log(image);
            processRequest();
        };

        reader.readAsDataURL(imageFile);
    } else {
        processRequest();
    }
}

function modalOpen(collectionID) {
    animateOpenModal(document.getElementById("modal"));

    const disabled = !(collections[collectionID].branch == userData.branch || userData.is_admin);

    const branch = document.getElementById("collectionSubmitBranch")
    const date = document.getElementById("collectionSubmitDate")
    const source = document.getElementById("collectionSubmitSource")
    const quantity = document.getElementById("collectionSubmitQuantity")
    const status = document.getElementById("collectionSubmitStatus")
    const image = document.getElementById("imageUpload");
    const receipt = document.getElementById("collectionReceiptQuantity");
    const donatedTo = document.getElementById("collectionDonationLocation");

    branch.value = collections[collectionID].branch;
    date.value = new Date(collections[collectionID].time).toISOString().split("T")[0];
    source.value = collections[collectionID].source;
    quantity.value = collections[collectionID].quantity == -1 ? "" : collections[collectionID].quantity;
    status.value = collections[collectionID].status;
    receipt.value = collections[collectionID].receipt ? collections[collectionID].receipt : "";
    donatedTo.value = collections[collectionID].donated_to ? collections[collectionID].donated_to : "";

    date.disabled = disabled;
    source.disabled = disabled;
    quantity.disabled = disabled;
    status.disabled = disabled;
    image.disabled = disabled;
    receipt.disabled = disabled;
    donatedTo.disabled = disabled;
    document.getElementById("modalSubmit").disabled = disabled;
    document.getElementById("modalSubmit").onclick =  () => modalClose(collectionID);
    document.getElementById("modalDelete").style.display = "";
    document.getElementById("modalDelete").onclick = () => modalDelete(collectionID);
    document.getElementById("modalDelete").disabled = disabled;
    document.getElementById("modalTitle").innerText = `${disabled ? "View" : "Edit"} Collection`;
    if (collections[collectionID].image) {
        document.getElementById("imageUploadLabel").innerHTML = `Upload an image (<a href="/images/${collectionID}" target="_blank" rel="noopener noreferrer">View</a>):`;
    } else {
        document.getElementById("imageUploadLabel").innerHTML = `Upload an image (None uploaded):`;
    }
    

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

async function setBranch(branch) {
    console.log("Setting branch to: " + branch);
    if (branch == "ALL") activeBranch = null;
    else activeBranch = branch;
    console.log(activeBranch);
    await update();
}

async function getCollections(startDateTimestamp, endDateTimestamp) {
    const response = await fetch("/api/collections")
    let data;
    if (!response.ok) {
        animateMessage("Failed to load collections", "red");
        data = {};
    }
        
    data = await response.json();
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
        <div>Receipt</div>
        <div>Donated To</div>
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

    visibleCollectionIDs = [];

    collectionsList.forEach((collection) => {

        const timeStamp = new Date(collection.time).getTime()

        if (timeStamp > endDateTimestamp || timeStamp < startDateTimestamp) return;
        else if (activeBranch != null && collection.branch != activeBranch) return;

        if (timeStamp < earliestTimestamp)
            earliestTimestamp = timeStamp;

        if (timeStamp > latestTimestamp)
            latestTimestamp = timeStamp;

        const isoStringSplit = new Date(collection.time).toISOString().split("T")[0].split("-");
        const dateString = `${isoStringSplit[1]}/${isoStringSplit[2]}/${isoStringSplit[0]}`;

        let quantity = collection.quantity;

        if (collection.quantity == -1) {
            quantity = "N/A";
        }

        const statusText = collection.status.charAt(0).toUpperCase() + collection.status.slice(1);

        collectionList.innerHTML += `
            <div class="list-item" onclick="modalOpen('${collection.id}')">
              <div>${collection.submitted_by}</div>
              <div>${branches[collection.branch]['acronym']}</div>
              <div>${dateString}</div>
              <div>${collection.source}</div>
              <div>${quantity}</div>
              <div>${statusText}</div>
              <div>${collection.receipt ? collection.receipt : ""}</div>
              <div>${collection.donated_to ? collection.donated_to : ""}</div>
            </div>`;

        visibleCollectionIDs.push(collection.id);
    });
}

async function getCharts() {

    const chartContainer = document.getElementById("charts");

    const response = await fetch("/api/generate_charts", {
            method: "POST", 
            headers: {"Content-Type": "application/json"}, 
            body: JSON.stringify({
                collection_ids: visibleCollectionIDs,
                earliest_timestamp: earliestTimestamp,
                latest_timestamp: latestTimestamp,
                colors: {
                    "background": window.getComputedStyle(document.body).getPropertyValue("--background"),
                    "accent": window.getComputedStyle(document.body).getPropertyValue("--accent"),
                    "text": window.getComputedStyle(document.body).getPropertyValue("--text"),
                }
            })
          });
    if (!response.ok) {
        console.log(response);
        animateMessage("Failed to load charts", "red");
        return;
    }

    const data = await response.json();
    const chartData = data.charts;

    let chartHTML = "";

    for (const chart of chartData) {

        const src = `data:image/png;base64,${chart.chart_data}`;

        chartHTML += `
        
        <div class="chart" id="chart1">
            <label>${chart.chart_title}</label>
            <img src="${src}">
        </div>

        `
    }

    chartContainer.innerHTML = chartHTML;

}

async function update() {

    console.log("Updating collections...");
    const startDateText = document.getElementById("startDate").value;
    let [year, month, day] = startDateText.split("-").map(Number);
    const startDate = new Date(year, month - 1, day);
    
    const endDateText = document.getElementById("endDate").value;
    [year, month, day] = endDateText.split("-").map(Number);
    const endDate = new Date(year, month - 1, day);

    latestTimestamp = 0;
    earliestTimestamp = Number.MAX_SAFE_INTEGER;
    await getCollections(startDate.getTime(), endDate.getTime());
    await getCharts();
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
        branchOptions.innerHTML += `<button onclick="setBranch('${branches[branch].name}')">${acronym}</button>`

        if (branches[branch].name != userData.branch) {
            collectionSubmitBranchText += `<option value="${branches[branch].name}">${acronym}</option>`;
        } else {
            collectionSubmitBranchText = `<option value="${branches[branch].name}">${acronym}</option>` + collectionSubmitBranchText;
        }
    }

    collectionSubmitBranch.innerHTML = collectionSubmitBranchText;
}

async function main() {

    document.getElementById("modal").onclick = (e) => {
        if (e.target.id == "modal") {
            modalClose('ignore');
        }
    }

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
    const start = new Date(0);
    document.getElementById("startDate").value = start.getFullYear().toString().padStart(4, '0') + '-' + (start.getMonth() + 1).toString().padStart(2, '0') + '-' + start.getDate().toString().padStart(2, '0');
    document.getElementById("endDate").value = endDate.getFullYear().toString().padStart(4, '0') + '-' + (endDate.getMonth() + 1).toString().padStart(2, '0') + '-' + endDate.getDate().toString().padStart(2, '0');

    await getBranches();

    console.log(`User branch: '${userData.branch}'`);
    if (userData.branch in branches) {
        await setBranch(userData.branch);
    }
    await update();
}

window.onload = main;