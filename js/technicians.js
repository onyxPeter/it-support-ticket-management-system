
// ==========================================
// IT SUPPORT MANAGEMENT SYSTEM
// TECHNICIAN MANAGEMENT MODULE
// ==========================================

window.TechnicianManager = (() => {

    let technicians = [];
    let tickets = [];

    // ======================================
    // STORAGE
    // ======================================

    function loadData() {
        technicians = window.AppStorage.getTechnicians();
        tickets = window.AppStorage.getTickets();
    }

    function saveTechnicians() {
        window.AppStorage.saveTechnicians(technicians);
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

    // ======================================
    // TECHNICIAN WORKLOAD
    // ======================================

    function getTechnicianWorkload(technicianId) {

        const assignedTickets = tickets.filter(
            ticket => ticket.assignedTechnician === technicianId
        );

        return {
            total: assignedTickets.length,

            inProgress: assignedTickets.filter(
                ticket => ticket.status === "In Progress"
            ).length,

            resolved: assignedTickets.filter(
                ticket => ticket.status === "Resolved"
            ).length
        };
    }

    // ======================================
    // DISPLAY TECHNICIANS
    // ======================================

    function displayTechnicians() {

        loadData();

        const container = document.getElementById(
            "techniciansContainer"
        );

        if (!container) return;

        if (technicians.length === 0) {

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👨‍💻</div>
                    <h3>No technicians added</h3>
                    <p>Add a technician to start managing your support team.</p>
                </div>
            `;

            return;
        }

        let tableHTML = `
            <div class="table-container">
                <table class="ticket-table">

                    <thead>
                        <tr>
                            <th>Technician</th>
                            <th>Email</th>
                            <th>Total Assigned</th>
                            <th>In Progress</th>
                            <th>Resolved</th>
                            <th>Date Added</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
        `;

        technicians.forEach(technician => {

            const workload = getTechnicianWorkload(
                technician.id
            );

            tableHTML += `
                <tr>

                    <td>
                        <strong>${escapeHTML(technician.name)}</strong>
                    </td>

                    <td>${escapeHTML(technician.email)}</td>

                    <td>${workload.total}</td>

                    <td>${workload.inProgress}</td>

                    <td>${workload.resolved}</td>

                    <td>${escapeHTML(technician.dateAdded || "N/A")}</td>

                    <td>
                        <button
                            class="delete-technician"
                            data-id="${escapeHTML(technician.id)}"
                        >
                            Remove
                        </button>
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
    // ADD TECHNICIAN
    // ======================================

    function initializeTechnicianForm() {

        const form = document.getElementById(
            "technicianForm"
        );

        if (!form) return;

        form.addEventListener("submit", event => {

            event.preventDefault();

            const nameInput = document.getElementById(
                "technicianName"
            );

            const emailInput = document.getElementById(
                "technicianEmail"
            );

            if (!nameInput || !emailInput) return;

            const name = nameInput.value.trim();
            const email = emailInput.value.trim().toLowerCase();

            if (!name || !email) {
                alert("Please enter the technician's name and email.");
                return;
            }

            loadData();

            const emailExists = technicians.some(
                technician =>
                    technician.email.toLowerCase() === email
            );

            if (emailExists) {
                alert("A technician with this email already exists.");
                return;
            }

            const newTechnician = {

                id: "TECH-" + Date.now(),

                name,

                email,

                dateAdded: new Date().toLocaleString()

            };

            technicians.push(newTechnician);

            saveTechnicians();

            form.reset();

            refresh();

        });
    }

    // ======================================
    // REMOVE TECHNICIAN
    // ======================================

    function removeTechnician(technicianId) {

        const technician = technicians.find(
            item => item.id === technicianId
        );

        if (!technician) return;

        const confirmed = confirm(
            `Are you sure you want to remove ${technician.name}?`
        );

        if (!confirmed) return;

        loadData();

        const currentTechnician = technicians.find(
            item => item.id === technicianId
        );

        if (!currentTechnician) return;

        const currentDate = new Date().toLocaleString();

        tickets.forEach(ticket => {

            if (ticket.assignedTechnician === technicianId) {

                ticket.assignedTechnician = null;

                if (!Array.isArray(ticket.activity)) {
                    ticket.activity = [];
                }

                ticket.activity.push({

                    action: "Technician removed",

                    details: `${currentTechnician.name} was removed. Ticket is now unassigned.`,

                    date: currentDate,

                    type: "assignment"

                });
            }

        });

        technicians = technicians.filter(
            item => item.id !== technicianId
        );

        saveTechnicians();
        saveTickets();

        refresh();

        if (window.TicketManager) {
            window.TicketManager.refresh();
        }
    }

    // ======================================
    // REMOVE BUTTON EVENTS
    // ======================================

    function initializeTechnicianActions() {

        const container = document.getElementById(
            "techniciansContainer"
        );

        if (!container) return;

        container.addEventListener("click", event => {

            const button = event.target.closest(
                ".delete-technician"
            );

            if (!button) return;

            const technicianId = button.dataset.id;

            if (technicianId) {
                removeTechnician(technicianId);
            }

        });
    }

    // ======================================
    // REFRESH MODULE
    // ======================================

    function refresh() {

        loadData();

        displayTechnicians();

    }

    // ======================================
    // INITIALIZE MODULE
    // ======================================

    function initialize() {

        loadData();

        initializeTechnicianForm();

        initializeTechnicianActions();

        displayTechnicians();

    }

    return {

        initialize,

        refresh,

        displayTechnicians,

        getTechnicians: () => [...technicians],

        getTechnicianWorkload

    };

})();
