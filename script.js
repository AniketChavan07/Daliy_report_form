/* ----------------- DATA ------------------ */
document.addEventListener('DOMContentLoaded', initializeForm);

/* ----------------- HELPERS ------------------ */
function range(start, end, exclude = []) {
    let arr = [];
    for (let i = start; i <= end; i++) if(!exclude.includes(i)) arr.push(i);
    return arr;
}

/* ----------------- INIT ------------------ */
function initializeForm() {
    generateRoomRows();
    setCurrentDate();
    calculateTotals();
}

/* ----------------- TABLE GENERATION ------------------ */
function generateRoomRows() {
    const roomTable1 = document.getElementById('roomTable1');
    const roomTable2 = document.getElementById('roomTable2');
    const rvTable = document.getElementById('rvTable');

    const page1Rooms = [...range(101, 112), ...range(114, 131)];
    const page2Rooms = range(134, 137);
    const rvSpots = range(1, 17, [6]);

    roomTable1.innerHTML = page1Rooms.map(num => createRoomRow(num, 'page1')).join('');
    roomTable2.innerHTML = page2Rooms.map(num => createRoomRow(num, 'page2')).join('');
    rvTable.innerHTML = rvSpots.map(num => createRoomRow(num, 'rv')).join('');

    document.querySelectorAll('input[type="number"]').forEach(input =>
        input.addEventListener('input', calculateTotals)
    );
}

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
function calculateTotals() {
    const rentInputs = document.querySelectorAll('.rent-input');
    const taxInputs = document.querySelectorAll('.tax-input');
    const miscInputs = document.querySelectorAll('.misc-input');
    let total = 0;
    rentInputs.forEach(i => total += parseFloat(i.value)||0);
    taxInputs.forEach(i => total += parseFloat(i.value)||0);
    miscInputs.forEach(i => total += parseFloat(i.value)||0);
    document.getElementById('totalSales').value = total.toFixed(2);
}

/* ----------------- DATE ------------------ */
function setCurrentDate() {
    const today = new Date();
    document.getElementById('reportDate').value = today.toISOString().split('T')[0];
    document.getElementById('reportDay').value = today.toLocaleDateString('en-US', { weekday: 'long' });
}

/* ----------------- FILE IMPORT / EXPORT ------------------ */
function importData() { document.getElementById('fileInput').click(); }

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

function fillFormFromCSV(rows) {
    const tables = [document.getElementById('roomTable1'), document.getElementById('roomTable2'), document.getElementById('rvTable')];
    let rowIndex = 1; // skip header
    tables.forEach(table => {
        table.querySelectorAll('tr').forEach(tr => {
            if(rows[rowIndex]) {
                tr.querySelectorAll('input').forEach((input,i) => {
                    const val = rows[rowIndex][i];
                    if(input.type === "checkbox") input.checked = (val==="TRUE"||val==="Yes"||val===1);
                    else input.value = val||"";
                });
                rowIndex++;
            }
        });
    });
}

function exportCSV() {
    const tables = [document.getElementById('roomTable1'), document.getElementById('roomTable2'), document.getElementById('rvTable')];
    const headers = ["Room No","Name","Rent","Tax","Misc","CheckIN","CheckOUT","Balance","Paid"];
    let data = [headers];
    tables.forEach(table => table.querySelectorAll('tr').forEach(tr=>{
        const row = Array.from(tr.querySelectorAll('td')).map(td=>{
            const input = td.querySelector('input');
            if(!input) return td.textContent.trim();
            return input.type==="checkbox" ? (input.checked?"TRUE":"FALSE") : input.value;
        });
        data.push(row);
    }));
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "report.xlsx");
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Daily Report",10,10);
    let y=20;
    const tables = [document.getElementById('roomTable1'), document.getElementById('roomTable2'), document.getElementById('rvTable')];
    tables.forEach((table,idx)=>{
        doc.text(`Table ${idx+1}`,10,y); y+=8;
        table.querySelectorAll('tr').forEach(tr=>{
            const inputs = tr.querySelectorAll('input');
            if(inputs.length===0) return;
            const rowData = Array.from(inputs).map(i=>i.type==="checkbox"? (i.checked?"Yes":"No") : i.value);
            doc.text(rowData.join(" | "),10,y); y+=8;
            if(y>280){doc.addPage();y=20;}
        });
        y+=10;
    });
    doc.save("report.pdf");
}

/* ----------------- EMAIL REPORT (Plain Text) ------------------ */
function emailReport() {
    const tables = [document.getElementById('roomTable1'), document.getElementById('roomTable2'), document.getElementById('rvTable')];

    let reportText = `DAILY REPORT\n`;
    reportText += `Date: ${document.getElementById('reportDate').value} | Day: ${document.getElementById('reportDay').value}\n\n`;

    reportText += `SUMMARY\nTotal Cash: ${document.getElementById('totalCash').value}\nTotal Credit: ${document.getElementById('totalCredit').value}\nBank Deposit: ${document.getElementById('bankDeposit').value}\nTotal Sales: ${document.getElementById('totalSales').value}\n#2 Misc: ${document.getElementById('misc2').value}\nOpen Acct: ${document.getElementById('openAcct').value}\nPIA #: ${document.getElementById('piaNumber').value}\n\n`;

    tables.forEach((table,idx)=>{
        const name = idx===0?"Page 1 - Rooms": idx===1?"Page 2 - Rooms":"RV / Storage";
        reportText += `${name}\n`;
        reportText += Array.from(table.querySelectorAll('th')).map(th=>th.textContent.trim()).join(" | ")+"\n";
        table.querySelectorAll('tr').forEach(tr=>{
            const inputs = tr.querySelectorAll('input');
            if(inputs.length===0) return;
            reportText += Array.from(inputs).map(i=>i.type==="checkbox"? (i.checked?"Yes":"No") : i.value).join(" | ")+"\n";
        });
        reportText += "\n";
    });

    const templateParams = {
        subject: "Daily Report",
        message: reportText,
        to_email: "manager@example.com"
    };

    emailjs.send("service_hd3f1ki","template_c77u3cl",templateParams)
        .then(response=>alert("Email sent successfully!"), error=>alert("Failed to send email: "+JSON.stringify(error)));
}

/* ----------------- PRINT / CLEAR ------------------ */
function printReport(){ window.print(); }
function clearForm(){ document.querySelectorAll("input").forEach(i=>{if(i.type==="checkbox") i.checked=false; else i.value="";}); setCurrentDate(); calculateTotals(); }
