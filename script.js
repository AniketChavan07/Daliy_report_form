/* =======================================================
   DAILY REPORT SCRIPT
   Handles initialization, table generation, data import/export,
   calculations, email, and printing.
======================================================= */

/* ----------------- INIT ------------------ */
document.addEventListener('DOMContentLoaded', initializeForm);

/**
 * Initialize form when page loads
 */
function initializeForm() {
    generateRoomRows();   // Generate rows for rooms & RV spots
    setCurrentDate();     // Pre-fill today's date & day
    calculateTotals();    // Initialize total sales calculation
}

/* ----------------- HELPERS ------------------ */
/**
 * Generate a range of numbers, optionally excluding some.
 * @param {number} start - Starting number
 * @param {number} end - Ending number
 * @param {Array<number>} exclude - Numbers to exclude
 * @returns {Array<number>}
 */
function range(start, end, exclude = []) {
    let arr = [];
    for (let i = start; i <= end; i++) {
        if (!exclude.includes(i)) arr.push(i);
    }
    return arr;
}

/* ----------------- TABLE GENERATION ------------------ */
/**
 * Generate table rows for rooms and RV spots
 */
function generateRoomRows() {
    const roomTable1 = document.getElementById('roomTable1');
    const roomTable2 = document.getElementById('roomTable2');
    const rvTable = document.getElementById('rvTable');

    // Define ranges of rooms/spots
    const page1Rooms = [...range(101, 112), ...range(114, 131)];
    const page2Rooms = range(134, 137);
    const rvSpots = range(1, 17, [6]); // Skip spot 6

    // Generate rows
    roomTable1.innerHTML = page1Rooms.map(num => createRoomRow(num, 'page1')).join('');
    roomTable2.innerHTML = page2Rooms.map(num => createRoomRow(num, 'page2')).join('');
    rvTable.innerHTML = rvSpots.map(num => createRoomRow(num, 'rv')).join('');

    // Attach listeners to recalculate totals when values change
    document.querySelectorAll('input[type="number"]').forEach(input =>
        input.addEventListener('input', calculateTotals)
    );
}

/**
 * Create a table row for a room/RV spot
 * @param {number} number - Room/spot number
 * @param {string} section - Section identifier
 * @returns {string} HTML string for row
 */
function createRoomRow(number, section) {
    return `
    <tr>
        <td>${number}</td>
        <td><input type="text" data-section="${section}" data-room="${number}" data-field="name"></td>
        <td><input type="number" class="rent-input" data-section="${section}" data-room="${number}" data-field="rent" step="0.01"></td>
        <td><input type="number" class="tax-input" data-section="${section}" data-room="${number}" data-field="tax" step="0.01"></td>
        <td><input type="number" class="misc-input" data-section="${section}" data-room="${number}" data-field="misc" step="0.01"></td>
        <td><input type="checkbox" data-section="${section}" data-room="${number}" data-field="checkin"></td>
        <td><input type="checkbox" data-section="${section}" data-room="${number}" data-field="checkout"></td>
        <td><input type="number" class="balance-input" data-section="${section}" data-room="${number}" data-field="balance" step="0.01"></td>
        <td><input type="checkbox" data-section="${section}" data-room="${number}" data-field="paid"></td>
    </tr>`;
}

/* ----------------- TOTAL CALCULATIONS ------------------ */
/**
 * Calculate total sales from Rent + Tax + Misc fields
 */
function calculateTotals() {
    const rentInputs = document.querySelectorAll('.rent-input');
    const taxInputs = document.querySelectorAll('.tax-input');
    const miscInputs = document.querySelectorAll('.misc-input');

    let total = 0;
    rentInputs.forEach(i => total += parseFloat(i.value) || 0);
    taxInputs.forEach(i => total += parseFloat(i.value) || 0);
    miscInputs.forEach(i => total += parseFloat(i.value) || 0);

    document.getElementById('totalSales').value = total.toFixed(2);
}

/* ----------------- DATE ------------------ */
/**
 * Set current date and weekday in form
 */
function setCurrentDate() {
    const today = new Date();
    document.getElementById('reportDate').value = today.toISOString().split('T')[0];
    document.getElementById('reportDay').value = today.toLocaleDateString('en-US', { weekday: 'long' });
}

/* ----------------- FILE IMPORT / EXPORT ------------------ */
/**
 * Trigger hidden file input for import
 */
function importData() {
    document.getElementById('fileInput').click();
}

/**
 * Handle file upload (CSV/Excel)
 */
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        fillFormFromCSV(rows);
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Fill form fields from CSV/Excel data
 */
