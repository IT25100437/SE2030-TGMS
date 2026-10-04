# Textile & Garment Management System (TGMS)

SE2030 Software Engineering group project.
Group No: 2026-Y2-S1-KU-06

This is one integrated Spring Boot project. **Sprint 1, Sprint 2, and Sprint 3 are all
implemented here** - there are no separate projects or folders per sprint.

## PBIs implemented so far

| PBI | Description | Owner | Sprint |
|---|---|---|---|
| PBI-26 | Secure login with role-based access | Dayananda H.D.B.P | 1 |
| PBI-01 | Register a new supplier | Meewathura I.N | 1 |
| PBI-02 | Add / update contract terms | Meewathura I.N | 1 |
| PBI-03 | Search & filter suppliers by category | Meewathura I.N | 1 |
| PBI-06 | Record stock-in / stock-out movements | Senevirathna B.S.M.R.S | 1 |
| PBI-07 | Low-stock alert | Senevirathna B.S.M.R.S | 1 |
| PBI-08 | Search & filter inventory by category/SKU | Senevirathna B.S.M.R.S | 1 |
| PBI-09 | Remove damaged/obsolete stock record (soft delete) | Senevirathna B.S.M.R.S | 1 |
| PBI-11 | Create new customer order | Ranatunga Y.U.K | 2 |
| PBI-12 | Generate invoice on confirmation | Ranatunga Y.U.K | 2 |
| PBI-13 | Track order & delivery status | Ranatunga Y.U.K | 2 |
| PBI-14 | Update order status lifecycle | Ranatunga Y.U.K | 2 |
| PBI-15 | Delete draft/unconfirmed order | Ranatunga Y.U.K | 2 |
| PBI-04 | Deactivate a supplier (soft delete) | Meewathura I.N | 2 |
| PBI-05 | Export supplier list to CSV | Meewathura I.N | 2 |
| PBI-10 | Export stock report to CSV | Senevirathna B.S.M.R.S | 2 |
| PBI-16 | Create work order from confirmed order (incl. PBI-17 line assignment) | Herathnayake H.M.D.L | 3 |
| PBI-18 | Update production stage | Herathnayake H.M.D.L | 3 |
| PBI-19 | Bottleneck / delay alert | Herathnayake H.M.D.L | 3 |
| PBI-20 | Daily output summary | Herathnayake H.M.D.L | 3 |
| PBI-21 | Register new employee | Bandara J.M.O.N | 3 |
| PBI-22 | Mark daily attendance | Bandara J.M.O.N | 3 |
| PBI-23 | Update employee role/department | Bandara J.M.O.N | 3 |
| PBI-24 | Deactivate resigned employee (soft delete) | Bandara J.M.O.N | 3 |
| PBI-25 | View monthly attendance summary | Bandara J.M.O.N | 3 |

Reports & Analytics is **not** in this build yet - it belongs to Sprint 4.

> **PBI-17 note:** "Assign work order to production line/team" is folded into the
> PBI-16 create-work-order step (your own Scrum Report's task breakdown, T9.3, already
> nests this inside PBI-16) rather than built as a separate endpoint.
>
> **Export format note (PBI-05, PBI-10):** implemented as CSV export (opens directly in
> Excel) rather than true `.xlsx`/`.pdf` generation, to avoid extra dependencies.

## Tech stack (matches the Final Report, Section 4.1)

- Backend: Spring Boot 3.2.5 (Java 17), Spring Data JPA, Spring Security
- Database: **Microsoft SQL Server** (JDBC driver: `com.microsoft.sqlserver:mssql-jdbc`)
- API style: RESTful JSON
- Frontend: plain HTML / CSS / JavaScript calling the REST API with `fetch()`
- Build tool: Maven

No MongoDB, no MySQL, no PostgreSQL anywhere in this project.

## 1. Prerequisites

- Java 17+ (`java -version`)
- Maven 3.8+ (`mvn -version`) - or use your IDE's built-in Maven
- SQL Server (the team is using **SQL Server Express**, instance `.\SQLEXPRESS`) with
  **SQL Server Authentication** enabled
- SQL Server Management Studio (SSMS) 22

## 2. Create the database

