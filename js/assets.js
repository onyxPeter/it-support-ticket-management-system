
// ==========================================
// IT SUPPORT MANAGEMENT SYSTEM
// ASSET MANAGEMENT MODULE
// ==========================================

window.AssetManager = (() => {

    let assets = [];

    // ======================================
    // STORAGE
    // ======================================

    function loadAssets() {
        assets = window.AppStorage.get("assets", []);
    }

    function saveAssets() {
        window.AppStorage.set("assets", assets);
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

    function generateAssetId() {
        return "AST-" + Date.now();
    }

    // ======================================
    // ASSET STATISTICS
    // ======================================

    function getStatistics() {
        return {
            total: assets.length,

            active: assets.filter(
                asset => asset.status === "Active"
            ).length,

            maintenance: assets.filter(
                asset => asset.status === "Under Maintenance"
            ).length,

            retired: assets.filter(
                asset => asset.status === "Retired"
            ).length
        };
    }

    // ======================================
    // DISPLAY ASSETS
    // ======================================

    function displayAssets() {

        loadAssets();

        const container = document.getElementById(
            "assetsContainer"
        );

        if (!container) return;

        if (assets.length === 0) {

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💻</div>
                    <h3>No assets registered</h3>
                    <p>Register your organization's first IT asset.</p>
                </div>
            `;

            updateStatistics();
            return;
        }

        let tableHTML = `
            <div class="table-container">
                <table class="ticket-table">

                    <thead>
                        <tr>
                            <th>Asset ID</th>
                            <th>Asset Name</th>
                            <th>Category</th>
                            <th>Serial Number</th>
                            <th>Assigned To</th>
                            <th>Condition</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
        `;

        assets.forEach(asset => {

            tableHTML += `
                <tr>

                    <td class="ticket-id">
                        ${escapeHTML(asset.id)}
                    </td>

                    <td>
                        <strong>${escapeHTML(asset.name)}</strong>
                    </td>

                    <td>${escapeHTML(asset.category)}</td>

                    <td>${escapeHTML(asset.serialNumber)}</td>

                    <td>${escapeHTML(asset.assignedTo || "Unassigned")}</td>

                    <td>${escapeHTML(asset.condition)}</td>

                    <td>
                        <span class="asset-status">
                            ${escapeHTML(asset.status)}
                        </span>
                    </td>

                    <td>
                        <div class="table-actions">

                            <button
                                class="view-asset"
                                data-id="${escapeHTML(asset.id)}"
                            >
                                View
                            </button>

                            <button
                                class="edit-asset"
                                data-id="${escapeHTML(asset.id)}"
                            >
                                Edit
                            </button>

                            <button
                                class="delete-asset"
                                data-id="${escapeHTML(asset.id)}"
                            >
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

        updateStatistics();
    }

    // ======================================
    // UPDATE ASSET STATISTICS
    // ======================================

    function updateStatistics() {

        const statistics = getStatistics();

        const elements = {
            totalAssets: statistics.total,
            activeAssets: statistics.active,
            maintenanceAssets: statistics.maintenance,
            retiredAssets: statistics.retired
        };

        Object.entries(elements).forEach(([id, value]) => {

            const element = document.getElementById(id);

            if (element) {
                element.textContent = value;
            }

        });
    }

    // ======================================
    // REGISTER NEW ASSET
    // ======================================

    function initializeAssetForm() {

        const form = document.getElementById("assetForm");

        if (!form) return;

        form.addEventListener("submit", event => {

            event.preventDefault();

            const name = document.getElementById("assetName")?.value.trim();
            const category = document.getElementById("assetCategory")?.value;
            const serialNumber = document.getElementById("serialNumber")?.value.trim();
            const assignedTo = document.getElementById("assignedTo")?.value.trim();
            const condition = document.getElementById("assetCondition")?.value;
            const status = document.getElementById("assetStatus")?.value;

            if (!name || !category || !serialNumber || !condition || !status) {
                alert("Please complete all required asset details.");
                return;
            }

            loadAssets();

            const serialExists = assets.some(
                asset => asset.serialNumber.toLowerCase() === serialNumber.toLowerCase()
            );

            if (serialExists) {
                alert("An asset with this serial number already exists.");
                return;
            }

            const newAsset = {

                id: generateAssetId(),

                name,

                category,

                serialNumber,

                assignedTo: assignedTo || "",

                condition,

                status,

                dateAdded: new Date().toLocaleString(),

                maintenanceHistory: []

            };

            assets.push(newAsset);

            saveAssets();

            form.reset();

            refresh();

        });
    }

    // ======================================
    // EDIT ASSET
    // ======================================

    function editAsset(assetId) {

        const asset = assets.find(item => item.id === assetId);

        if (!asset) return;

        const newName = prompt("Asset name:", asset.name);

        if (newName === null || !newName.trim()) return;

        const newSerial = prompt("Serial number:", asset.serialNumber);

        if (newSerial === null || !newSerial.trim()) return;

        const newAssignedTo = prompt(
            "Assigned employee:",
            asset.assignedTo || ""
        );

        if (newAssignedTo === null) return;

        const newCondition = prompt(
            "Condition (Good, Fair, Poor):",
            asset.condition
        );

        if (newCondition === null || !newCondition.trim()) return;

        const newStatus = prompt(
            "Status (Active, Under Maintenance, Retired):",
            asset.status
        );

        if (newStatus === null || !newStatus.trim()) return;

        const duplicateSerial = assets.some(
            item =>
                item.id !== assetId &&
                item.serialNumber.toLowerCase() === newSerial.trim().toLowerCase()
        );

        if (duplicateSerial) {
            alert("Another asset already uses this serial number.");
            return;
        }

        asset.name = newName.trim();
        asset.serialNumber = newSerial.trim();
        asset.assignedTo = newAssignedTo.trim();
        asset.condition = newCondition.trim();
        asset.status = newStatus.trim();

        saveAssets();

        refresh();
    }

    // ======================================
    // DELETE ASSET
    // ======================================

    function deleteAsset(assetId) {

        const confirmed = confirm(
            "Are you sure you want to delete this asset?"
        );

        if (!confirmed) return;

        assets = assets.filter(
            asset => asset.id !== assetId
        );

        saveAssets();

        refresh();
    }

    // ======================================
    // VIEW ASSET DETAILS
    // ======================================

    function viewAsset(assetId) {

        const asset = assets.find(
            item => item.id === assetId
        );

        if (!asset) return;

        const maintenance = Array.isArray(asset.maintenanceHistory)
            ? asset.maintenanceHistory
            : [];

        const maintenanceText = maintenance.length
            ? maintenance.map(item =>
                `${item.date}: ${item.description}`
            ).join("\n")
            : "No maintenance records.";

        alert(`
ASSET DETAILS

Asset ID: ${asset.id}
Name: ${asset.name}
Category: ${asset.category}
Serial Number: ${asset.serialNumber}
Assigned To: ${asset.assignedTo || "Unassigned"}
Condition: ${asset.condition}
Status: ${asset.status}
Date Added: ${asset.dateAdded}

MAINTENANCE HISTORY

${maintenanceText}
        `);
    }

    // ======================================
    // RECORD MAINTENANCE
    // ======================================

    function addMaintenanceRecord(assetId, description) {

        const asset = assets.find(
            item => item.id === assetId
        );

        if (!asset || !description.trim()) return;

        if (!Array.isArray(asset.maintenanceHistory)) {
            asset.maintenanceHistory = [];
        }

        asset.maintenanceHistory.push({

            date: new Date().toLocaleString(),

            description: description.trim()

        });

        saveAssets();

        refresh();
    }

    // ======================================
    // TABLE ACTIONS
    // ======================================

    function initializeTableActions() {

        const container = document.getElementById(
            "assetsContainer"
        );

        if (!container) return;

        container.addEventListener("click", event => {

            const button = event.target.closest("button");

            if (!button) return;

            const assetId = button.dataset.id;

            if (!assetId) return;

            if (button.classList.contains("view-asset")) {
                viewAsset(assetId);
            }

            if (button.classList.contains("edit-asset")) {
                editAsset(assetId);
            }

            if (button.classList.contains("delete-asset")) {
                deleteAsset(assetId);
            }

        });
    }

    // ======================================
    // REFRESH
    // ======================================

    function refresh() {

        loadAssets();

        displayAssets();

    }

    // ======================================
    // INITIALIZE MODULE
    // ======================================

    function initialize() {

        loadAssets();

        initializeAssetForm();

        initializeTableActions();

        displayAssets();

    }

    // ======================================
    // PUBLIC METHODS
    // ======================================

    return {

        initialize,

        refresh,

        displayAssets,

        getAssets: () => [...assets],

        getStatistics,

        addMaintenanceRecord

    };

})();
