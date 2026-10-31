
let tickets = JSON.parse(localStorage.getItem("tickets")) || [];

const ticketForm = document.getElementById("ticketForm");
const ticketsContainer = document.getElementById("ticketsContainer");
const emptyMessage = document.getElementById("emptyMessage");
const totalTickets = document.getElementById("totalTickets");
const openTickets = document.getElementById("openTickets");
const resolvedTickets = document.getElementById("resolvedTickets");
let currentFilter = "All";
let searchTerm = "";
let priorityFilter = "All";
function saveTickets() {
    localStorage.setItem("tickets", JSON.stringify(tickets));
}

function updateStatistics() {
    totalTickets.textContent = tickets.length;

    openTickets.textContent = tickets.filter(
        ticket => ticket.status === "Open"
    ).length;

    resolvedTickets.textContent = tickets.filter(
        ticket => ticket.status === "Resolved"
    ).length;
}
// Display tickets on the page
function displayTickets() {
    ticketsContainer.innerHTML = "";

    if (tickets.length === 0) {
        ticketsContainer.innerHTML =
            '<p id="emptyMessage">No tickets submitted yet.</p>';
        return;
    }

    const filteredTickets = tickets.filter(function(ticket) {
    const matchesStatus =
        currentFilter === "All" || ticket.status === currentFilter;

    const matchesPriority =
        priorityFilter === "All" || ticket.priority === priorityFilter;

    const matchesSearch =
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
});

filteredTickets.forEach(function(ticket) {
        const ticketElement = document.createElement("div");
        ticketElement.classList.add("ticket");

        ticketElement.innerHTML = `
            <h3>${ticket.title}</h3>
            <p><strong>Ticket ID:</strong> ${ticket.id}</p>
            <p><strong>Date Submitted:</strong> ${ticket.date || "Not available"}</p>
            <p><strong>Employee:</strong> ${ticket.name}</p>
            <p><strong>Category:</strong> ${ticket.category}</p>
            <p><strong>Description:</strong> ${ticket.description}</p>
            <p>
                <strong>Priority:</strong>
                <span class="priority ${ticket.priority.toLowerCase()}">
                    ${ticket.priority}
                </span>
            </p>
            <p><strong>Status:</strong>
                <span class="status">${ticket.status}</span>
            </p>

            <select class="status-select">
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
            </select>

            <button class="edit-ticket">Edit Ticket</button>
            <button class="delete-ticket">Delete Ticket</button>
        `;

        const statusSelect = ticketElement.querySelector(".status-select");
        const statusText = ticketElement.querySelector(".status");

        statusSelect.value = ticket.status;

        statusSelect.addEventListener("change", function() {
            ticket.status = statusSelect.value;
            statusText.textContent = ticket.status;
            saveTickets();
        });

        const deleteButton = ticketElement.querySelector(".delete-ticket");

        deleteButton.addEventListener("click", function() {
            const confirmDelete = confirm("Are you sure you want to delete this ticket?");

            if (confirmDelete) {
                tickets = tickets.filter(t => t.id !== ticket.id);

                saveTickets();
                displayTickets();
            }
        });
        const editButton = ticketElement.querySelector(".edit-ticket");

editButton.addEventListener("click", function() {
    const newTitle = prompt("Enter the updated ticket title:", ticket.title);

    if (newTitle === null || newTitle.trim() === "") {
        return;
    }

    const newDescription = prompt(
        "Enter the updated description:",
        ticket.description
    );

    if (newDescription === null || newDescription.trim() === "") {
        return;
    }

    ticket.title = newTitle.trim();
    ticket.description = newDescription.trim();

    saveTickets();
    displayTickets();
});
        ticketsContainer.appendChild(ticketElement);
    });
    updateStatistics();
}

// Submit a new ticket
ticketForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("employeeName").value;
    if (!name.trim()) {
    alert("Please enter the employee's name.");
    return;
    }
    const title = document.getElementById("issueTitle").value;
    if (!title.trim()) {
    alert("Please enter an issue title.");
    return;
    }
    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value;
    if (!description.trim()) {
    alert("Please enter a description of the issue.");
    return;
    }
    const priority = document.getElementById("priority").value;

    const ticketID = "TKT-" + Date.now();

    const newTicket = {
        id: ticketID,
        date: new Date().toLocaleString(),
        name: name,
        title: title,
        category: category,
        description: description,
        priority: priority,
        status: "Open"
    };

    tickets.push(newTicket);

    saveTickets();
    displayTickets();

    ticketForm.reset();
});

// Load previously saved tickets when the page opens
displayTickets();
const filterButtons = document.querySelectorAll(".filter-btn");

filterButtons.forEach(function(button) {
    button.addEventListener("click", function() {

        currentFilter = button.dataset.filter;

        filterButtons.forEach(function(btn) {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        displayTickets();
    });
});

const searchInput = document.getElementById("searchInput");
const priorityFilterSelect = document.getElementById("priorityFilter");

searchInput.addEventListener("input", function() {
    searchTerm = searchInput.value;
    displayTickets();
});

priorityFilterSelect.addEventListener("change", function() {
    priorityFilter = priorityFilterSelect.value;
    displayTickets();
});