SQL Server will **not** auto-create the database for you. Follow "Database setup in
SSMS 22" (Section 7 below) to create `TGMS_DB` before running the app for the first
time. If you already did this for Sprint 1/2, there is nothing new to do - Sprint 3's
tables (`work_orders`, `production_stages`, `employees`, `attendance_records`) are
added automatically into the same `TGMS_DB` the first time you run the updated app.

## 3. Configure the database connection

Edit `src/main/resources/application.properties`. **Do not commit real credentials** -
the checked-in file uses placeholder values that you must replace with your own local
SQL Server login:

```properties
spring.datasource.url=jdbc:sqlserver://localhost:1433;databaseName=TGMS_DB;encrypt=true;trustServerCertificate=true
spring.datasource.username=YOUR_SQL_SERVER_USERNAME
spring.datasource.password=YOUR_SQL_SERVER_PASSWORD
```

Since the team's SQL Server is a named instance (`.\SQLEXPRESS`), the URL normally
needs the instance name instead of a port - see the comments directly above this block
in `application.properties` for the exact named-instance URL format (note the doubled
backslash required in a `.properties` file). You do **not** need to manually create or
alter any tables - Hibernate creates/updates them automatically on startup
(`spring.jpa.hibernate.ddl-auto=update`), and it never deletes or resets existing
tables or data when new entities are added.

## 4. Run the application

From the project root:

```bash
mvn spring-boot:run
```

Or import the project into IntelliJ IDEA / Eclipse / VS Code as a Maven project and
run `TgmsApplication.java` directly.

The app starts on **http://localhost:8081**

## 5. Log in

Open http://localhost:8081 in your browser. On first startup, `DataSeeder` automatically
creates six demo accounts (see `config/DataSeeder.java`):

| Username | Password | Role | Module |
|---|---|---|---|
| `admin` | `admin123` | ADMIN | every module |
| `meewathura` | `procure123` | PROCUREMENT_OFFICER | Supplier Management |
| `senevirathna` | `inventory123` | INVENTORY_MANAGER | Inventory Management |
| `ranatunga` | `sales123` | SALES_OFFICER | Order Management |
| `herathnayake` | `production123` | PRODUCTION_MANAGER | Production Management |
| `bandara` | `hr123` | HR_MANAGER | Employee Management |

Each login only sees their own module in the sidebar (PBI-26 / FR-07). Two read-only
carve-outs exist so modules can integrate with each other without giving full access:
Sales Officers get **read-only** access to Inventory (to browse stock while building an
order), and Production Managers get **read-only** access to Orders (to pick a CONFIRMED
order to build a work order from). Neither can create/edit/delete in the other module.

## 6. Testing Sprint 3 end-to-end

1. Log in as `ranatunga`, create a customer + order, and **Confirm** it so its status
   becomes CONFIRMED (Production can only build a work order from a confirmed order).
2. Log in as `herathnayake` (Production Manager) and open **Production Management**:
   - The confirmed order from step 1 should appear in the dropdown. Assign it to a line
     (e.g. "Line A") and click **Create Work Order** - it appears in the list as PENDING.
   - Click **Move to CUTTING**, then **Move to SEWING**, then **QC**, then **PACKING**,
     then **COMPLETED** - each click should only allow the *next* stage (try calling the
     API directly with a skipped or backward stage - it should be rejected).
   - Click **History** on the work order to see the full stage log with start/end times.
   - Create a second work order and leave it PENDING, then click **Cancel** - it should
     succeed. Try cancelling a work order that has already moved past PENDING - it
     should be rejected.
   - Pick today's date under **Daily Output Summary** and click **View Summary** - the
     line you completed a work order on should show a count of 1.
   - The **bottleneck banner** at the top only appears once a work order has sat in one
     stage for 48+ hours, so it will normally stay hidden during a quick test - that's
     expected, not a bug.
3. Log in as `bandara` (HR Manager) and open **Employee Management**:
   - Register an employee (name, DOB, department, role).
   - Click **Edit** on the employee, change their department/role, and save - PBI-23.
   - Click **Attendance**, mark today's attendance as Present, then mark the *same date*
     again as Late - it should correct the existing record rather than duplicate it.
   - Under Monthly Summary, enter the current year/month and click **View Summary** -
     you should see the counts reflect what you just marked.
   - Click **Deactivate** on the employee - they should disappear from the active list
     but their attendance history remains queryable by ID.
