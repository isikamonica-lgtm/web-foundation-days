# TicketHub System Design

## 1. Introduction

TicketHub is a proposed website for selling tickets to concerts and other events. Customers should be able to browse events, view seat availability, temporarily hold seats, pay for tickets, and access their purchased tickets.

The main system design challenge is handling high traffic during popular ticket sales while ensuring that the same seat cannot be sold to multiple customers.

This document describes TicketHub's requirements, traffic estimates, API, data model, architecture, and design trade-offs.

## ## 2. Requirements

### 2.1 Functional Requirements

TicketHub must provide the following features:

1. **User registration and login:** Customers can create accounts and securely log in.
2. **Browse events:** Customers can view upcoming concerts and events, including event dates, venues, and ticket prices.
3. **View seats:** Customers can view the seats available for a particular event.
4. **Hold seats:** Customers can temporarily hold available seats while completing checkout.
5. **Purchase tickets:** Customers can pay for their reservations and receive confirmation after successful payment.
6. **View purchased tickets:** Customers can access their confirmed tickets and booking details.
7. **Release expired holds:** The system automatically releases seats when temporary reservations expire without a completed purchase.
8. **Manage bookings:** Customers can view their orders and receive appropriate information when a reservation or payment fails.

### 2.2 Non-Functional Requirements

The system must meet the following quality requirements:

1. **Speed:** Event listings and event details should load quickly. During a popular ticket sale, the system should handle a large number of requests without becoming unresponsive. Frequently requested event information can be cached to reduce database load.

2. **Correctness:** A seat must never be sold to two different customers. The database must use transactions, conditional updates, and appropriate constraints to prevent conflicting reservations and confirmed bookings.

3. **Fairness:** During a popular sale, a virtual waiting room should control access to the purchasing process. The system should use a clearly defined queue policy so that customers receive fair access rather than allowing uncontrolled requests to overwhelm the service.

4. **Scalability:** The system should support growth in users and traffic by allowing additional application servers to be added when demand increases.

5. **Availability and reliability:** The system should continue serving requests during component failures where possible. Monitoring, health checks, backups, and recovery procedures should reduce downtime and protect booking data.

6. **Security:** Customer accounts and booking information must be protected. The system should authenticate users, authorize access to their bookings, validate requests, and use a secure payment integration.

7. **Data integrity:** Orders, reservations, payments, and seat assignments must remain consistent. A ticket should only be confirmed when the reservation and payment have been successfully verified.

8. **Reservation expiry:** Temporary seat holds must expire after a defined period if checkout is not completed, allowing the seats to become available to other customers.

## 3. Traffic Estimates

### 3.1 Normal Traffic

TicketHub has 2 million registered users. On a normal day, 50,000 people visit the website, each viewing an average of 10 pages. The system sells approximately 5,000 tickets per day.

Daily page views are calculated as follows:

Daily page views = Daily visitors × Pages per visitor

Daily page views = 50,000 × 10 = 500,000 page views per day.

Assuming traffic is distributed evenly across 24 hours, the average page-view rate is:

Average page views per second = 500,000 ÷ 86,400 ≈ 5.8 page views per second.

This is an average rather than a peak estimate. Actual traffic may be higher during busy periods. TicketHub must serve event information efficiently and process normal booking requests reliably.

### 3.2 Popular Concert Sale

During a popular concert sale, 200,000 people attempt to purchase tickets for 20,000 available seats within the first 10 minutes.

Ten minutes equals 600 seconds.

The average purchase-attempt rate is:

Purchase attempts per second = 200,000 ÷ 600 ≈ 333.3 attempts per second.

Therefore, the system must accommodate approximately 333 purchase attempts per second on average during this period. The actual peak rate may be higher because customers may arrive in concentrated bursts immediately after the sale opens.

Demand exceeds supply by:

200,000 purchase attempts − 20,000 available seats = 180,000.

