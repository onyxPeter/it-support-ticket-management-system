
// ==========================================
// IT SUPPORT MANAGEMENT SYSTEM
// TICKET MANAGEMENT MODULE
// ==========================================

window.TicketManager = (() => {

    let tickets = [];
    let technicians = [];
    let currentFilter = "All";
    let searchTerm = "";
    let priorityFilter = "All";
    let activeTicketId = null;

    // ======================================
    // STORAGE
    // ======================================

    function loadData() {
        tickets = window.AppStorage.getTickets();
        technicians = window.AppStorage.getTechnicians();
    }

    function saveTickets() {
        window.AppStorage.saveTickets(tickets);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => {
            const characters = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return characters[char];
        });
    }

    function getTechnicianName(technicianId) {
        const technician = technicians.find(
            item => item.id === technicianId
        );

        return technician ? technician.name : "Unassigned";
    }

    // ======================================
    // TICKET DISPLAY
    // ======================================

    function displayTickets() {
        loadData();

        const container = document.getElementById("ticketsContainer");

        if (!container) return;

        const filteredTickets = tickets.filter(ticket => {
            const matchesStatus =
                currentFilter === "All" ||
                ticket.status === currentFilter;

            const matchesPriority =
                priorityFilter === "All" ||
                ticket.priority === priorityFilter;

            const search = searchTerm.toLowerCase();

            const matchesSearch =
                String(ticket.title || "").toLowerCase().includes(search) ||
                String(ticket.id || "").toLowerCase().includes(search) ||
                String(ticket.name || "").toLowerCase().includes(search);

            return matchesStatus && matchesPriority && matchesSearch;
        });

        if (filteredTickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎫</div>
                    <h3>No tickets found</h3>
                    <p>Try changing your filters or create a new ticket.</p>
                </div>
            `;

            return;
        }

        let tableHTML = `
            <div class="table-container">
                <table class="ticket-table">
                    <thead>
                        <tr>
                            <th>Ticket ID</th>
                            <th>Subject</th>
                            <th>Employee</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Assigned Technician</th>
                            <th>SLA</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        filteredTickets.forEach(ticket => {
            const sla = window.Dashboard.getSlaStatus(ticket);

            tableHTML += `
                <tr>
                    <td class="ticket-id">${escapeHTML(ticket.id)}</td>

                    <td class="ticket-subject">
                        ${escapeHTML(ticket.title)}
                    </td>

                    <td>${escapeHTML(ticket.name)}</td>

                    <td>${escapeHTML(ticket.category)}</td>

                    <td>
                        <span class="priority ${escapeHTML(
                            String(ticket.priority || "").toLowerCase()
                        )}">
                            ${escapeHTML(ticket.priority)}
                        </span>
                    </td>

                    <td>
                        <select class="status-select"
                            data-id="${escapeHTML(ticket.id)}">
                            <option value="Open"
                                ${ticket.status === "Open" ? "selected" : ""}>
                                Open
                            </option>

                            <option value="In Progress"
                                ${ticket.status === "In Progress" ? "selected" : ""}>
                                In Progress
                            </option>

                            <option value="Resolved"
                                ${ticket.status === "Resolved" ? "selected" : ""}>
                                Resolved
                            </option>
                        </select>
                    </td>

                    <td>
                        <select class="technician-select"
                            data-id="${escapeHTML(ticket.id)}">

                            <option value="">Unassigned</option>

                            ${technicians.map(technician => `
                                <option
                                    value="${escapeHTML(technician.id)}"
                                    ${ticket.assignedTechnician === technician.id
                                        ? "selected" : ""}
                                >
                                    ${escapeHTML(technician.name)}
                                </option>
                            `).join("")}

                        </select>
                    </td>

                    <td>
                        <span class="sla-badge ${sla.className}">
                            ${sla.label}
                        </span>
                    </td>

                    <td class="ticket-date">
                        ${escapeHTML(ticket.date || "Not available")}
                    </td>

                    <td>
                        <div class="table-actions">
                            <button class="view-ticket"
                                data-id="${escapeHTML(ticket.id)}">
                                View
                            </button>

                            <button class="edit-ticket"
                                data-id="${escapeHTML(ticket.id)}">
                                Edit
                            </button>

                            <button class="delete-ticket"
                                data-id="${escapeHTML(ticket.id)}">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    // ======================================
    // CREATE TICKET
    // ======================================

    function initializeTicketForm() {
        const form = document.getElementById("ticketForm");

        if (!form) return;

        form.addEventListener("submit", event => {
            event.preventDefault();

            const name = document.getElementById("employeeName").value.trim();
            const title = document.getElementById("issueTitle").value.trim();
            const category = document.getElementById("category").value;
            const description = document.getElementById("description").value.trim();
            const priority = document.getElementById("priority").value;

            if (!name || !title || !description || !category) {
                alert("Please complete all ticket details.");
                return;
            }

            const now = new Date();
            const currentDate = now.toLocaleString();

            const newTicket = {
                id: "TKT-" + now.getTime(),
                createdAt: now.toISOString(),
                date: currentDate,
                name,
                title,
                category,
                description,
                priority,
                status: "Open",
                assignedTechnician: null,

                activity: [{
                    action: "Ticket created",
                    details: "Ticket submitted by " + name,
                    date: currentDate,
                    type: "created"
                }],

                comments: []
            };

            tickets.push(newTicket);

            saveTickets();
            form.reset();
            refresh();
        });
    }

    // ======================================
    // UPDATE TICKET STATUS
    // ======================================

    function updateTicketStatus(ticketId, newStatus) {
        const ticket = tickets.find(item => item.id === ticketId);

        if (!ticket) return;

        const previousStatus = ticket.status;

        if (previousStatus === newStatus) return;

        if (!Array.isArray(ticket.activity)) {
            ticket.activity = [];
        }

        ticket.status = newStatus;

        ticket.activity.push({
            action: "Status changed",
            details: `Status changed from ${previousStatus} to ${newStatus}`,
            date: new Date().toLocaleString(),
            type: "status"
        });

        saveTickets();
        refresh();
    }

    // ======================================
    // ASSIGN TECHNICIAN
    // ======================================

    function assignTechnician(ticketId, technicianId) {
        const ticket = tickets.find(item => item.id === ticketId);

        if (!ticket) return;

        const previousTechnician = getTechnicianName(
            ticket.assignedTechnician
        );

        const newTechnician = getTechnicianName(technicianId);

        if (ticket.assignedTechnician === (technicianId || null)) {
            return;
        }

        if (!Array.isArray(ticket.activity)) {
            ticket.activity = [];
        }

        ticket.assignedTechnician = technicianId || null;

        ticket.activity.push({
            action: "Technician assignment updated",
            details: `Assignment changed from ${previousTechnician} to ${newTechnician}`,
            date: new Date().toLocaleString(),
            type: "assignment"
        });

        saveTickets();
        refresh();
    }

    // ======================================
    // EDIT TICKET
    // ======================================

    function editTicket(ticketId) {
        const ticket = tickets.find(item => item.id === ticketId);

        if (!ticket) return;

        const newTitle = prompt(
            "Enter the updated ticket title:",
            ticket.title
        );

        if (newTitle === null || newTitle.trim() === "") return;

        const newDescription = prompt(
            "Enter the updated description:",
            ticket.description
        );

        if (newDescription === null || newDescription.trim() === "") return;

        ticket.title = newTitle.trim();
        ticket.description = newDescription.trim();

        if (!Array.isArray(ticket.activity)) {
            ticket.activity = [];
        }

        ticket.activity.push({
            action: "Ticket updated",
            details: "Ticket title and description were edited.",
            date: new Date().toLocaleString(),
            type: "updated"
        });

        saveTickets();
        refresh();
    }

    // ======================================
    // DELETE TICKET
    // ======================================

    function deleteTicket(ticketId) {
        if (!confirm("Are you sure you want to delete this ticket?")) {
            return;
        }

        tickets = tickets.filter(item => item.id !== ticketId);

        saveTickets();
        refresh();
    }

    // ======================================
    // TICKET DETAILS MODAL
    // ======================================

    function viewTicket(ticketId) {
        const ticket = tickets.find(item => item.id === ticketId);

        if (!ticket) return;

        activeTicketId = ticket.id;

        const setText = (id, value) => {
            const element = document.getElementById(id);

            if (element) element.textContent = value ?? "";
        };

        setText("modalTicketTitle", ticket.title);
        setText("modalTicketId", ticket.id);
        setText("modalEmployee", ticket.name);
        setText("modalCategory", ticket.category);
        setText("modalPriority", ticket.priority);
        setText("modalStatus", ticket.status);
        setText("modalDate", ticket.date || "Not available");
        setText("modalDescription", ticket.description);

        setText(
            "modalAssignedTechnician",
            getTechnicianName(ticket.assignedTechnician)
        );

        const sla = window.Dashboard.getSlaStatus(ticket);

        const modalSlaStatus = document.getElementById("modalSlaStatus");
        const modalSlaDeadline = document.getElementById("modalSlaDeadline");

        if (modalSlaStatus) {
            modalSlaStatus.textContent = sla.label;
            modalSlaStatus.className = `sla-badge ${sla.className}`;
        }

        if (modalSlaDeadline) {
            modalSlaDeadline.textContent =
                window.Dashboard.formatSlaDeadline(sla.deadline);
        }

        renderActivity(ticket);
        renderComments(ticket);

        const modal = document.getElementById("ticketModal");

        if (modal) modal.classList.add("active");
    }

    // ======================================
    // OPEN TICKET FROM NOTIFICATION URL
    // ======================================

    function openTicketFromUrl() {
        const urlParameters = new URLSearchParams(
            window.location.search
        );

        const ticketId = urlParameters.get("ticket");

        if (!ticketId) return;

        const ticketExists = tickets.some(
            ticket => ticket.id === ticketId
        );

        if (!ticketExists) {
            console.warn("The requested ticket was not found:", ticketId);
            return;
        }

        // Open the requested ticket.
        viewTicket(ticketId);

        // Remove the ticket parameter without reloading the page.
        const cleanUrl =
            window.location.pathname +
            window.location.hash;

        window.history.replaceState(
            {},
            document.title,
            cleanUrl
        );
    }

    // ======================================
    // ACTIVITY HISTORY
    // ======================================

    function renderActivity(ticket) {
        const container = document.getElementById("activityTimeline");

        if (!container) return;

        const activity = Array.isArray(ticket.activity)
            ? ticket.activity
            : [];

        if (activity.length === 0) {
            container.innerHTML = "<p>No activity recorded yet.</p>";
            return;
        }

        container.innerHTML = activity.map(item => `
            <div class="activity-item">
                <div class="activity-dot"></div>

                <div class="activity-content">
                    <strong>${escapeHTML(item.action)}</strong>
                    <p>${escapeHTML(item.details)}</p>
                    <small>${escapeHTML(item.date)}</small>
                </div>
            </div>
        `).join("");
    }

    // ======================================
    // TECHNICIAN COMMENTS
    // ======================================

    function renderComments(ticket) {
        const container = document.getElementById("commentsContainer");

        if (!container) return;

        if (!Array.isArray(ticket.comments)) {
            ticket.comments = [];
        }

        if (ticket.comments.length === 0) {
            container.innerHTML = "<p>No comments yet.</p>";
            return;
        }

        container.innerHTML = ticket.comments.map(comment => `
            <div class="comment-item">
                <strong>${escapeHTML(comment.author)}</strong>
                <p>${escapeHTML(comment.text)}</p>
                <small>${escapeHTML(comment.date)}</small>
            </div>
        `).join("");
    }

    function initializeCommentForm() {
        const form = document.getElementById("commentForm");

        if (!form) return;

        form.addEventListener("submit", event => {
            event.preventDefault();

            const input = document.getElementById("commentInput");

            if (!input || !activeTicketId) return;

            const commentText = input.value.trim();

            if (!commentText) return;

            const ticket = tickets.find(
                item => item.id === activeTicketId
            );

            if (!ticket) return;

            if (!Array.isArray(ticket.comments)) ticket.comments = [];
            if (!Array.isArray(ticket.activity)) ticket.activity = [];

            const currentDate = new Date().toLocaleString();

            ticket.comments.push({
                author: "Technician",
                text: commentText,
                date: currentDate
            });

            ticket.activity.push({
                action: "Technician comment added",
                details: commentText,
                date: currentDate,
                type: "comment"
            });

            saveTickets();

            renderComments(ticket);
            renderActivity(ticket);

            input.value = "";
        });
    }

    // ======================================
    // SEARCH AND FILTERS
    // ======================================

    function initializeFilters() {
        document.querySelectorAll(".filter-btn").forEach(button => {
            button.addEventListener("click", () => {
                currentFilter = button.dataset.filter;

                document.querySelectorAll(".filter-btn").forEach(btn => {
                    btn.classList.remove("active");
                });

                button.classList.add("active");

                displayTickets();
            });
        });

        const searchInput = document.getElementById("searchInput");

        if (searchInput) {
            searchInput.addEventListener("input", () => {
                searchTerm = searchInput.value;
                displayTickets();
            });
        }

        const prioritySelect = document.getElementById("priorityFilter");

        if (prioritySelect) {
            prioritySelect.addEventListener("change", () => {
                priorityFilter = prioritySelect.value;
                displayTickets();
            });
        }
    }

    // ======================================
    // TABLE ACTIONS
    // ======================================

    function initializeTableActions() {
        const container = document.getElementById("ticketsContainer");

        if (!container) return;

        container.addEventListener("click", event => {
            const button = event.target.closest("button");

            if (!button) return;

            const ticketId = button.dataset.id;

            if (!ticketId) return;

            if (button.classList.contains("view-ticket")) {
                viewTicket(ticketId);
            }

            if (button.classList.contains("edit-ticket")) {
                editTicket(ticketId);
            }

            if (button.classList.contains("delete-ticket")) {
                deleteTicket(ticketId);
            }
        });

        container.addEventListener("change", event => {
            const select = event.target;

            if (select.classList.contains("status-select")) {
                updateTicketStatus(select.dataset.id, select.value);
            }

            if (select.classList.contains("technician-select")) {
                assignTechnician(select.dataset.id, select.value);
            }
        });
    }

    // ======================================
    // MODAL CONTROLS
    // ======================================

    function initializeModal() {
        const modal = document.getElementById("ticketModal");

        const closeButtons = [
            document.getElementById("closeModal"),
            document.getElementById("closeModalFooter")
        ];

        closeButtons.forEach(button => {
            if (button) {
                button.addEventListener("click", () => {
                    modal?.classList.remove("active");
                });
            }
        });

        if (modal) {
            modal.addEventListener("click", event => {
                if (event.target === modal) {
                    modal.classList.remove("active");
                }
            });
        }
    }

    // ======================================
    // NEW TICKET BUTTON
    // ======================================

    function initializeNewTicketButton() {
        const button = document.getElementById("newTicketButton");
        const section = document.getElementById("ticketFormSection");

        if (!button || !section) return;

        button.addEventListener("click", () => {
            section.scrollIntoView({
                behavior: "smooth"
            });
        });
    }

    // ======================================
    // REFRESH
    // ======================================

    function refresh() {
        loadData();
        displayTickets();

        if (window.Dashboard) {
            window.Dashboard.initialize();
        }

        if (window.TechnicianManager) {
            window.TechnicianManager.refresh();
        }
    }

    // ======================================
    // INITIALIZE MODULE
    // ======================================

    function initialize() {
        loadData();

        initializeTicketForm();
        initializeFilters();
        initializeTableActions();
        initializeCommentForm();
        initializeModal();
        initializeNewTicketButton();

        displayTickets();

        // Automatically open a ticket requested by a notification.
        openTicketFromUrl();
    }

    return {
        initialize,
        refresh,
        displayTickets,
        viewTicket,
        getTickets: () => [...tickets]
    };

})();