4. Confirm nothing broke: log back in as `admin` and check all five modules still work,
   then spot-check `meewathura`/`senevirathna` can still do everything from Sprints 1-2.

## 7. Database setup in SSMS 22

1. Open **SQL Server Management Studio 22**.
2. In the **"Connect to Server"** dialog:
   - **Server type:** Database Engine
   - **Server name:** `.\SQLEXPRESS` (or your actual instance - check via the dropdown → "Browse for more..." if unsure)
   - **Authentication:** SQL Server Authentication (enable mixed mode first if you only see Windows Authentication - see step 3)
3. **Enable SQL Server Authentication** (skip if already enabled): right-click your server → **Properties → Security** → **"SQL Server and Windows Authentication mode"** → OK → restart the SQL Server service.
4. **Create/enable a SQL login:** **Security → Logins** → right-click → **New Login...** → set a name and password (or enable/password the built-in `sa` account instead).
5. **Create the `TGMS_DB` database:** right-click **Databases → New Database...** → name it `TGMS_DB` → OK (or run `CREATE DATABASE TGMS_DB;` in a New Query window).
6. **Grant your login access** (skip if using `sa`): `TGMS_DB → Security → Users → New User...`, link it to your login, tick **db_owner**.
7. **Verify:** `TGMS_DB` should appear under Databases.
8. **Run the app** (Section 4).
9. **Verify the connection:** console shows Hibernate `create table` statements and `[DataSeeder] Created default user: ...` lines, no login/connection errors.
10. **Check the tables:** `Databases → TGMS_DB → Tables` (refresh if needed) - you should now see `users`, `suppliers`, `contracts`, `inventory_items`, `stock_movements`, `customers`, `orders`, `order_items`, `invoices`, `work_orders`, `production_stages`, `employees`, `attendance_records`.

## 8. Project structure

```
tgms/
├── pom.xml
├── src/main/java/com/sliit/tgms/
│   ├── TgmsApplication.java        Spring Boot entry point
│   ├── config/                     Security rules, login wiring, demo data seeding
│   ├── model/                      JPA entities:
│   │                                 Sprint 1: User, Supplier, Contract, InventoryItem, StockMovement
│   │                                 Sprint 2: Customer, Order, OrderItem, Invoice
│   │                                 Sprint 3: WorkOrder, ProductionStage, Employee, Attendance
│   ├── repository/                 Spring Data JPA interfaces (one per entity)
│   ├── dto/                        Request payloads with validation annotations
│   ├── service/                    Business logic (one service per module)
│   ├── controller/                 REST endpoints (one controller per module)
│   └── exception/                  Centralised error handling
└── src/main/resources/
    ├── application.properties
    └── static/                     Frontend (served directly by Spring Boot)
        ├── index.html, dashboard.html, suppliers.html, inventory.html,
        │   orders.html, production.html, employees.html
        ├── css/style.css
        └── js/                     api.js, login.js, dashboard.js, suppliers.js,
                                     inventory.js, orders.js, production.js, employees.js
```

## 9. REST API reference

All endpoints except `/api/auth/login` require an active login session.