If each person seeks one of these seats, many customers will be unable to obtain a ticket. TicketHub must communicate unavailability clearly and avoid creating duplicate bookings.

### 3.3 Traffic Comparison and Design Implications

On a normal day, TicketHub serves approximately 500,000 page views, equivalent to an average of 5.8 page views per second. During a popular sale, it faces approximately 333.3 purchase attempts per second on average.

These figures describe different types of requests and are not directly equivalent in resource consumption. However, they demonstrate that a popular sale creates a significant burst of demand.

To handle this situation, TicketHub should use a load balancer and multiple application servers to distribute requests. A virtual waiting room should control admission to the purchasing process. Caching can reduce database load for suitable event information, while database transactions and constraints must protect seat reservations and prevent double-booking.

Monitoring and automatic scaling can help the system respond to changes in demand. Capacity planning should also account for peak traffic rather than relying only on average rates.

## 4. API Design

TicketHub uses a REST-style API to allow the frontend to communicate with the backend. The API uses HTTP methods and JSON request and response bodies.

### 4.1 API Endpoints

| Method | Endpoint                      | Purpose                                                  | Success Status                                          |
| ------ | ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| GET    | `/api/events`                 | Browse available events                                  | 200 OK                                                  |
| GET    | `/api/events/{eventId}`       | Retrieve event details                                   | 200 OK                                                  |
| GET    | `/api/events/{eventId}/seats` | View seats and their displayed availability              | 200 OK                                                  |
| POST   | `/api/holds`                  | Attempt to create a temporary seat hold                  | 201 Created                                             |
| POST   | `/api/payments`               | Initiate payment for a valid reservation                 | 200 OK or 202 Accepted, depending on payment processing |
| GET    | `/api/tickets`                | Retrieve tickets belonging to the authenticated customer | 200 OK                                                  |

### 4.2 Browsing Events

The frontend sends `GET /api/events` to retrieve a list of upcoming events. The backend returns event information such as the event ID, name, date, venue, and ticket price.

The frontend sends `GET /api/events/{eventId}` to retrieve the details of a specific event.

Successful requests return `200 OK`. If the requested event does not exist, the API returns `404 Not Found`.

### 4.3 Viewing Seats

The frontend sends `GET /api/events/{eventId}/seats` to retrieve the seats associated with an event and their displayed availability.

The response includes seat identifiers, labels, and availability information. This information helps customers select seats, but it is not a guarantee that a seat remains available when a reservation is requested.

### 4.4 Holding Seats

The frontend sends `POST /api/holds` with the event ID and seat ID. The backend authenticates the customer, checks the event and seat, and attempts to create a temporary hold.

If the operation succeeds, the API returns `201 Created`, a hold ID, and an expiration time. If the seat is already held or unavailable, the API returns `409 Conflict`.

The reservation must be enforced by the database so that simultaneous requests cannot successfully claim the same seat.

### 4.5 Processing Payments

The frontend sends `POST /api/payments` with the reservation ID and payment details. The backend verifies that the reservation is valid and belongs to the authenticated customer before initiating payment through a payment provider.

The system verifies the payment result before confirming the order and issuing a ticket. It uses an idempotency key to help prevent duplicate processing when requests are retried.

The API may return `200 OK` for a completed payment or `202 Accepted` when processing is still pending. Failed or invalid payments must not result in a confirmed ticket.

### 4.6 Viewing Purchased Tickets

The frontend sends `GET /api/tickets` to retrieve the authenticated customer's confirmed tickets.

The backend checks the customer's identity and authorization before returning ticket details. It must not disclose tickets belonging to other customers.

A successful request returns `200 OK`.

### 4.7 Error Handling

The API uses consistent HTTP status codes:

