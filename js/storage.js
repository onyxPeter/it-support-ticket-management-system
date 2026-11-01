
// ==========================================
// IT SUPPORT MANAGEMENT SYSTEM
// SHARED LOCAL STORAGE
// ==========================================

window.AppStorage = (() => {

    // Read data from Local Storage
    function get(key, fallback = []) {
        try {
            const storedData = localStorage.getItem(key);

            if (storedData === null) {
                return fallback;
            }

            return JSON.parse(storedData);

        } catch (error) {
            console.error(`Error reading ${key}:`, error);
            return fallback;
        }
    }

    // Save data to Local Storage
    function set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;

        } catch (error) {
            console.error(`Error saving ${key}:`, error);
            return false;
        }
    }

    // Retrieve tickets
    function getTickets() {
        return get("tickets", []);
    }

    // Save tickets
    function saveTickets(tickets) {
        return set("tickets", tickets);
    }

    // Retrieve technicians
    function getTechnicians() {
        return get("technicians", []);
    }

    // Save technicians
    function saveTechnicians(technicians) {
        return set("technicians", technicians);
    }

    // Retrieve notifications
    function getNotifications() {
        return get("notifications", []);
    }

    // Save notifications
    function saveNotifications(notifications) {
        return set("notifications", notifications);
    }

    // Public methods
    return {
        get,
        set,
        getTickets,
        saveTickets,
        getTechnicians,
        saveTechnicians,
        getNotifications,
        saveNotifications
    };

})();