### Auth (PBI-26)
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/login` | public |
| GET  | `/api/auth/me` | any logged-in user |
| POST | `/api/auth/logout` | any logged-in user |

### Supplier Management (PROCUREMENT_OFFICER / ADMIN)
| Method | Endpoint | PBI |
|---|---|---|
| POST | `/api/suppliers` | PBI-01 register |
| GET  | `/api/suppliers` / `?category=&name=` | list / PBI-03 search-filter |
| GET  | `/api/suppliers/{id}` | view one |
| PATCH | `/api/suppliers/{id}/deactivate` | PBI-04 deactivate |
| GET  | `/api/suppliers/export` | PBI-05 export CSV |
| POST | `/api/suppliers/{supplierId}/contracts` | PBI-02 add contract |
| GET  | `/api/suppliers/{supplierId}/contracts` | list contracts |
| PUT  | `/api/contracts/{contractId}` | PBI-02 update contract |

### Inventory Management (INVENTORY_MANAGER/ADMIN writes; SALES_OFFICER also gets GET)
| Method | Endpoint | PBI |
|---|---|---|
| POST | `/api/inventory` | add item |
| GET  | `/api/inventory` / `?keyword=&type=` | list / PBI-08 search-filter |
| GET  | `/api/inventory/low-stock` | PBI-07 low-stock alert |
| GET  | `/api/inventory/export` | PBI-10 export CSV |
| GET  | `/api/inventory/{id}` | view one |
| POST | `/api/inventory/{id}/movements` | PBI-06 stock in/out |
| GET  | `/api/inventory/{id}/movements` | movement history |
| DELETE | `/api/inventory/{id}` | PBI-09 remove (soft delete) |

### Order Management (SALES_OFFICER/ADMIN writes; PRODUCTION_MANAGER also gets GET)
| Method | Endpoint | PBI |
|---|---|---|
| POST | `/api/customers` | register a customer |
| GET  | `/api/customers` / `/{id}` | list / view |
| POST | `/api/orders` | PBI-11 create draft order |
| GET  | `/api/orders` / `?status=` | list / PBI-13 track by status |
| GET  | `/api/orders/{id}` | view one (includes line items) |
| PATCH | `/api/orders/{id}/confirm` | PBI-12 confirm - deducts stock, generates invoice |
| PATCH | `/api/orders/{id}/status` | PBI-14 update lifecycle |
| DELETE | `/api/orders/{id}` | PBI-15 delete (DRAFT only) |
| GET  | `/api/orders/{id}/invoice` | PBI-12 view invoice |

### Production Management (PRODUCTION_MANAGER / ADMIN)
| Method | Endpoint | PBI |
|---|---|---|
| POST | `/api/production/work-orders` | PBI-16 create (+ PBI-17 line assignment) |
| GET  | `/api/production/work-orders` / `/{id}` | list / view one |
| GET  | `/api/production/work-orders/{id}/stages` | stage history |
| PATCH | `/api/production/work-orders/{id}/stage` | PBI-18 advance to next stage |
| PATCH | `/api/production/work-orders/{id}/cancel` | cancel (only while PENDING) |
| GET  | `/api/production/bottlenecks` | PBI-19 bottleneck alert |
| GET  | `/api/production/output-summary?date=` | PBI-20 daily output by line |

### Employee Management (HR_MANAGER / ADMIN)
| Method | Endpoint | PBI |
|---|---|---|
| POST | `/api/employees` | PBI-21 register |
| GET  | `/api/employees` / `/{id}` | list active / view one |
| PUT  | `/api/employees/{id}` | PBI-23 update role/department |
| PATCH | `/api/employees/{id}/deactivate` | PBI-24 deactivate |
| POST | `/api/employees/{id}/attendance` | PBI-22 mark/correct attendance |
| GET  | `/api/employees/{id}/attendance?year=&month=` | list attendance for a month |
| GET  | `/api/employees/{id}/attendance/summary?year=&month=` | PBI-25 monthly summary |

## 10. Design notes for the team

- **Soft deletes only**, except DRAFT orders and PENDING work orders (never confirmed /
  never started, so nothing to audit yet).
- **Cross-module integration is done by reuse, not duplication:** confirming an order
  (Sprint 2) calls Inventory's own stock-movement logic; creating a work order (Sprint 3)
  calls Order's own lookup/validation logic. Neither module's internals were copied.
- **Production stages are forward-only** (PENDING→CUTTING→SEWING→QC→PACKING→COMPLETED),
  matching Herathnayake's own reflection in the Final Report. CANCELLED is only reachable
  from PENDING (work hasn't started).
- **Two intentional read-only RBAC carve-outs** exist so modules can browse data they
  depend on without being able to modify it: SALES_OFFICER can GET (not write) Inventory;
  PRODUCTION_MANAGER can GET (not write) Orders. Both are documented directly in
  `SecurityConfig.java`.
- **A known minor over-permission** (carried over from Sprint 2): the Inventory GET
  carve-out also technically lets Sales Officers hit the Inventory CSV export endpoint,
  since it's a GET request. Flag if your marking criteria wants stricter separation.
- **Session-based login**, not JWT - simpler to demo/debug for a student project.

## 11. Next steps (do NOT build yet)

Sprint 4 will add Reports & Analytics (cross-module dashboards, scheduled reports,
exports) - all in this same project.