- `400 Bad Request`: Invalid request data.
- `401 Unauthorized`: Authentication is missing or invalid.
- `403 Forbidden`: The customer lacks permission.
- `404 Not Found`: The requested resource does not exist or is not accessible.
- `409 Conflict`: A seat is unavailable or a request conflicts with the current reservation state.
- `422 Unprocessable Content`: A request cannot be completed because of its current business state, such as an expired reservation.
- `429 Too Many Requests`: The client has exceeded its permitted request rate.
- `500 Internal Server Error`: An unexpected server error occurred.
- `503 Service Unavailable`: The service is temporarily unable to process the request.

Error responses should contain a clear message and a machine-readable error code. Sensitive implementation details must not be exposed.

### 4.8 API Security and Reliability

Endpoints that access customer reservations, payments, or tickets require authentication and authorization. The backend validates request data and applies rate limits to reduce abuse during popular sales.

Payment requests should use idempotency keys to reduce duplicate processing. Seat reservations must be checked and enforced against the authoritative database rather than relying on cached availability information.

## 5. Data Model

TicketHub uses a relational database such as PostgreSQL to store customer accounts, events, seats, temporary reservations, and ticket orders.

A relational database is appropriate because ticket purchases require strong data consistency, reliable transactions, and constraints to prevent duplicate seat bookings.

### 5.1 Database Tables

The database contains five main tables: Users, Events, Seats, Orders, and Seat_Holds.

#### Table 1: Users

The Users table stores customer account information.

| Column        | Data Type    | Constraint       | Description                |
| ------------- | ------------ | ---------------- | -------------------------- |
| user_id       | BIGINT       | Primary Key      | Unique customer identifier |
| full_name     | VARCHAR(100) | NOT NULL         | Customer's full name       |
| email         | VARCHAR(255) | UNIQUE, NOT NULL | Customer's email address   |
| password_hash | TEXT         | NOT NULL         | Securely hashed password   |
| created_at    | TIMESTAMP    | NOT NULL         | Account creation time      |

Each customer has a unique `user_id`. Email addresses must also be unique.

Passwords must be stored as secure password hashes, never as plain text.

#### Table 2: Events

The Events table stores information about concerts and other events.

| Column      | Data Type    | Constraint          | Description                  |
| ----------- | ------------ | ------------------- | ---------------------------- |
| event_id    | BIGINT       | Primary Key         | Unique event identifier      |
| event_name  | VARCHAR(200) | NOT NULL            | Name of the concert or event |
| venue       | VARCHAR(200) | NOT NULL            | Event location               |
| event_date  | TIMESTAMP    | NOT NULL            | Date and time of the event   |
| total_seats | INTEGER      | NOT NULL, CHECK > 0 | Total number of seats        |
| created_at  | TIMESTAMP    | NOT NULL            | Record creation time         |

One event can have many seats.

For example, a concert may have 20,000 seats associated with its event ID.

#### Table 3: Seats

The Seats table stores individual seats available for each event.

| Column      | Data Type     | Constraint           | Description              |
| ----------- | ------------- | -------------------- | ------------------------ |
| seat_id     | BIGINT        | Primary Key          | Unique seat identifier   |
| event_id    | BIGINT        | Foreign Key          | References Events        |
| seat_number | VARCHAR(20)   | NOT NULL             | Seat label, such as A15  |
| price       | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Ticket price             |
| status      | VARCHAR(20)   | NOT NULL             | available, held, or sold |

The `event_id` foreign key connects each seat to its event.

A unique constraint on `(event_id, seat_number)` prevents duplicate seat labels within the same event.

The seat status indicates whether the seat is available, temporarily held, or sold.

#### Table 4: Orders

The Orders table stores ticket purchase records.

