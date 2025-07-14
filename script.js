// GNPC Staff Clock-In System - Clean Implementation
// Uses localStorage for data persistence (frontend-only solution)

// Initialize system with default data
function initializeSystem() {
    // Set default admin password if not exists
    if (!localStorage.getItem("adminPassword")) {
        localStorage.setItem("adminPassword", "admin123");
    }
    
    // Initialize default staff for demo if none exist
    let staffData = JSON.parse(localStorage.getItem("staffData")) || {};
    if (Object.keys(staffData).length === 0) {
        staffData = {
            "staff1": { name: "John Doe", nfc: "NFC123" },
            "staff2": { name: "Jane Smith", nfc: "NFC456" },
            "staff3": { name: "Bob Johnson", nfc: "NFC789" }
        };
        localStorage.setItem("staffData", JSON.stringify(staffData));
    }
}

// Sanitize input to prevent XSS attacks
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/[<>'"&]/g, function(match) {
        switch (match) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#x27;';
            case '&': return '&amp;';
            default: return match;
        }
    });
}

// NFC Reading functionality
function initializeNFC() {
    const readButton = document.getElementById('read-nfc');
    if (readButton) {
        readButton.addEventListener('click', async () => {
            try {
                if ('NDEFReader' in window) {
                    const nfc = new NDEFReader();
                    await nfc.scan();
                    updateNFCStatus("NFC scan started successfully. Tap your card...");

                    nfc.addEventListener('reading', event => {
                        const message = event.message;
                        for (const record of message.records) {
                            const serial = new TextDecoder().decode(record.data);
                            handleNFCTap(serial);
                        }
                    });
                } else {
                    updateNFCStatus("NFC is not supported on this device. Use demo mode below.");
                }
            } catch (error) {
                console.error("Error reading NFC tag:", error);
                updateNFCStatus("Error starting NFC scan. Use demo mode below.");
            }
        });
    }
}

// Update NFC status display
function updateNFCStatus(message) {
    const statusElement = document.getElementById("nfcStatus");
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Update clock message display
function updateClockMessage(message, color = "black") {
    const messageElement = document.getElementById("clockMessage");
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.color = color;
    }
}

// Handle NFC tap (real or simulated)
function handleNFCTap(serial) {
    // Sanitize input
    const sanitizedSerial = sanitizeInput(serial);
    
    updateNFCStatus(`Detected NFC: ${sanitizedSerial}`);
    
    let staffData = JSON.parse(localStorage.getItem("staffData")) || {};
    let clockHistory = JSON.parse(localStorage.getItem("clockHistory")) || {};
    
    // Find staff by NFC serial
    let foundStaff = null;
    let staffId = null;
    
    for (let id in staffData) {
        if (staffData[id].nfc === sanitizedSerial) {
            foundStaff = staffData[id];
            staffId = id;
            break;
        }
    }
    
    if (foundStaff) {
        const now = new Date().toLocaleString();
        
        if (!clockHistory[staffId]) clockHistory[staffId] = [];
        const lastEntry = clockHistory[staffId][clockHistory[staffId].length - 1];
        
        if (lastEntry && !lastEntry.clockOut) {
            // Clock out
            lastEntry.clockOut = now;
            updateClockMessage(`${sanitizeInput(foundStaff.name)} clocked out at ${now}`, "orange");
        } else {
            // Clock in
            clockHistory[staffId].push({ clockIn: now, clockOut: null });
            updateClockMessage(`${sanitizeInput(foundStaff.name)} clocked in at ${now}`, "green");
        }
        
        localStorage.setItem("clockHistory", JSON.stringify(clockHistory));
    } else {
        updateClockMessage("Staff not found for this NFC card", "red");
    }
}

// Demo function for testing
function simulateNFC(serial) {
    handleNFCTap(serial);
}

// Admin login function
function adminLogin() {
    const username = sanitizeInput(document.getElementById("username").value.trim());
    const password = document.getElementById("password").value;
    const message = document.getElementById("loginMessage");
    
    if (!username || !password) {
        showMessage(message, "Please enter both username and password", "red");
        return;
    }
    
    const storedPassword = localStorage.getItem("adminPassword") || "admin123";
    
    if (username === "admin" && password === storedPassword) {
        document.getElementById("loginPage").classList.remove("active");
        document.getElementById("adminPanel").classList.add("active");
        // Clear login form
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
        clearMessage(message);
    } else {
        showMessage(message, "Invalid credentials", "red");
    }
}

// Logout function
function logout() {
    document.getElementById("adminPanel").classList.remove("active");
    document.getElementById("loginPage").classList.add("active");
    // Hide password change section if visible
    const passwordSection = document.getElementById("passwordChangeSection");
    if (passwordSection) {
        passwordSection.style.display = "none";
    }
}

