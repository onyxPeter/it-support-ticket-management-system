// =====================================
// DATA STORAGE
// =====================================

let tickets = JSON.parse(localStorage.getItem("tickets")) || [];
let technicians = JSON.parse(localStorage.getItem("technicians")) || [];

let currentFilter = "All";
let searchTerm = "";
let priorityFilter = "All";
let activeTicketId = null;

// =====================================
// DOM ELEMENTS
// =====================================

const ticketForm = document.getElementById("ticketForm");
const ticketsContainer = document.getElementById("ticketsContainer");

const totalTickets = document.getElementById("totalTickets");
const openTickets = document.getElementById("openTickets");
const resolvedTickets = document.getElementById("resolvedTickets");
const progressTickets = document.getElementById("progressTickets");

const technicianForm = document.getElementById("technicianForm");
const techniciansContainer = document.getElementById("techniciansContainer");

// =====================================
// SAVE DATA
// =====================================

function saveTickets() {
    localStorage.setItem("tickets", JSON.stringify(tickets));
}

function saveTechnicians() {
    localStorage.setItem("technicians", JSON.stringify(technicians));
}

// =====================================
// HELPER FUNCTIONS
// =====================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function(char) {
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
    const technician = technicians.find(function(item) {
        return item.id === technicianId;
    });

    return technician ? technician.name : "Unassigned";
}

// =====================================
// SLA MANAGEMENT
// =====================================

const SLA_HOURS = {
    Critical: 4,
    High: 8,
    Medium: 24,
    Low: 48
};

function getTicketCreatedAt(ticket) {
    const idTimestamp = String(ticket.id || "").match(/^TKT-(\d+)$/);

    if (idTimestamp) return Number(idTimestamp[1]);

    const parsedDate = Date.parse(ticket.date || "");

    return Number.isNaN(parsedDate) ? Date.now() : parsedDate;
}

function getSlaDeadline(ticket) {
    const createdAt = ticket.createdAt
        ? new Date(ticket.createdAt).getTime()
        : getTicketCreatedAt(ticket);

    const hours = SLA_HOURS[ticket.priority] || SLA_HOURS.Medium;

    return createdAt + hours * 60 * 60 * 1000;
}

function getSlaStatus(ticket) {
    const deadline = getSlaDeadline(ticket);

    if (ticket.status === "Resolved") {
        return {
            label: "Resolved",
            className: "sla-resolved",
            deadline: deadline
        };
    }

    const remaining = deadline - Date.now();

    if (remaining < 0) {
        return {
            label: "Overdue",
            className: "sla-overdue",
            deadline: deadline
        };
    }

    if (remaining <= 2 * 60 * 60 * 1000) {
        return {
            label: "Due soon",
            className: "sla-warning",
            deadline: deadline
        };
    }

    return {
        label: "Within SLA",
        className: "sla-on-track",
        deadline: deadline
    };
}