| Column         | Data Type     | Constraint           | Description                      |
| -------------- | ------------- | -------------------- | -------------------------------- |
| order_id       | BIGINT        | Primary Key          | Unique order identifier          |
| user_id        | BIGINT        | Foreign Key          | References Users                 |
| seat_id        | BIGINT        | Foreign Key          | References Seats                 |
| hold_id        | BIGINT        | Foreign Key, UNIQUE  | References Seat_Holds            |
| total_amount   | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Amount charged                   |
| payment_status | VARCHAR(20)   | NOT NULL             | pending, paid, or failed         |
| order_status   | VARCHAR(20)   | NOT NULL             | pending, confirmed, or cancelled |
| created_at     | TIMESTAMP     | NOT NULL             | Order creation time              |

Each order belongs to one customer and refers to one seat.

For this simplified design, each order represents one ticket. Customers purchasing multiple tickets would create multiple orders.

A unique constraint on `hold_id` prevents the same reservation from producing multiple orders.

A partial unique index on `seat_id` for confirmed orders prevents more than one confirmed order from claiming the same seat.

#### Table 5: Seat_Holds

The Seat_Holds table stores temporary seat reservations.

| Column     | Data Type   | Constraint  | Description                              |
| ---------- | ----------- | ----------- | ---------------------------------------- |
| hold_id    | BIGINT      | Primary Key | Unique hold identifier                   |
| user_id    | BIGINT      | Foreign Key | References Users                         |
| seat_id    | BIGINT      | Foreign Key | References Seats                         |
| status     | VARCHAR(20) | NOT NULL    | active, expired, completed, or cancelled |
| created_at | TIMESTAMP   | NOT NULL    | Time the hold was created                |
| expires_at | TIMESTAMP   | NOT NULL    | Time the hold expires                    |

Each temporary reservation belongs to a customer and references one seat.

A partial unique index on `seat_id` where the hold status is `active` prevents multiple active hold records for the same seat.

The system must update expired holds through a controlled database transaction before making those seats available again.

### 5.2 Table Relationships

The database uses the following relationships:

1. **Users → Orders (One-to-Many):** One customer can place multiple orders, but each order belongs to one customer.

2. **Users → Seat_Holds (One-to-Many):** One customer can create multiple seat holds, but each hold belongs to one customer.

3. **Events → Seats (One-to-Many):** One event can have many seats, but each seat record belongs to one event.

4. **Seats → Seat_Holds (One-to-Many over time):** A seat can have multiple historical holds, but only one hold may be active at a time.

5. **Seats → Orders (One-to-Many over time):** A seat may have historical cancelled or failed orders, but only one confirmed order may exist for that seat.

6. **Seat_Holds → Orders:** A hold may lead to one order. Each order references the hold used during checkout.

### 5.3 Entity Relationship Diagram

```text
USERS
-----
user_id (PK)
full_name
email
password_hash
created_at
    |
    | 1
    |
    +---------------------+
    |                     |
    | Many                | Many
    v                     v
SEAT_HOLDS              ORDERS
----------              ------
hold_id (PK)            order_id (PK)
user_id (FK)            user_id (FK)
seat_id (FK)            seat_id (FK)
status                  hold_id (FK)
created_at              total_amount
expires_at              payment_status
    |                   order_status
    |                   created_at
    |                     |
    +----------+----------+
               |
               v
             SEATS
             -----
             seat_id (PK)
             event_id (FK)
             seat_number
             price
             status
               |
               | Many-to-One
               v
             EVENTS
             ------
             event_id (PK)
             event_name
             venue
             event_date
             total_seats
```

### 5.4 Database Constraints

TicketHub uses database constraints to protect data integrity.

**Primary keys:** Every record has a unique identifier.

**Foreign keys:** Orders, holds, and seats must reference valid related records.

**Unique email addresses:** Two customers cannot register with the same email address.

**Unique event seats:** The combination of `event_id` and `seat_number` must be unique.

**One active hold per seat:** A partial unique index prevents multiple active holds for the same seat.

**One confirmed order per seat:** A partial unique index prevents multiple confirmed orders for the same seat.

**One order per hold:** A unique constraint on `Orders.hold_id` prevents a reservation from generating duplicate orders.

