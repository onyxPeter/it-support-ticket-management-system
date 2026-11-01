// ==========================================
// IT SUPPORT MANAGEMENT SYSTEM
// REPORTS MODULE
// ==========================================

window.ReportsManager = (() => {

    let tickets = [];
    let technicians = [];

    // ======================================
    // STORAGE
    // ======================================

    function loadData() {
        tickets = window.AppStorage.getTickets();
        technicians = window.AppStorage.getTechnicians();
    }

    // ======================================
    // HELPERS
    // ======================================

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

    function getPercentage(value, total) {
        return total > 0
            ? Math.round((value / total) * 100)
            : 0;
    }

    function getTicketDate(ticket) {
        const date = ticket.createdAt || ticket.date;
        const parsed = new Date(date);

        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    // ======================================
    // REPORT STATISTICS
    // ======================================

    function getReportStatistics() {

        loadData();

        const total = tickets.length;

        const open = tickets.filter(
            ticket => ticket.status === "Open"
        ).length;

        const inProgress = tickets.filter(
            ticket => ticket.status === "In Progress"
        ).length;

        const resolved = tickets.filter(
            ticket => ticket.status === "Resolved"
        ).length;

        return {
            total,
            open,
            inProgress,
            resolved,
            resolutionRate: getPercentage(resolved, total),
            technicianCount: technicians.length
        };
    }

    // ======================================
    // GROUP TICKETS
    // ======================================

    function groupTickets(property) {

        const groups = {};

        tickets.forEach(ticket => {

            const key = ticket[property] || "Uncategorized";

            groups[key] = (groups[key] || 0) + 1;

        });

        return groups;
    }

    // ======================================
    // DISTRIBUTION COLORS
    // ======================================

    function getDistributionClass(containerId, label) {

        const value = String(label).toLowerCase();

        if (containerId === "reportStatusDistribution") {

            if (value === "open") return "status-open";
            if (value === "in progress") return "status-progress";
            if (value === "resolved") return "status-resolved";

        }

        if (containerId === "reportPriorityDistribution") {

            if (value === "critical") return "priority-critical";
            if (value === "high") return "priority-high";
            if (value === "medium") return "priority-medium";
            if (value === "low") return "priority-low";

        }

        return "distribution-default";
    }

    // ======================================
    // TICKET DISTRIBUTION
    // ======================================

    function renderDistribution(containerId, groups) {

        const container = document.getElementById(containerId);

        if (!container) return;

        const total = Object.values(groups).reduce(
            (sum, value) => sum + value,
            0
        );

        const entries = Object.entries(groups);

        if (entries.length === 0) {

            container.innerHTML = `
                <div class="report-empty">
                    <span>▤</span>
                    <p>No report data available yet.</p>
                </div>
            `;

            return;
        }

        container.innerHTML = entries.map(([label, value]) => {

            const percentage = getPercentage(value, total);
            const colorClass = getDistributionClass(containerId, label);

            return `
                <div class="report-bar-row">

                    <div class="report-bar-heading">

                        <span>${escapeHTML(label)}</span>

                        <strong>
                            ${value}
                            <small>${percentage}%</small>
                        </strong>

                    </div>

                    <div class="report-bar-track">

                        <div
                            class="report-bar-fill ${colorClass}"
                            style="width: ${percentage}%"
                        ></div>

                    </div>

                </div>
            `;

        }).join("");
    }

    // ======================================
    // TECHNICIAN PERFORMANCE
    // ======================================

    function renderTechnicianPerformance() {

        const container = document.getElementById(
            "reportTechnicianPerformance"
        );

        if (!container) return;

        if (technicians.length === 0) {

            container.innerHTML = `
                <div class="report-empty">
                    <span>♙</span>
                    <p>No technicians registered yet.</p>
                </div>
            `;

            return;
        }

        container.innerHTML = `
            <div class="table-container report-table-container">

                <table class="ticket-table report-table">

                    <thead>
                        <tr>
                            <th>Technician</th>
                            <th>Total Assigned</th>
                            <th>In Progress</th>
                            <th>Resolved</th>
                            <th>Resolution Rate</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${technicians.map(technician => {

                            const assigned = tickets.filter(
                                ticket =>
                                    ticket.assignedTechnician === technician.id
                            );

                            const inProgress = assigned.filter(
                                ticket => ticket.status === "In Progress"
                            ).length;

                            const resolved = assigned.filter(
                                ticket => ticket.status === "Resolved"
                            ).length;

                            const rate = getPercentage(
                                resolved,
                                assigned.length
                            );

                            return `
                                <tr>

                                    <td>
                                        <div class="report-technician-name">
                                            <span>
                                                ${escapeHTML(
                                                    technician.name
                                                        .charAt(0)
                                                        .toUpperCase()
                                                )}
                                            </span>

                                            <strong>
                                                ${escapeHTML(technician.name)}
                                            </strong>
                                        </div>
                                    </td>

                                    <td>
                                        <span class="report-count">
                                            ${assigned.length}
                                        </span>
                                    </td>

                                    <td>
                                        <span class="report-count progress-count">
                                            ${inProgress}
                                        </span>
                                    </td>

                                    <td>
                                        <span class="report-count resolved-count">
                                            ${resolved}
                                        </span>
                                    </td>

                                    <td>

                                        <div class="report-completion">

                                            <div class="report-completion-track">
                                                <div
                                                    class="report-completion-fill"
                                                    style="width: ${rate}%"
                                                ></div>
                                            </div>

                                            <strong>${rate}%</strong>

                                        </div>

                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>
        `;
    }

    // ======================================
    // MONTHLY TICKET TREND
    // ======================================

    function renderMonthlyTrend() {

        const container = document.getElementById(
            "reportMonthlyTrend"
        );

        if (!container) return;

        const monthlyData = {};

        tickets.forEach(ticket => {

            const date = getTicketDate(ticket);

            if (!date) return;

            // Numeric year-month key ensures correct chronological sorting.
            const key = `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}`;

            const label = date.toLocaleString("en-US", {
                month: "short",
                year: "numeric"
            });

            if (!monthlyData[key]) {
                monthlyData[key] = {
                    label,
                    count: 0
                };
            }

            monthlyData[key].count++;

        });

        const entries = Object.entries(monthlyData)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-6);

        if (entries.length === 0) {

            container.innerHTML = `
                <div class="report-empty">
                    <span>▥</span>
                    <p>No ticket history available yet.</p>
                </div>
            `;

            return;
        }

        const maximum = Math.max(
            ...entries.map(([, data]) => data.count),
            1
        );

        container.innerHTML = `
            <div class="report-trend-chart">

                ${entries.map(([, data]) => {

                    const height = Math.max(
                        (data.count / maximum) * 100,
                        5
                    );

                    return `
                        <div class="report-trend-column">

                            <strong>${data.count}</strong>

                            <div class="report-trend-track">

                                <div
                                    class="report-trend-fill"
                                    style="height: ${height}%"
                                ></div>

                            </div>

                            <span>${escapeHTML(data.label)}</span>

                        </div>
                    `;

                }).join("")}

            </div>
        `;
    }

    // ======================================
    // UPDATE REPORT OVERVIEW
    // ======================================

    function updateOverview() {

        loadData();

        const total = tickets.length;

        const open = tickets.filter(
            ticket => ticket.status === "Open"
        ).length;

        const inProgress = tickets.filter(
            ticket => ticket.status === "In Progress"
        ).length;

        const resolved = tickets.filter(
            ticket => ticket.status === "Resolved"
        ).length;

        const statistics = {
            total,
            open,
            inProgress,
            resolved,
            resolutionRate: getPercentage(resolved, total),
            technicianCount: technicians.length
        };

        const elements = {
            reportTotalTickets: statistics.total,
            reportOpenTickets: statistics.open,
            reportInProgressTickets: statistics.inProgress,
            reportResolvedTickets: statistics.resolved,
            reportResolutionRate: statistics.resolutionRate + "%",
            reportTechnicianCount: statistics.technicianCount
        };

        Object.entries(elements).forEach(([id, value]) => {

            const element = document.getElementById(id);

            if (element) {
                element.textContent = value;
            }

        });

        renderDistribution(
            "reportStatusDistribution",
            groupTickets("status")
        );

        renderDistribution(
            "reportPriorityDistribution",
            groupTickets("priority")
        );

        renderDistribution(
            "reportCategoryDistribution",
            groupTickets("category")
        );

        renderTechnicianPerformance();

        renderMonthlyTrend();
    }

    // ======================================
    // EXPORT CSV REPORT
    // ======================================

    function exportCSV() {

        loadData();

        if (tickets.length === 0) {
            alert("There are no tickets to export.");
            return;
        }

        const headers = [
            "Ticket ID",
            "Title",
            "Employee",
            "Category",
            "Priority",
            "Status",
            "Assigned Technician",
            "Date Created"
        ];

        const rows = tickets.map(ticket => {

            const technician = technicians.find(
                item => item.id === ticket.assignedTechnician
            );

            return [
                ticket.id,
                ticket.title,
                ticket.name,
                ticket.category,
                ticket.priority,
                ticket.status,
                technician ? technician.name : "Unassigned",
                ticket.date || ticket.createdAt || ""
            ];

        });

        function escapeCSV(value) {
            return '"' + String(value ?? "").replace(/"/g, '""') + '"';
        }

        const csvContent = [
            headers,
            ...rows
        ].map(row => row.map(escapeCSV).join(",")).join("\r\n");

        const blob = new Blob(
            ["\uFEFF" + csvContent],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "IT-Support-Ticket-Report.csv";

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);
    }

    // ======================================
    // INITIALIZE
    // ======================================

    function initialize() {

        loadData();

        updateOverview();

        const exportButton = document.getElementById(
            "exportReportButton"
        );

        if (exportButton) {
            exportButton.addEventListener("click", exportCSV);
        }

    }

    // ======================================
    // PUBLIC METHODS
    // ======================================

    return {

        initialize,

        updateOverview,

        getReportStatistics,

        exportCSV

    };

})();