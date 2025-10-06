const Database = require('better-sqlite3');
const db = new Database('pharmacy_oltp.db', { verbose: console.log });

function createSchema() {
    console.log("Membuat skema tabel OLTP...");
    db.exec(`
        PRAGMA foreign_keys=OFF;
        BEGIN TRANSACTION;
        DROP TABLE IF EXISTS patient; CREATE TABLE patient ( patient_id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT, date_of_birth TEXT NOT NULL, phone_number TEXT UNIQUE NOT NULL );
        DROP TABLE IF EXISTS doctor; CREATE TABLE doctor ( doctor_id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT, specialization TEXT NOT NULL, license_number TEXT UNIQUE NOT NULL );
        DROP TABLE IF EXISTS employee; CREATE TABLE employee ( employee_id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT, role TEXT NOT NULL );
        DROP TABLE IF EXISTS supplier; CREATE TABLE supplier ( supplier_id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_name TEXT UNIQUE NOT NULL, phone_number TEXT NOT NULL );
        DROP TABLE IF EXISTS medicine; CREATE TABLE medicine ( medicine_id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL, medicine_name TEXT NOT NULL, unit_price REAL NOT NULL, requires_recipe INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id) );
        DROP TABLE IF EXISTS transaction_details; CREATE TABLE transaction_details ( transaction_detail_id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_id INTEGER NOT NULL, medicine_id INTEGER NOT NULL, recipe_id INTEGER, quantity INTEGER NOT NULL, price_at_transaction REAL NOT NULL, FOREIGN KEY (transaction_id) REFERENCES [transaction](transaction_id), FOREIGN KEY (medicine_id) REFERENCES medicine(medicine_id) );
        DROP TABLE IF EXISTS [transaction]; CREATE TABLE [transaction] ( transaction_id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, employee_id INTEGER NOT NULL, total_amount REAL NOT NULL, transaction_time TEXT NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient(patient_id), FOREIGN KEY (employee_id) REFERENCES employee(employee_id) );
        COMMIT;
        PRAGMA foreign_keys=ON;
    `);
    console.log("Skema berhasil dibuat.");
}

function insertMockData() {
    console.log("Memasukkan data sampel (5 data per entitas)...");

    const insertPatient = db.prepare('INSERT INTO patient (first_name, last_name, date_of_birth, phone_number) VALUES (?, ?, ?, ?)');
    const insertDoctor = db.prepare('INSERT INTO doctor (first_name, last_name, specialization, license_number) VALUES (?, ?, ?, ?)');
    const insertEmployee = db.prepare('INSERT INTO employee (first_name, last_name, role) VALUES (?, ?, ?)');
    const insertSupplier = db.prepare('INSERT INTO supplier (supplier_name, phone_number) VALUES (?, ?)');
    const insertMedicine = db.prepare('INSERT INTO medicine (supplier_id, medicine_name, unit_price, requires_recipe) VALUES (?, ?, ?, ?)');
    const insertTransaction = db.prepare('INSERT INTO [transaction] (patient_id, employee_id, total_amount, transaction_time) VALUES (?, ?, ?, ?)');
    const insertTransactionDetail = db.prepare('INSERT INTO transaction_details (transaction_id, medicine_id, quantity, price_at_transaction) VALUES (?, ?, ?, ?)');

    db.transaction(() => {
        insertPatient.run('Budi', 'Santoso', '1990-05-15', '081234567890');
        insertPatient.run('Ani', 'Wijaya', '1985-11-20', '081234567891');
        insertPatient.run('Rina', 'Maulida', '2001-01-30', '081234567892');
        insertPatient.run('Joko', 'Susilo', '1995-07-22', '081234567893');
        insertPatient.run('Sari', 'Puspita', '1988-03-12', '081234567894');

        insertDoctor.run('Dr. Cipto', 'M', 'General Practitioner', 'DOC12345');
        insertDoctor.run('Dr. Sutomo', '', 'Cardiologist', 'DOC67890');
        insertDoctor.run('Dr. Sarah', 'S', 'Pediatrician', 'DOC11223');
        insertDoctor.run('Dr. Adit', 'P', 'Dermatologist', 'DOC44556');
        insertDoctor.run('Dr. Lisa', 'A', 'Neurologist', 'DOC77889');

        insertEmployee.run('Citra', 'Kirana', 'Pharmacist');
        insertEmployee.run('Dewi', 'Lestari', 'Cashier');
        insertEmployee.run('Agus', 'Pranoto', 'Admin');
        insertEmployee.run('Bambang', 'Pamungkas', 'Pharmacist');
        insertEmployee.run('Kartika', 'Putri', 'Cashier');

        insertSupplier.run('PT. Kimia Farma', '021-123456');
        insertSupplier.run('PT. Bio Farma', '022-789012');
        insertSupplier.run('PT. Sanbe Farma', '022-334455');
        insertSupplier.run('PT. Kalbe Farma', '021-667788');
        insertSupplier.run('PT. Dexa Medica', '021-990011');

        insertMedicine.run(1, 'Paracetamol 500mg', 5000, 0);
        insertMedicine.run(1, 'Amoxicillin 500mg', 15000, 1);
        insertMedicine.run(2, 'Vitamin C 1000mg', 25000, 0);
        insertMedicine.run(4, 'Bodrex', 8000, 0);
        insertMedicine.run(3, 'OBH Combi', 12000, 0);

        const t1 = insertTransaction.run(1, 2, 20000, '2025-10-05 10:30:00'); 
        insertTransactionDetail.run(t1.lastInsertRowid, 1, 4, 5000); 

        const t2 = insertTransaction.run(2, 1, 58000, '2025-10-06 14:00:00');
        insertTransactionDetail.run(t2.lastInsertRowid, 3, 2, 25000);
        insertTransactionDetail.run(t2.lastInsertRowid, 4, 1, 8000); 

        const t3 = insertTransaction.run(null, 5, 24000, '2025-10-06 15:15:00'); 
        insertTransactionDetail.run(t3.lastInsertRowid, 5, 2, 12000); 

        const t4 = insertTransaction.run(4, 4, 30000, '2025-10-07 09:00:00'); 
        insertTransactionDetail.run(t4.lastInsertRowid, 2, 2, 15000); 

    })();
    console.log("Data sampel berhasil dimasukkan.");
}

function main() {
    try {
        createSchema();
        insertMockData();
        console.log("\nSetup database OLTP selesai! File 'pharmacy_oltp.db' sudah siap dengan data yang lebih banyak.");
    } catch (err) {
        console.error("Terjadi error saat setup:", err.message);
    } finally {
        db.close();
    }
}

main();