function formatSlaDeadline(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function updateSlaOverview() {
    const totalElement = document.getElementById("slaTotalTickets");
    const overdueElement = document.getElementById("slaOverdueTickets");
    const dueSoonElement = document.getElementById("slaDueSoonTickets");
    const onTrackElement = document.getElementById("slaOnTrackTickets");
    const alertElement = document.getElementById("slaAlert");

    if (!totalElement || !overdueElement || !dueSoonElement || !onTrackElement) {
        return;
    }

    const activeTickets = tickets.filter(function(ticket) {
        return ticket.status !== "Resolved";
    });

    const overdue = activeTickets.filter(function(ticket) {
        return getSlaStatus(ticket).label === "Overdue";
    });

    const dueSoon = activeTickets.filter(function(ticket) {
        return getSlaStatus(ticket).label === "Due soon";
    });

    const onTrack = activeTickets.filter(function(ticket) {
        return getSlaStatus(ticket).label === "Within SLA";
    });

    totalElement.textContent = activeTickets.length;
    overdueElement.textContent = overdue.length;
    dueSoonElement.textContent = dueSoon.length;
    onTrackElement.textContent = onTrack.length;

    if (alertElement) {
        if (overdue.length > 0) {
            alertElement.className = "sla-alert sla-alert-danger";
            alertElement.textContent =
                `${overdue.length} active ticket(s) have exceeded their SLA deadline.`;

        } else if (dueSoon.length > 0) {
            alertElement.className = "sla-alert sla-alert-warning";
            alertElement.textContent =
                `${dueSoon.length} active ticket(s) are approaching their SLA deadline.`;

        } else {
            alertElement.className = "sla-alert sla-alert-good";
            alertElement.textContent = "No active tickets are overdue.";
        }
    }
}

// Add SLA timestamps to older tickets without changing their IDs.
tickets.forEach(function(ticket) {
    if (!ticket.createdAt) {
        ticket.createdAt = new Date(getTicketCreatedAt(ticket)).toISOString();
    }
});

saveTickets();

// =====================================
// DASHBOARD STATISTICS
// =====================================

function updateStatistics() {
    totalTickets.textContent = tickets.length;

    openTickets.textContent = tickets.filter(
        ticket => ticket.status === "Open"
    ).length;

    progressTickets.textContent = tickets.filter(
        ticket => ticket.status === "In Progress"
    ).length;

    resolvedTickets.textContent = tickets.filter(
        ticket => ticket.status === "Resolved"
    ).length;
}

// =====================================
// TICKET ACTIVITY
// =====================================

function renderActivity(ticket) {
    const activityTimeline = document.getElementById("activityTimeline");

    const activity = Array.isArray(ticket.activity)
        ? ticket.activity
        : [];

    if (activity.length === 0) {
        activityTimeline.innerHTML = "<p>No activity recorded yet.</p>";
        return;
    }

    activityTimeline.innerHTML = activity.map(function(item) {
        return `
            <div class="activity-item">
                <div class="activity-dot"></div>

                <div class="activity-content">
                    <strong>${escapeHTML(item.action)}</strong>
                    <p>${escapeHTML(item.details)}</p>
                    <small>${escapeHTML(item.date)}</small>
                </div>
            </div>
        `;
    }).join("");
}

// =====================================
// TECHNICIAN COMMENTS
// =====================================

function renderComments(ticket) {
    const commentsContainer = document.getElementById("commentsContainer");

    if (!Array.isArray(ticket.comments)) {
        ticket.comments = [];
    }

    if (ticket.comments.length === 0) {
        commentsContainer.innerHTML = "<p>No comments yet.</p>";
        return;
    }

    commentsContainer.innerHTML = ticket.comments.map(function(comment) {
        return `
            <div class="comment-item">
                <strong>${escapeHTML(comment.author)}</strong>
                <p>${escapeHTML(comment.text)}</p>
                <small>${escapeHTML(comment.date)}</small>
            </div>
        `;
    }).join("");
}

// =====================================
// TECHNICIAN PERFORMANCE OVERVIEW
// =====================================

function updatePerformanceOverview() {
    const workloadChart = document.getElementById("technicianWorkloadChart");
    const resolutionChart = document.getElementById("technicianResolutionChart");
    const performanceBody = document.getElementById("technicianPerformanceBody");

    if (!workloadChart || !resolutionChart || !performanceBody) {
        return;
    }

    if (technicians.length === 0) {
        workloadChart.innerHTML = `
            <div class="empty-state">
                <h3>No technicians available</h3>
                <p>Add technicians to view workload distribution.</p>
            </div>
        `;

        resolutionChart.innerHTML = `
            <div class="empty-state">
                <h3>No performance data</h3>
                <p>Technician resolution statistics will appear here.</p>
            </div>
        `;

        performanceBody.innerHTML = `
            <tr>
                <td colspan="5">No performance data available yet.</td>
            </tr>
        `;

        return;
    }

    const performanceData = technicians.map(function(technician) {
        const assignedTickets = tickets.filter(function(ticket) {
            return ticket.assignedTechnician === technician.id;
        });

        const totalAssigned = assignedTickets.length;

        const resolved = assignedTickets.filter(function(ticket) {
            return ticket.status === "Resolved";
        }).length;

        const inProgress = assignedTickets.filter(function(ticket) {
            return ticket.status === "In Progress";
        }).length;

        const completionRate = totalAssigned > 0
            ? Math.round((resolved / totalAssigned) * 100)
            : 0;

        return {
            id: technician.id,
            name: technician.name,
            totalAssigned: totalAssigned,
            resolved: resolved,
            inProgress: inProgress,
            completionRate: completionRate
        };
    });

    const maximumWorkload = Math.max(
        1,
        ...performanceData.map(item => item.totalAssigned)
    );

    // WORKLOAD DISTRIBUTION CHART
    workloadChart.innerHTML = `
        <div class="chart-legend">
            <span class="legend-item">
                <span class="legend-color workload-legend"></span>
                Assigned tickets
            </span>
        </div>

        <div class="chart-bars">
            ${performanceData.map(function(item) {
                const width = (item.totalAssigned / maximumWorkload) * 100;

                return `
                    <div class="chart-bar-row">
                        <div class="chart-label">
                            ${escapeHTML(item.name)}
                        </div>

                        <div class="chart-track">
                            <div
                                class="chart-fill workload-fill"
                                style="width: ${width}%"
                            ></div>
                        </div>

                        <strong class="chart-value">
                            ${item.totalAssigned}
                        </strong>
                    </div>
                `;
            }).join("")}
        </div>
    `;

    // RESOLUTION PERFORMANCE CHART
    resolutionChart.innerHTML = `
        <div class="chart-legend">
            <span class="legend-item">
                <span class="legend-color assigned-legend"></span>
                Assigned
            </span>

            <span class="legend-item">
                <span class="legend-color resolved-legend"></span>
                Resolved
            </span>
        </div>

        <div class="resolution-chart-bars">
            ${performanceData.map(function(item) {
                const assignedWidth =
                    (item.totalAssigned / maximumWorkload) * 100;

                const resolvedWidth =
                    (item.resolved / maximumWorkload) * 100;

                return `
                    <div class="resolution-chart-row">
                        <div class="chart-label">
                            ${escapeHTML(item.name)}
                        </div>

                        <div class="resolution-bar-group">
                            <div class="chart-track">
                                <div
                                    class="chart-fill assigned-fill"
                                    style="width: ${assignedWidth}%"
                                ></div>
                            </div>

                            <strong class="chart-value">
                                ${item.totalAssigned}
                            </strong>
                        </div>

                        <div class="resolution-bar-group">
                            <div class="chart-track">
                                <div
                                    class="chart-fill resolved-fill"
                                    style="width: ${resolvedWidth}%"
                                ></div>
                            </div>

                            <strong class="chart-value">
                                ${item.resolved}
                            </strong>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;

    // TECHNICIAN PERFORMANCE TABLE
    performanceBody.innerHTML = performanceData.map(function(item) {
        return `
            <tr>
                <td>
                    <strong>${escapeHTML(item.name)}</strong>
                </td>

                <td>${item.totalAssigned}</td>

                <td>${item.resolved}</td>

                <td>${item.inProgress}</td>

                <td>
                    <div class="completion-cell">
                        <div class="completion-track">
                            <div
                                class="completion-fill"
                                style="width: ${item.completionRate}%"
                            ></div>
                        </div>

                        <strong>${item.completionRate}%</strong>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// =====================================
// DISPLAY TICKETS
// =====================================

function displayTickets() {
    updateStatistics();
    updateSlaOverview();

    const filteredTickets = tickets.filter(function(ticket) {
        const matchesStatus =
            currentFilter === "All" || ticket.status === currentFilter;

        const matchesPriority =
            priorityFilter === "All" || ticket.priority === priorityFilter;

        const search = searchTerm.toLowerCase();

        const matchesSearch =
            String(ticket.title || "").toLowerCase().includes(search) ||
            String(ticket.id || "").toLowerCase().includes(search) ||
            String(ticket.name || "").toLowerCase().includes(search);

        return matchesStatus && matchesPriority && matchesSearch;
    });

    if (filteredTickets.length === 0) {
        ticketsContainer.innerHTML = `
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

    filteredTickets.forEach(function(ticket) {
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
                    <select class="status-select" data-id="${escapeHTML(ticket.id)}">
                        <option value="Open" ${ticket.status === "Open" ? "selected" : ""}>Open</option>
                        <option value="In Progress" ${ticket.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Resolved" ${ticket.status === "Resolved" ? "selected" : ""}>Resolved</option>
                    </select>
                </td>

                <td>
                    <select class="technician-select" data-id="${escapeHTML(ticket.id)}">
                        <option value="">Unassigned</option>

                        ${technicians.map(function(technician) {
                            return `
                                <option
                                    value="${escapeHTML(technician.id)}"
                                    ${ticket.assignedTechnician === technician.id ? "selected" : ""}
                                >
                                    ${escapeHTML(technician.name)}
                                </option>
                            `;
                        }).join("")}

                    </select>
                </td>

                <td>
                    <span class="sla-badge ${getSlaStatus(ticket).className}">
                        ${getSlaStatus(ticket).label}
                    </span>
                </td>

                <td class="ticket-date">
                    ${escapeHTML(ticket.date || "Not available")}
                </td>

                <td>
                    <div class="table-actions">
                        <button class="view-ticket" data-id="${escapeHTML(ticket.id)}">
                            View
                        </button>

                        <button class="edit-ticket" data-id="${escapeHTML(ticket.id)}">
                            Edit
                        </button>

                        <button class="delete-ticket" data-id="${escapeHTML(ticket.id)}">
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

    ticketsContainer.innerHTML = tableHTML;

    // STATUS CHANGES
    document.querySelectorAll(".status-select").forEach(function(select) {
        select.addEventListener("change", function() {
            const ticket = tickets.find(t => t.id === select.dataset.id);

            if (!ticket) return;

            const previousStatus = ticket.status;
            const newStatus = select.value;

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
            displayTickets();
            displayTechnicians();
        });
    });

    // TECHNICIAN ASSIGNMENT
    document.querySelectorAll(".technician-select").forEach(function(select) {
        select.addEventListener("change", function() {
            const ticket = tickets.find(t => t.id === select.dataset.id);

            if (!ticket) return;

            const previousTechnician = getTechnicianName(
                ticket.assignedTechnician
            );

            const newTechnicianId = select.value;
            const newTechnician = getTechnicianName(newTechnicianId);

            if (ticket.assignedTechnician === newTechnicianId) return;

            if (!Array.isArray(ticket.activity)) {
                ticket.activity = [];
            }

            ticket.assignedTechnician = newTechnicianId || null;

            ticket.activity.push({
                action: "Technician assignment updated",
                details: `Assignment changed from ${previousTechnician} to ${newTechnician}`,
                date: new Date().toLocaleString(),
                type: "assignment"
            });

            saveTickets();
            displayTickets();
            displayTechnicians();
        });
    });

    // DELETE TICKETS
    document.querySelectorAll(".delete-ticket").forEach(function(button) {
        button.addEventListener("click", function() {
            const confirmDelete = confirm(
                "Are you sure you want to delete this ticket?"
            );

            if (!confirmDelete) return;

            tickets = tickets.filter(t => t.id !== button.dataset.id);

            saveTickets();
            displayTickets();
            displayTechnicians();
        });
    });

    // EDIT TICKETS
    document.querySelectorAll(".edit-ticket").forEach(function(button) {
        button.addEventListener("click", function() {
            const ticket = tickets.find(t => t.id === button.dataset.id);

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

            saveTickets();
            displayTickets();
        });
    });

    // VIEW TICKET DETAILS
    document.querySelectorAll(".view-ticket").forEach(function(button) {
        button.addEventListener("click", function() {
            const ticket = tickets.find(t => t.id === button.dataset.id);

            if (!ticket) return;

            activeTicketId = ticket.id;

            document.getElementById("modalTicketTitle").textContent = ticket.title;
            document.getElementById("modalTicketId").textContent = ticket.id;
            document.getElementById("modalEmployee").textContent = ticket.name;
            document.getElementById("modalCategory").textContent = ticket.category;
            document.getElementById("modalPriority").textContent = ticket.priority;
            document.getElementById("modalStatus").textContent = ticket.status;
            document.getElementById("modalDate").textContent = ticket.date || "Not available";
            document.getElementById("modalDescription").textContent = ticket.description;

            document.getElementById("modalAssignedTechnician").textContent =
                getTechnicianName(ticket.assignedTechnician);

            const modalSlaStatus = document.getElementById("modalSlaStatus");
            const modalSlaDeadline = document.getElementById("modalSlaDeadline");

            const slaInfo = getSlaStatus(ticket);

            if (modalSlaStatus) {
                modalSlaStatus.textContent = slaInfo.label;
                modalSlaStatus.className = `sla-badge ${slaInfo.className}`;
            }

            if (modalSlaDeadline) {
                modalSlaDeadline.textContent =
                    formatSlaDeadline(slaInfo.deadline);
            }

            renderActivity(ticket);
            renderComments(ticket);

            document.getElementById("ticketModal").classList.add("active");
        });
    });
}

// =====================================
// CREATE NEW TICKET
// =====================================

ticketForm.addEventListener("submit", function(event) {
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
        name: name,
        title: title,
        category: category,
        description: description,
        priority: priority,
        status: "Open",
        assignedTechnician: null,

        activity: [
            {
                action: "Ticket created",
                details: "Ticket submitted by " + name,
                date: currentDate,
                type: "created"
            }
        ],

        comments: []
    };

    tickets.push(newTicket);

    saveTickets();
    displayTickets();
    displayTechnicians();

    ticketForm.reset();
});

// =====================================
// TECHNICIAN MANAGEMENT
// =====================================

function displayTechnicians() {
    updatePerformanceOverview();

    if (technicians.length === 0) {
        techniciansContainer.innerHTML = `
            <div class="empty-state">
                <h3>No technicians registered</h3>
                <p>Add your first technician using the form above.</p>
            </div>
        `;

        return;
    }

    techniciansContainer.innerHTML = `
        <div class="table-container">
            <table class="ticket-table">

                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email Address</th>
                        <th>Total Assigned</th>
                        <th>In Progress</th>
                        <th>Resolved</th>
                        <th>Actions</th>
                    </tr>
                </thead>

                <tbody>
                    ${technicians.map(function(technician) {

                        const assignedTickets = tickets.filter(function(ticket) {
                            return ticket.assignedTechnician === technician.id;
                        });

                        const totalAssigned = assignedTickets.length;

                        const inProgress = assignedTickets.filter(function(ticket) {
                            return ticket.status === "In Progress";
                        }).length;

                        const resolved = assignedTickets.filter(function(ticket) {
                            return ticket.status === "Resolved";
                        }).length;

                        return `
                            <tr>
                                <td>${escapeHTML(technician.name)}</td>

                                <td>${escapeHTML(technician.email)}</td>

                                <td>
                                    <span class="workload-count total-workload">
                                        ${totalAssigned}
                                    </span>
                                </td>

                                <td>
                                    <span class="workload-count progress-workload">
                                        ${inProgress}
                                    </span>
                                </td>

                                <td>
                                    <span class="workload-count resolved-workload">
                                        ${resolved}
                                    </span>
                                </td>

                                <td>
                                    <div class="table-actions">
                                        <button
                                            class="delete-technician"
                                            data-id="${escapeHTML(technician.id)}"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>

            </table>
        </div>
    `;

    // REMOVE TECHNICIAN
    document.querySelectorAll(".delete-technician").forEach(function(button) {
        button.addEventListener("click", function() {
            const confirmDelete = confirm(
                "Are you sure you want to remove this technician?"
            );

            if (!confirmDelete) return;

            const technicianId = button.dataset.id;

            technicians = technicians.filter(
                technician => technician.id !== technicianId
            );

            // Unassign tickets belonging to the removed technician.
            tickets.forEach(function(ticket) {
                if (ticket.assignedTechnician === technicianId) {
                    ticket.assignedTechnician = null;

                    if (!Array.isArray(ticket.activity)) {
                        ticket.activity = [];
                    }

                    ticket.activity.push({
                        action: "Technician removed",
                        details: "The assigned technician was removed from the system.",
                        date: new Date().toLocaleString(),
                        type: "assignment"
                    });
                }
            });

            saveTechnicians();
            saveTickets();

            displayTechnicians();
            displayTickets();
        });
    });
}

// ADD TECHNICIAN
technicianForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("technicianName").value.trim();
    const email = document.getElementById("technicianEmail").value.trim();

    if (!name || !email) {
        alert("Please complete all technician details.");
        return;
    }

    const emailExists = technicians.some(function(technician) {
        return technician.email.toLowerCase() === email.toLowerCase();
    });

    if (emailExists) {
        alert("A technician with this email address already exists.");
        return;
    }

    const newTechnician = {
        id: "TECH-" + Date.now(),
        name: name,
        email: email,
        dateAdded: new Date().toLocaleString()
    };

    technicians.push(newTechnician);

    saveTechnicians();
    displayTechnicians();
    displayTickets();

    technicianForm.reset();

    alert("Technician added successfully!");
});

// =====================================
// SEARCH AND FILTERS
// =====================================

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

// =====================================
// NEW TICKET BUTTON
// =====================================

document.getElementById("newTicketButton").addEventListener("click", function() {
    document.getElementById("ticketFormSection").scrollIntoView({
        behavior: "smooth"
    });
});

// =====================================
// MODAL CONTROLS
// =====================================

document.getElementById("closeModal").addEventListener("click", function() {
    document.getElementById("ticketModal").classList.remove("active");
});

document.getElementById("closeModalFooter").addEventListener("click", function() {
    document.getElementById("ticketModal").classList.remove("active");
});

document.getElementById("ticketModal").addEventListener("click", function(event) {
    if (event.target.id === "ticketModal") {
        event.target.classList.remove("active");
    }
});

// =====================================
// TECHNICIAN COMMENT SUBMISSION
// =====================================

document.getElementById("commentForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const commentInput = document.getElementById("commentInput");
    const commentText = commentInput.value.trim();

    if (!commentText || !activeTicketId) return;

    const ticket = tickets.find(t => t.id === activeTicketId);

    if (!ticket) return;

    if (!Array.isArray(ticket.comments)) {
        ticket.comments = [];
    }

    if (!Array.isArray(ticket.activity)) {
        ticket.activity = [];
    }

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

    commentInput.value = "";
});

// =====================================
// INITIALIZE APPLICATION
// =====================================

displayTickets();
displayTechnicians();

// =====================================
// NOTIFICATION CENTER
// =====================================

// Load saved notifications without changing tickets or technicians.
let notifications = JSON.parse(
    localStorage.getItem("notifications")
) || [];

function saveNotifications() {
    localStorage.setItem(
        "notifications",
        JSON.stringify(notifications)
    );
}

// Create a notification and prevent duplicate alerts.
function addNotification(title, message, type, ticketId, uniqueKey) {
    const alreadyExists = notifications.some(function(notification) {
        return notification.uniqueKey === uniqueKey;
    });

    if (alreadyExists) return;

    notifications.unshift({
        id: "NOTIF-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        title: title,
        message: message,
        type: type,
        ticketId: ticketId || null,
        uniqueKey: uniqueKey,
        read: false,
        date: new Date().toLocaleString()
    });

    // Keep the most recent 100 notifications.
    notifications = notifications.slice(0, 100);

    saveNotifications();
    renderNotifications();
}

// Build the notification center inside the existing top bar.
function initializeNotificationCenter() {
    const topbarRight = document.querySelector(".topbar-right");

    if (!topbarRight) {
        console.warn("Notification center: .topbar-right was not found.");
        return;
    }

    if (document.getElementById("notificationCenter")) return;

    const notificationCenter = document.createElement("div");

    notificationCenter.id = "notificationCenter";
    notificationCenter.className = "notification-center";

    notificationCenter.innerHTML = `
        <button
            type="button"
            id="notificationToggle"
            class="notification-toggle"
            aria-label="Open notifications"
            aria-expanded="false"
        >
            <span class="notification-bell">
    <svg
        viewBox="0 0 24 24"
        width="21"
        height="21"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
        <path d="M10 21h4"></path>
    </svg>
</span>
            <span id="notificationCount" class="notification-count"></span>
        </button>

        <div id="notificationPanel" class="notification-panel">
            <div class="notification-header">
                <div>
                    <h3>Notifications</h3>
                    <p id="notificationSummary">You're all caught up.</p>
                </div>

                <button
                    type="button"
                    id="notificationClose"
                    class="notification-close"
                    aria-label="Close notifications"
                >
                    &times;
                </button>
            </div>

            <div class="notification-actions">
                <button type="button" id="markAllNotificationsRead">
                    Mark all as read
                </button>

                <button type="button" id="clearNotifications">
                    Clear all
                </button>
            </div>

            <div id="notificationList" class="notification-list"></div>
        </div>
    `;

    topbarRight.appendChild(notificationCenter);

    document.getElementById("notificationToggle").addEventListener(
        "click",
        function() {
            const panel = document.getElementById("notificationPanel");
            const isOpen = panel.classList.toggle("active");

            this.setAttribute("aria-expanded", String(isOpen));
        }
    );

    document.getElementById("notificationClose").addEventListener(
        "click",
        closeNotificationPanel
    );

    document.getElementById("markAllNotificationsRead").addEventListener(
        "click",
        function() {
            notifications.forEach(function(notification) {
                notification.read = true;
            });

            saveNotifications();
            renderNotifications();
        }
    );

    document.getElementById("clearNotifications").addEventListener(
        "click",
        function() {
            notifications = [];

            saveNotifications();
            renderNotifications();
        }
    );

    // Clicking a notification opens its related ticket.
    document.getElementById("notificationList").addEventListener(
        "click",
        function(event) {
            const notificationItem = event.target.closest(".notification-item");

            if (!notificationItem) return;

            const notification = notifications.find(function(item) {
                return item.id === notificationItem.dataset.id;
            });

            if (!notification) return;

            notification.read = true;

            saveNotifications();
            renderNotifications();
            closeNotificationPanel();

            if (notification.ticketId) {
                openTicketFromNotification(notification.ticketId);
            }
        }
    );

    // Close the panel when clicking outside it.
    document.addEventListener("click", function(event) {
        if (!notificationCenter.contains(event.target)) {
            closeNotificationPanel();
        }
    });

    renderNotifications();
}

function closeNotificationPanel() {
    const panel = document.getElementById("notificationPanel");
    const toggle = document.getElementById("notificationToggle");

    if (panel) panel.classList.remove("active");

    if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
    }
}

// Render notification list and unread counter.
function renderNotifications() {
    const list = document.getElementById("notificationList");
    const countElement = document.getElementById("notificationCount");
    const summary = document.getElementById("notificationSummary");

    if (!list || !countElement || !summary) return;

    const unreadCount = notifications.filter(function(notification) {
        return !notification.read;
    }).length;

    countElement.textContent = unreadCount > 99
        ? "99+"
        : unreadCount;

    countElement.style.display = unreadCount > 0
        ? "flex"
        : "none";

    summary.textContent = unreadCount > 0
        ? `${unreadCount} unread notification(s)`
        : "You're all caught up.";

    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="notification-empty">
                <span>🔔</span>
                <h4>No notifications yet</h4>
                <p>New ticket updates and SLA alerts will appear here.</p>
            </div>
        `;

        return;
    }

    list.innerHTML = notifications.map(function(notification) {
        let icon = "●";

        if (notification.type === "overdue") icon = "!";
        if (notification.type === "due-soon") icon = "◷";
        if (notification.type === "created") icon = "+";
        if (notification.type === "resolved") icon = "✓";

        return `
            <button
                type="button"
                class="notification-item ${notification.read ? "read" : "unread"} notification-${escapeHTML(notification.type)}"
                data-id="${escapeHTML(notification.id)}"
            >
                <span class="notification-icon">
                    ${icon}
                </span>

                <span class="notification-content">
                    <strong>${escapeHTML(notification.title)}</strong>
                    <span>${escapeHTML(notification.message)}</span>
                    <small>${escapeHTML(notification.date)}</small>
                </span>

                ${notification.read ? "" : '<span class="notification-unread-dot"></span>'}
            </button>
        `;
    }).join("");
}

// Open a ticket from its notification.
function openTicketFromNotification(ticketId) {
    const ticket = tickets.find(function(item) {
        return item.id === ticketId;
    });

    if (!ticket) return;

    currentFilter = "All";
    priorityFilter = "All";
    searchTerm = "";

    const searchInput = document.getElementById("searchInput");
    const prioritySelect = document.getElementById("priorityFilter");

    if (searchInput) searchInput.value = "";
    if (prioritySelect) prioritySelect.value = "All";

    document.querySelectorAll(".filter-btn").forEach(function(button) {
        button.classList.toggle(
            "active",
            button.dataset.filter === "All"
        );
    });

    displayTickets();

    const viewButton = Array.from(
        document.querySelectorAll(".view-ticket")
    ).find(function(button) {
        return button.dataset.id === ticketId;
    });

    const ticketsSection = document.getElementById("tickets");

    if (ticketsSection) {
        ticketsSection.scrollIntoView({
            behavior: "smooth"
        });
    }

    if (viewButton) {
        viewButton.click();
    }
}

// Check active tickets for approaching or exceeded SLA deadlines.
function checkSlaNotifications() {
    tickets.forEach(function(ticket) {
        if (ticket.status === "Resolved") return;

        const sla = getSlaStatus(ticket);

        if (sla.label === "Overdue") {
            addNotification(
                "SLA deadline exceeded",
                `${ticket.id} — ${ticket.title} is overdue.`,
                "overdue",
                ticket.id,
                `sla:${ticket.id}:overdue`
            );

        } else if (sla.label === "Due soon") {
            addNotification(
                "Ticket approaching SLA",
                `${ticket.id} — ${ticket.title} is approaching its deadline.`,
                "due-soon",
                ticket.id,
                `sla:${ticket.id}:due-soon`
            );
        }
    });
}

// Detect newly created tickets.
// The deferred callback runs after the existing ticket form handler.
let ticketBeforeNotificationSubmit = null;

ticketForm.addEventListener("submit", function() {
    ticketBeforeNotificationSubmit = tickets.length > 0
        ? tickets[tickets.length - 1].id
        : null;

    queueMicrotask(function() {
        const latestTicket = tickets[tickets.length - 1];

        if (
            !latestTicket ||
            latestTicket.id === ticketBeforeNotificationSubmit
        ) {
            return;
        }

        addNotification(
            "New support ticket",
            `${latestTicket.id} — ${latestTicket.title} was submitted.`,
            "created",
            latestTicket.id,
            `new-ticket:${latestTicket.id}`
        );
    });
});

// Detect tickets that have just been resolved.
document.addEventListener("change", function(event) {
    if (!event.target.matches(".status-select")) return;

    const ticket = tickets.find(function(item) {
        return item.id === event.target.dataset.id;
    });

    if (!ticket || ticket.status !== "Resolved") return;

    const latestActivity = Array.isArray(ticket.activity)
        ? ticket.activity[ticket.activity.length - 1]
        : null;

    if (!latestActivity || latestActivity.type !== "status") return;

    addNotification(
        "Ticket resolved",
        `${ticket.id} — ${ticket.title} has been marked as resolved.`,
        "resolved",
        ticket.id,
        `resolved:${ticket.id}:${ticket.activity.length}`
    );
});

// Initialize the notification center.
initializeNotificationCenter();

// Check SLA alerts immediately and then every minute.
checkSlaNotifications();

setInterval(function() {
    checkSlaNotifications();
    updateSlaOverview();
    displayTickets();
}, 60000);


// =====================================
// DASHBOARD ANALYTICS
// =====================================

function updateTicketAnalytics() {
    const container = document.querySelector(".analytics-placeholder");

    if (!container) return;

    const total = tickets.length;

    if (total === 0) {
        container.innerHTML = `
            <div class="analytics-empty">
                <h3>No analytics data yet</h3>
                <p>Create support tickets to see dashboard insights.</p>
            </div>
        `;
        return;
    }

    // STATUS DISTRIBUTION
    const statuses = [
        { name: "Open", color: "analytics-open" },
        { name: "In Progress", color: "analytics-progress" },
        { name: "Resolved", color: "analytics-resolved" }
    ];

    // PRIORITY BREAKDOWN
    const priorities = ["Critical", "High", "Medium", "Low"];

    // CATEGORY BREAKDOWN
    const categories = {};

    tickets.forEach(function(ticket) {
        const category = ticket.category || "Uncategorized";
        categories[category] = (categories[category] || 0) + 1;
    });

    const categoryData = Object.entries(categories)
        .sort((a, b) => b[1] - a[1]);

    // RESOLUTION RATE
    const resolvedCount = tickets.filter(function(ticket) {
        return ticket.status === "Resolved";
    }).length;

    const resolutionRate = Math.round(
        (resolvedCount / total) * 100
    );

    // SEVEN-DAY TICKET TREND
    const today = new Date();
    const trendData = [];

    for (let i = 6; i >= 0; i--) {
        const day = new Date(today);
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() - i);

        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        const count = tickets.filter(function(ticket) {
            const created = ticket.createdAt
                ? new Date(ticket.createdAt)
                : new Date(getTicketCreatedAt(ticket));

            return created >= day && created < nextDay;
        }).length;

        trendData.push({
            label: day.toLocaleDateString("en-US", {
                weekday: "short"
            }),
            count: count
        });
    }

    const maximumTrend = Math.max(
        1,
        ...trendData.map(item => item.count)
    );

    function renderBars(items, colorClass) {
        const maximum = Math.max(1, ...items.map(item => item.count));

        return items.map(function(item) {
            const percentage = (item.count / maximum) * 100;

            return `
                <div class="analytics-bar-row">
                    <div class="analytics-bar-heading">
                        <span>${escapeHTML(item.name)}</span>
                        <strong>${item.count}</strong>
                    </div>

                    <div class="analytics-track">
                        <div
                            class="analytics-fill ${colorClass}"
                            style="width: ${percentage}%"
                        ></div>
                    </div>
                </div>
            `;
        }).join("");
    }

    const statusData = statuses.map(function(status) {
        return {
            name: status.name,
            count: tickets.filter(ticket => ticket.status === status.name).length,
            color: status.color
        };
    });

    const priorityData = priorities.map(function(priority) {
        return {
            name: priority,
            count: tickets.filter(ticket => ticket.priority === priority).length
        };
    });

    const categoryBars = categoryData.map(function(item) {
        return {
            name: item[0],
            count: item[1]
        };
    });

    container.innerHTML = `
        <div class="analytics-dashboard">

            <div class="analytics-grid">

                <div class="analytics-panel">
                    <h3>Ticket Status Distribution</h3>
                    <p class="analytics-subtitle">Current ticket statuses</p>

                    ${statusData.map(function(item) {
                        const percentage = (item.count / total) * 100;

                        return `
                            <div class="analytics-bar-row">
                                <div class="analytics-bar-heading">
                                    <span>${item.name}</span>
                                    <strong>${item.count}</strong>
                                </div>

                                <div class="analytics-track">
                                    <div
                                        class="analytics-fill ${item.color}"
                                        style="width: ${percentage}%"
                                    ></div>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>

                <div class="analytics-panel">
                    <h3>Priority Breakdown</h3>
                    <p class="analytics-subtitle">Tickets by priority level</p>

                    ${renderBars(priorityData, "analytics-priority")}
                </div>

                <div class="analytics-panel">
                    <h3>Issue Categories</h3>
                    <p class="analytics-subtitle">Most reported issue types</p>

                    ${renderBars(categoryBars, "analytics-category")}
                </div>

                <div class="analytics-panel resolution-panel">
                    <h3>Resolution Rate</h3>
                    <p class="analytics-subtitle">Share of tickets resolved</p>

                    <div class="resolution-rate">
                        <strong>${resolutionRate}%</strong>
                        <span>Resolved</span>
                    </div>

                    <div class="analytics-track resolution-rate-track">
                        <div
                            class="analytics-fill analytics-resolved"
                            style="width: ${resolutionRate}%"
                        ></div>
                    </div>

                    <p class="resolution-detail">
                        ${resolvedCount} of ${total} tickets resolved
                    </p>
                </div>

            </div>

            <div class="analytics-panel trend-panel">
                <h3>7-Day Ticket Trend</h3>
                <p class="analytics-subtitle">
                    Number of tickets created each day
                </p>

                <div class="trend-chart">
                    ${trendData.map(function(item) {
                        const height = (item.count / maximumTrend) * 100;

                        return `
                            <div class="trend-column">
                                <strong>${item.count}</strong>

                                <div class="trend-bar-area">
                                    <div
                                        class="trend-bar"
                                        style="height: ${height}%"
                                    ></div>
                                </div>

                                <span>${item.label}</span>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>

        </div>
    `;
}

// Refresh analytics whenever the ticket dashboard refreshes.
const originalDisplayTickets = displayTickets;

displayTickets = function() {
    originalDisplayTickets();
    updateTicketAnalytics();
};

// Initial analytics display.
updateTicketAnalytics();