**Valid prices:** Ticket prices and order amounts must not be negative.

**Valid statuses:** Check constraints should restrict seat, hold, payment, and order statuses to their supported values.

These constraints work alongside database transactions to protect the booking process.

### 5.5 Why PostgreSQL?

PostgreSQL is a suitable database for TicketHub because it supports:

- ACID transactions.
- Primary and foreign keys.
- Unique constraints and indexes.
- Conditional updates.
- Reliable relational queries.
- Strong data consistency.

The database is the authoritative source for seat ownership and confirmed bookings.

Caching may improve the speed of browsing events, but cached availability information must not determine whether a customer can successfully reserve or purchase a seat.

## 6. Preventing Double-Booking

TicketHub must guarantee that two customers cannot successfully reserve or purchase the same seat. This is particularly important during a popular concert sale when many requests may arrive simultaneously.

### 6.1 The Problem

A race condition can occur when two customers attempt to reserve the same seat at nearly the same time. Both customers might see the seat as available in the frontend. Therefore, the frontend's displayed availability cannot be trusted as the final authority.

TicketHub must enforce seat availability in the backend and database.

### 6.2 Conditional Updates

The backend uses a conditional database update to claim a seat only when it is still available.

For example:

```sql
UPDATE seats
SET status = 'held'
WHERE seat_id = 15
  AND status = 'available';
```

The application checks the number of rows affected. If one row is updated, the seat was successfully claimed. If zero rows are updated, the seat is no longer available and the request fails.

This prevents two competing requests from both successfully changing the same seat from available to held through this operation.

### 6.3 Database Transactions

The reservation process uses a database transaction to coordinate related operations, such as claiming the seat, creating a hold record, and setting its expiration time.

The transaction must ensure that these operations succeed together or that incomplete changes are rolled back.

Conditional updates and appropriate database constraints must be used alongside transactions to protect against concurrent requests.

### 6.4 Database Constraints

TicketHub uses database constraints to enforce the booking rules.

- A primary key uniquely identifies each seat.
- A unique constraint on `(event_id, seat_number)` prevents duplicate seat records within an event.
- A partial unique index on the seat ID for active holds prevents more than one active reservation for the same seat.
- A partial unique index on the seat ID for confirmed orders prevents multiple confirmed orders from claiming the same seat.
- A unique constraint on the order's hold ID prevents one hold from producing multiple orders.

These constraints provide an additional layer of protection even when several application servers process requests simultaneously.

### 6.5 Temporary Holds and Expiration

When a customer successfully reserves a seat, TicketHub creates a temporary hold with an expiration time.

If the customer completes checkout successfully, the reservation is converted into a confirmed order. If checkout is not completed within the allowed period, the hold expires and the seat can be released.

Expiration must be enforced during reservation processing rather than depending only on a background cleanup job. A delayed cleanup task must not allow an expired hold to block a seat indefinitely or allow conflicting reservations.

### 6.6 Payment Verification

A temporary hold does not constitute a completed purchase. TicketHub confirms an order and issues a ticket only after the payment provider's result has been verified.

The system must handle failed payments, delayed payment notifications, and repeated requests safely. Idempotency keys and unique order constraints help prevent duplicate processing.

If payment fails, the system follows its reservation policy to release the seat or permit a controlled retry.

### 6.7 Example: Two Customers Requesting the Same Seat

Suppose Alice and Brian both request seat A15 at the same time.

Both requests reach the backend, which attempts to claim the seat using a conditional database update. Only one request can successfully change the seat from available to held. The other request receives a conflict response, such as HTTP `409 Conflict`.

If Alice wins, her reservation temporarily holds the seat while she completes checkout. Once her payment is verified, TicketHub confirms her order and issues her ticket.

The database remains the authoritative source for seat ownership. The frontend and cached seat maps may display outdated availability, but they cannot override the database's reservation rules.