// Add staff function
function addStaff() {
    const name = sanitizeInput(document.getElementById("staffName").value.trim());
    const nfc = sanitizeInput(document.getElementById("staffNFC").value.trim());
    const message = document.getElementById("addStaffMessage");
    
    if (!name || !nfc) {
        showMessage(message, "Please fill all fields", "red");
        return;
    }
    
    let staffData = JSON.parse(localStorage.getItem("staffData")) || {};
    
    // Check if NFC already exists
    for (let id in staffData) {
        if (staffData[id].nfc === nfc) {
            showMessage(message, "NFC serial already exists", "red");
            return;
        }
    }
    
    const staffId = Date.now().toString();
    staffData[staffId] = { name, nfc };
    localStorage.setItem("staffData", JSON.stringify(staffData));
    
    showMessage(message, "Staff added successfully", "green");
    
    // Clear form
    document.getElementById("staffName").value = "";
    document.getElementById("staffNFC").value = "";
}

// Search history function
function searchHistory() {
    const search = sanitizeInput(document.getElementById("searchStaff").value.trim().toLowerCase());
    const output = document.getElementById("historyOutput");
    
    if (!search) {
        output.innerHTML = "<p style='color: red;'>Please enter a search term</p>";
        return;
    }
    
    const staffData = JSON.parse(localStorage.getItem("staffData")) || {};
    const clockHistory = JSON.parse(localStorage.getItem("clockHistory")) || {};
    
    let results = [];
    
    for (let id in staffData) {
        const staff = staffData[id];
        if (staff.name.toLowerCase().includes(search) || staff.nfc.toLowerCase().includes(search)) {
            results.push({ id, staff, history: clockHistory[id] || [] });
        }
    }
    
    displayResults(results, output);
}

// Show all history
function showAllHistory() {
    const output = document.getElementById("historyOutput");
    const staffData = JSON.parse(localStorage.getItem("staffData")) || {};
    const clockHistory = JSON.parse(localStorage.getItem("clockHistory")) || {};
    
    let results = [];
    
    for (let id in staffData) {
        results.push({ id, staff: staffData[id], history: clockHistory[id] || [] });
    }
    
    displayResults(results, output);
}
// Hide all history
function hideAllHistory() {
    const output = document.getElementById("historyOutput");
    output.style.opacity = "0";
    setTimeout(() => {
        output.innerHTML = "";
        output.style.opacity = "1";
    }, 500); // Wait for fade to complete
}


// Display search results safely
function displayResults(results, output) {
    if (results.length === 0) {
        output.innerHTML = "<p style='color: orange;'>No results found</p>";
        return;
    }
    
    let html = "";
    results.forEach(result => {
        html += `<div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc;">`;
        html += `<h3>${sanitizeInput(result.staff.name)} (NFC: ${sanitizeInput(result.staff.nfc)})</h3>`;
        
        if (result.history.length === 0) {
            html += `<p style="color: gray;">No clock history</p>`;
        } else {
            result.history.forEach(entry => {
                const clockOut = entry.clockOut || "Still clocked in";
                html += `<p><strong>Clock In:</strong> ${sanitizeInput(entry.clockIn)} - <strong>Clock Out:</strong> ${sanitizeInput(clockOut)}</p>`;
            });
        }
        
        html += `</div>`;
    });
    
    output.style.opacity = "0";
setTimeout(() => {
    output.innerHTML = html;
    output.style.opacity = "1";
}, 50);

}

// Change password function
function changePassword() {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmNewPassword = document.getElementById("confirmNewPassword").value;
    const message = document.getElementById("passwordChangeMessage");
    const storedPassword = localStorage.getItem("adminPassword") || "admin123";

    // Validate current password
    if (currentPassword !== storedPassword) {
        showMessage(message, "Current password is incorrect", "red");
        return;
    }

    // Check if new password and confirmation match
    if (newPassword !== confirmNewPassword) {
        showMessage(message, "New password and confirmation do not match", "red");
        return;
    }

    // Validate new password
    if (newPassword.length < 6) {
        showMessage(message, "New password must be at least 6 characters long", "red");
        return;
    }

    // Update password
    localStorage.setItem("adminPassword", newPassword);
    showMessage(message, "Password changed successfully!", "green");
    
    // Clear fields
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmNewPassword").value = "";
}

// Utility functions for message display
function showMessage(element, text, color) {
    if (element) {
        element.textContent = text;
        element.style.color = color;
    }
}

function clearMessage(element) {
    if (element) {
        element.textContent = "";
    }
}

// Initialize system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSystem();
    initializeNFC();
    
    // Add Enter key listener for login
    const passwordField = document.getElementById("password");
    if (passwordField) {
        passwordField.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                adminLogin();
            }
        });
    }
});