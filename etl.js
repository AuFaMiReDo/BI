const Database = require('better-sqlite3');


const oltpDb = new Database('pharmacy_oltp.db', { fileMustExist: true });
const dwhDb = new Database('pharmacy_dwh.db'); 

console.log("Koneksi ke database OLTP dan DWH berhasil.");


console.log("\n--- TAHAP EXTRACT ---");

function extractData() {
    console.log("Mengekstrak data dari sumber OLTP...");

    const patients = oltpDb.prepare('SELECT * FROM patient').all();
    const doctors = oltpDb.prepare('SELECT * FROM doctor').all();
    const employees = oltpDb.prepare('SELECT * FROM employee').all();
    const medicines = oltpDb.prepare(`
        SELECT m.*, s.supplier_name 
        FROM medicine m
        JOIN supplier s ON m.supplier_id = s.supplier_id
    `).all();
    
    const salesDetails = oltpDb.prepare(`
        SELECT td.*, t.patient_id, t.employee_id, t.transaction_time 
        FROM transaction_details td
        JOIN [transaction] t ON td.transaction_id = t.transaction_id
    `).all();
    
    console.log(`Ekstraksi selesai: ${salesDetails.length} item penjualan ditemukan.`);
    return { patients, doctors, employees, medicines, salesDetails };
}



console.log("\n--- TAHAP TRANSFORM ---");

function transformData(sourceData) {
    console.log("Memulai transformasi data...");

    const patientMap = new Map();
    const dimPatient = sourceData.patients.map((p, index) => {
        const patientKey = index + 1;
        const fullName = `${p.first_name} ${p.last_name || ''}`.trim();
        
        const birthDate = new Date(p.date_of_birth);
        const age = new Date().getFullYear() - birthDate.getFullYear();

        const transformed = {
            patient_key: patientKey,
            patient_id: p.patient_id,
            full_name: fullName,
            age: age
        };
        patientMap.set(p.patient_id, transformed); 
        return transformed;
    });

    const medicineMap = new Map();
    const dimMedicine = sourceData.medicines.map((m, index) => {
        const medicineKey = index + 1;
        const transformed = {
            medicine_key: medicineKey,
            medicine_id: m.medicine_id,
            medicine_name: m.medicine_name,
            requires_recipe: m.requires_recipe === 1 ? 'Yes' : 'No',
            supplier_name: m.supplier_name
        };
        medicineMap.set(m.medicine_id, transformed);
        return transformed;
    });

    const employeeMap = new Map();
    const dimEmployee = sourceData.employees.map((e, index) => {
        const employeeKey = index + 1;
        const fullName = `${e.first_name} ${e.last_name || ''}`.trim();
        const transformed = {
            employee_key: employeeKey,
            employee_id: e.employee_id,
            full_name: fullName,
            role: e.role
        };
        employeeMap.set(e.employee_id, transformed);
        return transformed;
    });

    const dateMap = new Map();
    const dimDate = [];
    sourceData.salesDetails.forEach(sale => {
        const date = sale.transaction_time.split(' ')[0]; 
        const dateKey = parseInt(date.replace(/-/g, '')); 
        
        if (!dateMap.has(dateKey)) {
            const d = new Date(date);
            const transformed = {
                date_key: dateKey,
                full_date: date,
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                day: d.getDate()
            };
            dateMap.set(dateKey, transformed);
            dimDate.push(transformed);
        }
    });

   
    const factSales = sourceData.salesDetails.map(sale => {
        const patient = patientMap.get(sale.patient_id);
        const medicine = medicineMap.get(sale.medicine_id);
        const employee = employeeMap.get(sale.employee_id);
        const dateKey = parseInt(sale.transaction_time.split(' ')[0].replace(/-/g, ''));

        const patientKey = patient ? patient.patient_key : 0; 

        return {
            date_key: dateKey,
            medicine_key: medicine.medicine_key,
            patient_key: patientKey,
            employee_key: employee.employee_key,
            transaction_id_oltp: sale.transaction_id,
            quantity_sold: sale.quantity,
            price_per_unit: sale.price_at_transaction,
            total_line_amount: sale.quantity * sale.price_at_transaction
        };
    });

    console.log("Transformasi selesai.");
    return { dimPatient, dimMedicine, dimEmployee, dimDate, factSales };
}


function main() {
    const extractedData = extractData();

    const transformedData = transformData(extractedData);

    console.log("\n--- HASIL TRANSFORMASI (SAMPEL) ---");
    console.log("DimPatient (1 baris):", transformedData.dimPatient[0]);
    console.log("DimMedicine (1 baris):", transformedData.dimMedicine[0]);
    console.log("FactSales (1 baris):", transformedData.factSales[0]);

    oltpDb.close();
    dwhDb.close();
    console.log("\nProses selesai. Koneksi ditutup.");
}

main();