This design combines conditional updates, transactions, constraints, temporary holds, and payment verification to prevent double-booking during both normal traffic and popular concert sales.

## 7. System Architecture

TicketHub uses a horizontally scalable web architecture designed to handle normal traffic and sudden demand during popular concert sales. The proposed architecture separates traffic management, application processing, seat reservation, payment processing, and monitoring.

### 7.1 Architecture Diagram

```text
                         CUSTOMERS
                             |
                             v
                         DNS / CDN
                             |
                             v
                  VIRTUAL WAITING ROOM
                             |
                             v
                       LOAD BALANCER
                             |
                 +-----------+-----------+
                 |           |           |
                 v           v           v
             APP SERVER  APP SERVER  APP SERVER
                 |           |           |
                 +-----------+-----------+
                             |
                             v
                       TICKETING API
                             |
                 +-----------+-----------+
                 |           |           |
                 v           v           v
             DATABASE    PAYMENT       CACHE
                         PROVIDER
                 |
                 v
          RESERVATIONS & ORDERS

          BACKGROUND WORKER
                 |
                 v
          EXPIRE OLD HOLDS

          MONITORING & ALERTS
          Observe system health
```

This diagram represents a proposed design. It does not imply that every component has already been implemented.

### 7.2 Component Explanations

**DNS:** Directs customers to TicketHub using its domain name.

**Content Delivery Network (CDN):** Serves suitable static content, such as images, stylesheets, and JavaScript files. This reduces the load on application servers.

**Virtual Waiting Room:** Controls admission to the purchasing process during popular sales. A documented queue policy, such as randomized ordering for customers arriving during a designated sale-opening window, can promote fair access.

**Load Balancer:** Distributes incoming requests across healthy application servers. It helps prevent individual servers from becoming overloaded.

**Application Servers:** Execute the backend logic for event browsing, seat selection, reservations, orders, and ticket retrieval. Additional stateless application servers can be added when demand increases.

**Ticketing API:** Provides endpoints for browsing events, viewing seats, creating temporary holds, initiating payments, and retrieving tickets. It validates requests and coordinates the relevant business operations.

**Database:** Stores customers, events, seats, reservations, and orders. Transactions, conditional updates, and constraints protect seat allocation and booking consistency. The database remains the authoritative source for reservations and confirmed orders.

**Payment Provider:** Processes customer payments. TicketHub verifies payment results before confirming an order and issuing a ticket.

**Cache:** Stores frequently requested public information, such as event details, to reduce database load. Seat availability must be verified against the authoritative database before a reservation succeeds.

**Background Worker:** Processes tasks such as releasing expired seat holds. Reservation logic must also check expiration directly so that a delayed worker cannot allow an expired hold to block a seat indefinitely.

**Monitoring and Alerts:** Tracks request rates, response times, error rates, server health, database performance, and payment failures. Alerts help operators identify and resolve problems.

### 7.3 Handling the Big Sale

During a popular concert sale, 200,000 people may attempt to purchase tickets within 10 minutes. TicketHub must manage this demand without allowing the purchasing system to become overwhelmed.

First, the CDN serves suitable static content, while the virtual waiting room regulates access to the purchasing process. The load balancer distributes admitted requests across healthy application servers. Additional servers can be added as demand increases.

The cache reduces unnecessary database requests for public event information. However, seat reservations must use the authoritative database because cached availability can become outdated.

When customers request seats, the backend uses conditional updates, database transactions, and constraints to ensure that only one active reservation can claim a particular seat. The payment provider processes payments, and orders are confirmed only after payment has been verified.

Background workers help release expired reservations. Monitoring and alerts identify overloaded components, slow queries, and increasing error rates.

Before a major sale, the team should conduct load tests to measure the system's actual capacity and identify bottlenecks. The supplied traffic estimates are a starting point; the exact number of servers and the required admission rate must be established through testing.

This architecture improves scalability and reliability while keeping seat reservation correctness under database control.

