
// ==========================================
// IT SUPPORT MANAGEMENT SYSTEM
// NOTIFICATION MODULE
// ==========================================

window.NotificationManager = (() => {

    let notifications = [];
    let previousTickets = [];
    let initialized = false;
    let slaTimer = null;
    let changeTimer = null;

    // ======================================
    // STORAGE
    // ======================================

    function loadNotifications() {
        notifications = window.AppStorage.getNotifications();
    }

    function saveNotifications() {
        window.AppStorage.saveNotifications(notifications);
    }

    function getTickets() {
        return window.AppStorage.getTickets();
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

    function addNotification(title, message, type, ticketId, uniqueKey) {

        if (uniqueKey && notifications.some(
            item => item.uniqueKey === uniqueKey
        )) {
            return;
        }

        notifications.unshift({
            id: "NOTIF-" + Date.now() + "-" + Math.random(),
            title,
            message,
            type,
            ticketId: ticketId || null,
            uniqueKey: uniqueKey || null,
            date: new Date().toLocaleString(),
            read: false
        });

        saveNotifications();
        renderNotifications();
    }

    // ======================================
    // NOTIFICATION BELL
    // ======================================

    function createNotificationCenter() {

        const topbar = document.querySelector(".topbar-right");

        if (!topbar || document.getElementById("notificationCenter")) {
            return;
        }

        const center = document.createElement("div");

        center.id = "notificationCenter";
        center.className = "notification-center";

        center.innerHTML = `
            <button
                class="notification-trigger"
                id="notificationTrigger"
                aria-label="Notifications"
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

                <span
                    class="notification-count"
                    id="notificationCount"
                ></span>
            </button>

            <div
                class="notification-panel"
                id="notificationPanel"
                hidden
            >
                <div class="notification-header">
                    <div>
                        <h3>Notifications</h3>
                        <p id="notificationSummary">You're all caught up.</p>
                    </div>

                    <button
                        id="markAllRead"
                        class="notification-action"
                    >
                        Mark all read
                    </button>
                </div>

                <div
                    class="notification-list"
                    id="notificationList"
                ></div>

                <div class="notification-footer">
                    <button
                        id="clearNotifications"
                        class="notification-action"
                    >
                        Clear all
                    </button>
                </div>
            </div>
        `;

        topbar.prepend(center);

        initializeEvents();
        renderNotifications();
    }

    // ======================================
    // RENDER NOTIFICATIONS
    // ======================================

    function renderNotifications() {

        const list = document.getElementById("notificationList");
        const count = document.getElementById("notificationCount");
        const summary = document.getElementById("notificationSummary");

        if (!list || !count) return;

        const unread = notifications.filter(
            notification => !notification.read
        ).length;

        count.textContent = unread > 0
            ? unread > 99 ? "99+" : unread
            : "";

        count.style.display = unread > 0 ? "flex" : "none";

        if (summary) {
            summary.textContent = unread > 0
                ? `${unread} unread notification${unread === 1 ? "" : "s"}`
                : "You're all caught up.";
        }

        if (notifications.length === 0) {

            list.innerHTML = `
                <div class="notification-empty">
                    <p>No notifications yet.</p>
                </div>
            `;

            return;
        }

        list.innerHTML = notifications.map(notification => `

            <button
                class="notification-item ${notification.read ? "" : "unread"}"
                data-id="${escapeHTML(notification.id)}"
                data-ticket="${escapeHTML(notification.ticketId || "")}"
            >

                <span class="notification-item-icon ${escapeHTML(notification.type)}">
                    ${notification.type === "sla" ? "⏰" :
                      notification.type === "resolved" ? "✓" :
                      notification.type === "new" ? "＋" : "●"}
                </span>

                <span class="notification-item-content">
                    <strong>${escapeHTML(notification.title)}</strong>
                    <span>${escapeHTML(notification.message)}</span>
                    <small>${escapeHTML(notification.date)}</small>
                </span>

            </button>

        `).join("");
    }

    // ======================================
    // PANEL EVENTS
    // ======================================

    function closeNotificationPanel() {

        const panel = document.getElementById("notificationPanel");
        const trigger = document.getElementById("notificationTrigger");

        if (panel) panel.hidden = true;

        if (trigger) {
            trigger.setAttribute("aria-expanded", "false");
        }
    }

    function initializeEvents() {

        const trigger = document.getElementById("notificationTrigger");
        const panel = document.getElementById("notificationPanel");
        const list = document.getElementById("notificationList");

        const markAll = document.getElementById("markAllRead");
        const clearAll = document.getElementById("clearNotifications");

        if (trigger && panel) {

            trigger.addEventListener("click", () => {

                const isHidden = panel.hidden;

                panel.hidden = !isHidden;

                trigger.setAttribute(
                    "aria-expanded",
                    String(isHidden)
                );

            });
        }

        document.addEventListener("click", event => {

            const center = document.getElementById("notificationCenter");

            if (center && !center.contains(event.target)) {
                closeNotificationPanel();
            }
        });

        if (markAll) {

            markAll.addEventListener("click", () => {

                notifications = notifications.map(item => ({
                    ...item,
                    read: true
                }));

                saveNotifications();
                renderNotifications();

            });
        }

        if (clearAll) {

            clearAll.addEventListener("click", () => {

                if (!confirm("Clear all notifications?")) return;

                notifications = [];

                saveNotifications();
                renderNotifications();

            });
        }

        if (list) {

            list.addEventListener("click", event => {

                const item = event.target.closest(".notification-item");

                if (!item) return;

                const notification = notifications.find(
                    entry => entry.id === item.dataset.id
                );

                if (!notification) return;

                notification.read = true;

                saveNotifications();

                closeNotificationPanel();

                const ticketId = notification.ticketId;

                if (ticketId) {
                    openTicket(ticketId);
                } else {
                    renderNotifications();
                }

            });
        }
    }

    // ======================================
    // OPEN RELATED TICKET
    // ======================================

    function openTicket(ticketId) {

        const ticket = getTickets().find(
            item => item.id === ticketId
        );

        if (!ticket) {
            renderNotifications();
            return;
        }

        const modal = document.getElementById("ticketModal");

        // If already on the tickets page, open the modal directly.
        if (modal && window.TicketManager) {

            window.TicketManager.viewTicket(ticketId);

        } else {

            // Pass the ticket ID to the tickets page.
            const destination =
                "tickets.html?ticket=" + encodeURIComponent(ticketId);

            window.location.href = destination;

        }

        renderNotifications();
    }

    // ======================================
    // CHECK SLA NOTIFICATIONS
    // ======================================

    function checkSlaNotifications() {

        if (!window.Dashboard) return;

        const tickets = getTickets();

        tickets.forEach(ticket => {

            if (ticket.status === "Resolved") return;

            const sla = window.Dashboard.getSlaStatus(ticket);

            if (sla.label === "Overdue") {

                addNotification(
                    "SLA Overdue",
                    `Ticket ${ticket.id} has exceeded its response target.`,
                    "sla",
                    ticket.id,
                    `overdue-${ticket.id}`
                );

            } else if (sla.label === "Due soon") {

                addNotification(
                    "SLA Due Soon",
                    `Ticket ${ticket.id} is approaching its response deadline.`,
                    "sla",
                    ticket.id,
                    `due-soon-${ticket.id}`
                );

            }

        });
    }

    // ======================================
    // DETECT TICKET CHANGES
    // ======================================

    function checkTicketChanges() {

        const currentTickets = getTickets();

        currentTickets.forEach(ticket => {

            const previousTicket = previousTickets.find(
                item => item.id === ticket.id
            );

            // New ticket
            if (!previousTicket) {

                addNotification(
                    "New Ticket Created",
                    `${ticket.title} was submitted by ${ticket.name}.`,
                    "new",
                    ticket.id,
                    `new-${ticket.id}`
                );

                return;
            }

            // Ticket resolved
            if (
                previousTicket.status !== "Resolved" &&
                ticket.status === "Resolved"
            ) {

                addNotification(
                    "Ticket Resolved",
                    `Ticket ${ticket.id} has been marked as resolved.`,
                    "resolved",
                    ticket.id,
                    `resolved-${ticket.id}`
                );

            }

        });

        previousTickets = currentTickets.map(ticket => ({
            ...ticket
        }));
    }

    // ======================================
    // INITIALIZE MODULE
    // ======================================

    function initialize() {

        if (initialized) return;

        initialized = true;

        loadNotifications();

        previousTickets = getTickets().map(ticket => ({
            ...ticket
        }));

        createNotificationCenter();

        checkSlaNotifications();

        slaTimer = setInterval(() => {
            checkSlaNotifications();
        }, 60000);

        changeTimer = setInterval(() => {
            checkTicketChanges();
        }, 3000);

    }

    // ======================================
    // PUBLIC METHODS
    // ======================================

    return {

        initialize,

        renderNotifications,

        checkSlaNotifications,

        checkTicketChanges,

        addNotification,

        getNotifications: () => [...notifications]

    };

})();