function fillFormFromCSV(rows) {
    const tables = [
        document.getElementById('roomTable1'),
        document.getElementById('roomTable2'),
        document.getElementById('rvTable')
    ];

    let rowIndex = 1; // skip header row
    tables.forEach(table => {
        table.querySelectorAll('tr').forEach(tr => {
            if (rows[rowIndex]) {
                tr.querySelectorAll('input').forEach((input, i) => {
                    const val = rows[rowIndex][i];
                    if (input.type === "checkbox") {
                        input.checked = (val === "TRUE" || val === "Yes" || val === 1);
                    } else {
                        input.value = val || "";
                    }
                });
                rowIndex++;
            }
        });
    });
}

/**
 * Export table data to CSV/Excel
 */
function exportCSV() {
    const tables = [
        document.getElementById('roomTable1'),
        document.getElementById('roomTable2'),
        document.getElementById('rvTable')
    ];

    const headers = ["Room No","Name","Rent","Tax","Misc","CheckIN","CheckOUT","Balance","Paid"];
    let data = [headers];

    // Collect rows
    tables.forEach(table => table.querySelectorAll('tr').forEach(tr => {
        const row = Array.from(tr.querySelectorAll('td')).map(td => {
            const input = td.querySelector('input');
            if (!input) return td.textContent.trim();
            return input.type === "checkbox" ? (input.checked ? "TRUE" : "FALSE") : input.value;
        });
        data.push(row);
    }));

    // Export as Excel
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "report.xlsx");
}

/**
 * Export table data to PDF
 */
function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Daily Report", 10, 10);

    let y = 20;
    const tables = [
        document.getElementById('roomTable1'),
        document.getElementById('roomTable2'),
        document.getElementById('rvTable')
    ];

    tables.forEach((table, idx) => {
        doc.text(`Table ${idx + 1}`, 10, y); 
        y += 8;
        table.querySelectorAll('tr').forEach(tr => {
            const inputs = tr.querySelectorAll('input');
            if (inputs.length === 0) return;
            const rowData = Array.from(inputs).map(i => i.type === "checkbox" ? (i.checked ? "Yes" : "No") : i.value);
            doc.text(rowData.join(" | "), 10, y); 
            y += 8;
            if (y > 280) { // Add new page if needed
                doc.addPage();
                y = 20;
            }
        });
        y += 10;
    });

    doc.save("report.pdf");
}

/* ----------------- EMAIL REPORT ------------------ */
/**
 * Send report via EmailJS (plain text format)
 */
function emailReport() {
    const tables = [
        document.getElementById('roomTable1'),
        document.getElementById('roomTable2'),
        document.getElementById('rvTable')
    ];

    // Build report text
    let reportText = `DAILY REPORT\n`;
    reportText += `Date: ${document.getElementById('reportDate').value} | Day: ${document.getElementById('reportDay').value}\n\n`;

    reportText += `SUMMARY\nTotal Cash: ${document.getElementById('totalCash').value}\nTotal Credit: ${document.getElementById('totalCredit').value}\nBank Deposit: ${document.getElementById('bankDeposit').value}\nTotal Sales: ${document.getElementById('totalSales').value}\n#2 Misc: ${document.getElementById('misc2').value}\nOpen Acct: ${document.getElementById('openAcct').value}\nPIA #: ${document.getElementById('piaNumber').value}\n\n`;

    tables.forEach((table, idx) => {
        const name = idx === 0 ? "Page 1 - Rooms" : idx === 1 ? "Page 2 - Rooms" : "RV / Storage";
        reportText += `${name}\n`;
        reportText += Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim()).join(" | ") + "\n";
        table.querySelectorAll('tr').forEach(tr => {
            const inputs = tr.querySelectorAll('input');
            if (inputs.length === 0) return;
            reportText += Array.from(inputs).map(i => i.type === "checkbox" ? (i.checked ? "Yes" : "No") : i.value).join(" | ") + "\n";
        });
        reportText += "\n";
    });

    // EmailJS parameters
    const templateParams = {
        subject: "Daily Report",
        message: reportText,
        to_email: "manager@example.com"
    };

    emailjs.send("service_hd3f1ki", "template_c77u3cl", templateParams)
        .then(() => alert("Email sent successfully!"))
        .catch(error => alert("Failed to send email: " + JSON.stringify(error)));
}

/* ----------------- PRINT / CLEAR ------------------ */
/**
 * Print the report
 */
function printReport() {
    window.print();
}

/**
 * Clear all input fields & reset form
 */
function clearForm() {
    document.querySelectorAll("input").forEach(i => {
        if (i.type === "checkbox") i.checked = false;
        else i.value = "";
    });
    setCurrentDate();
    calculateTotals();
}