## 8. Trade-Offs

TicketHub's design involves several trade-offs between performance, correctness, fairness, and operational complexity.

### 8.1 Caching Versus Data Correctness

**Decision:** Cache public event information to improve response speed and reduce database load.

**Advantages:** Event details can load faster, and fewer requests need to reach the database.

**Disadvantages:** Cached information may become outdated, and cache invalidation introduces complexity.

**Justification:** TicketHub should cache suitable public information, such as event descriptions, but verify seat availability against the authoritative database before accepting a reservation. This improves performance without relying on potentially stale data for booking decisions.

### 8.2 Virtual Waiting Room Versus Immediate Access

**Decision:** Use a virtual waiting room during exceptionally popular ticket sales.

**Advantages:** It controls the rate at which customers enter the purchasing process and reduces pressure on application servers and the database.

**Disadvantages:** Customers may experience waiting times, and the queue requires additional operational management.

**Justification:** During a sale with 200,000 purchase attempts and only 20,000 seats, controlling admission helps protect system reliability. A clearly published admission policy, such as randomized ordering within a defined sale-opening window, can promote fair access.

### 8.3 Temporary Holds Versus Seat Availability

**Decision:** Allow customers to hold seats temporarily while completing checkout.

**Advantages:** Customers have time to complete payment, and competing customers cannot simultaneously claim the same seat.

**Disadvantages:** Seats may remain unavailable while customers delay or abandon checkout. Expiration and recovery logic also add complexity.

**Justification:** TicketHub should assign each hold an expiration time and release expired seats safely. The reservation process must check expiration directly rather than relying only on background cleanup.

### 8.4 Relational Database Versus NoSQL Database

**Decision:** Use PostgreSQL as the primary database for reservations and orders.

**Advantages:** PostgreSQL supports transactions, foreign keys, unique constraints, and relational queries that help maintain booking consistency.

**Disadvantages:** High write contention can create bottlenecks, and scaling writes across multiple database nodes requires careful planning.

**Justification:** Preventing duplicate seat purchases is more important than maximizing write throughput at the expense of correctness. TicketHub should scale application servers horizontally, optimize database queries, and cache suitable read-heavy information while keeping reservation decisions in the authoritative database.

## 9. Risks and Open Questions

### 9.1 Risks and Mitigations

**Database overload:** A popular concert sale may generate many simultaneous reservation requests. TicketHub will use a virtual waiting room, efficient database queries, appropriate indexes, and load testing to reduce this risk.

**Payment delays or failures:** A payment provider may respond slowly or fail to confirm a transaction immediately. TicketHub will track payment states, use idempotency keys to prevent duplicate processing, and reconcile delayed payment notifications before confirming orders.

**Expired reservations:** Customers may abandon checkout while holding seats. Temporary holds will have expiration times, and the reservation process will verify expiration before allowing a seat to be claimed again.

**Application server failure:** An application server may become unhealthy during a sale. A load balancer will direct traffic to healthy servers, while monitoring and alerts help operators identify failures.

**Unfair access:** Customers may feel disadvantaged if the waiting room behaves unpredictably. TicketHub will publish its admission policy, apply it consistently, and monitor queue behavior.

**Database failure:** A database failure could interrupt ticket sales. TicketHub should use appropriate backups, recovery procedures, and database availability measures to protect booking records and reduce downtime.

### 9.2 Open Questions

The following questions must be answered before implementation:

1. What is the maximum acceptable response time during a popular sale?
2. How long should a customer be allowed to hold a seat before the reservation expires?
3. What queue policy will provide fair access to customers?
4. What peak request rate should load tests target?
5. What happens if payment succeeds at the provider but the confirmation reaches TicketHub late?
6. What recovery time and acceptable data-loss objectives should the service guarantee?

These questions require business decisions, capacity testing, and operational planning before TicketHub can be deployed reliably.
