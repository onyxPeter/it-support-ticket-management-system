
// ==========================================
// IT SUPPORT MANAGEMENT SYSTEM
// DASHBOARD MODULE
// ==========================================

window.Dashboard = (() => {

    // Get shared application data
    function getTickets() {
        return window.AppStorage.getTickets();
    }

    // ======================================
    // SLA MANAGEMENT
    // ======================================

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
                deadline
            };
        }

        const remaining = deadline - Date.now();

        if (remaining < 0) {
            return {
                label: "Overdue",
                className: "sla-overdue",
                deadline
            };
        }

        if (remaining <= 2 * 60 * 60 * 1000) {
            return {
                label: "Due soon",
                className: "sla-warning",
                deadline
            };
        }

        return {
            label: "Within SLA",
            className: "sla-on-track",
            deadline
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

        if (!totalElement || !overdueElement ||
            !dueSoonElement || !onTrackElement) {
            return;
        }

        const tickets = getTickets();

        const activeTickets = tickets.filter(ticket =>
            ticket.status !== "Resolved"
        );

        const overdue = activeTickets.filter(ticket =>
            getSlaStatus(ticket).label === "Overdue"
        );

        const dueSoon = activeTickets.filter(ticket =>
            getSlaStatus(ticket).label === "Due soon"
        );

        const onTrack = activeTickets.filter(ticket =>
            getSlaStatus(ticket).label === "Within SLA"
        );

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
                alertElement.textContent =
                    "No active tickets are overdue.";
            }
        }
    }

    // ======================================
    // DASHBOARD STATISTICS
    // ======================================

    function updateStatistics() {
        const tickets = getTickets();

        const totalElement = document.getElementById("totalTickets");
        const openElement = document.getElementById("openTickets");
        const progressElement = document.getElementById("progressTickets");
        const resolvedElement = document.getElementById("resolvedTickets");

        if (!totalElement || !openElement ||
            !progressElement || !resolvedElement) {
            return;
        }

        totalElement.textContent = tickets.length;

        openElement.textContent = tickets.filter(
            ticket => ticket.status === "Open"
        ).length;

        progressElement.textContent = tickets.filter(
            ticket => ticket.status === "In Progress"
        ).length;

        resolvedElement.textContent = tickets.filter(
            ticket => ticket.status === "Resolved"
        ).length;
    }

    // ======================================
    // DASHBOARD ANALYTICS
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

    function updateTicketAnalytics() {

        // Only render analytics on the actual dashboard page.
        const isDashboardPage =
            document.getElementById("totalTickets") &&
            document.getElementById("openTickets");

        if (!isDashboardPage) return;

        const container = document.querySelector(".analytics-placeholder");

        if (!container) return;

        const tickets = getTickets();
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

        const statuses = [
            { name: "Open", color: "analytics-open" },
            { name: "In Progress", color: "analytics-progress" },
            { name: "Resolved", color: "analytics-resolved" }
        ];

        const priorities = ["Critical", "High", "Medium", "Low"];

        const categories = {};

        tickets.forEach(ticket => {
            const category = ticket.category || "Uncategorized";
            categories[category] = (categories[category] || 0) + 1;
        });

        const categoryData = Object.entries(categories)
            .sort((a, b) => b[1] - a[1]);

        const resolvedCount = tickets.filter(
            ticket => ticket.status === "Resolved"
        ).length;

        const resolutionRate = Math.round(
            (resolvedCount / total) * 100
        );

        // Seven-day ticket trend
        const today = new Date();
        const trendData = [];

        for (let i = 6; i >= 0; i--) {
            const day = new Date(today);

            day.setHours(0, 0, 0, 0);
            day.setDate(day.getDate() - i);

            const nextDay = new Date(day);
            nextDay.setDate(nextDay.getDate() + 1);

            const count = tickets.filter(ticket => {
                const created = ticket.createdAt
                    ? new Date(ticket.createdAt)
                    : new Date(getTicketCreatedAt(ticket));

                return created >= day && created < nextDay;
            }).length;

            trendData.push({
                label: day.toLocaleDateString("en-US", {
                    weekday: "short"
                }),
                count
            });
        }

        const maximumTrend = Math.max(
            1,
            ...trendData.map(item => item.count)
        );

        function renderBars(items, colorClass) {
            const maximum = Math.max(
                1,
                ...items.map(item => item.count)
            );

            return items.map(item => {
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

        const statusData = statuses.map(status => ({
            name: status.name,
            count: tickets.filter(
                ticket => ticket.status === status.name
            ).length,
            color: status.color
        }));

        const priorityData = priorities.map(priority => ({
            name: priority,
            count: tickets.filter(
                ticket => ticket.priority === priority
            ).length
        }));

        const categoryBars = categoryData.map(item => ({
            name: item[0],
            count: item[1]
        }));

        container.innerHTML = `
            <div class="analytics-dashboard">

                <div class="analytics-grid">

                    <div class="analytics-panel">
                        <h3>Ticket Status Distribution</h3>
                        <p class="analytics-subtitle">Current ticket statuses</p>

                        ${statusData.map(item => {
                            const percentage = (item.count / total) * 100;

                            return `
                                <div class="analytics-bar-row">
                                    <div class="analytics-bar-heading">
                                        <span>${escapeHTML(item.name)}</span>
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
                        ${trendData.map(item => {
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

                                    <span>${escapeHTML(item.label)}</span>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>

            </div>
        `;
    }

    // ======================================
    // INITIALIZE DASHBOARD
    // ======================================

    function initialize() {
        updateStatistics();
        updateSlaOverview();
        updateTicketAnalytics();
    }

    // Public dashboard functions
    return {
        initialize,
        updateStatistics,
        updateSlaOverview,
        updateTicketAnalytics,
        getSlaStatus,
        getSlaDeadline,
        formatSlaDeadline,
        getTicketCreatedAt
    };

})();
