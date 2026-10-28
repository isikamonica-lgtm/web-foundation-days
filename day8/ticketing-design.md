# TicketHub — System Design

## 1. Requirements

### Functional Requirements

- Users can browse events and view event details.
- Users can view available seats for an event.
- Users can temporarily hold an available seat while completing payment.
- Users can pay for a held seat and receive a ticket.
- Users can view their purchased tickets.
- The system must prevent two customers from purchasing the same seat.

### Non-Functional Requirements

- **Performance:** Event pages and seat maps should load quickly.
- **Correctness:** A seat must never be confirmed for two customers.
- **Fairness:** A waiting room should manage demand during popular sales.
- **Availability:** The system should remain usable if an application server fails.
- **Scalability:** The architecture should handle large increases in traffic.
- **Security:** Users must be authenticated, and payments must be verified securely.

## 2. Traffic Estimates

### Normal Traffic

- Registered users: 2,000,000.
- Daily visitors: 50,000.
- Pages per visitor: 10.
- Daily page views: 50,000 × 10 = 500,000.
- Average page views per second: 500,000 ÷ 86,400 ≈ 5.8.
- Tickets sold per day: 5,000.

### Popular Sale

- People attempting to buy tickets: 200,000.
- Seats available: 20,000.
- Time window: 10 minutes (600 seconds).
- Average purchase-attempt rate: 200,000 ÷ 600 ≈ 333 attempts per second.
- Potential demand exceeds supply by 180,000 people if each person attempts to buy one seat.

The sale requires additional capacity, controlled admission, and careful database handling. Purchase attempts are not the same as page views, so the two rates should not be treated as identical workloads.

## 3. API Design

### Browse Events

`GET /api/events`

Returns a list of upcoming events.

Example response:

```json
{
  "events": [
    {
      "id": 101,
      "name": "Summer Concert",
      "date": "2027-06-15"
    }
  ]
}
```

### View Event Details

`GET /api/events/{eventId}`

Returns information about a specific event.

### View Seats

`GET /api/events/{eventId}/seats`

Returns the seats and their current availability.

### Hold a Seat

`POST /api/holds`

Example request:

```json
{
  "eventId": 101,
  "seatId": 5001
}
```

The server checks availability and creates a temporary hold with an expiration time.

### Make a Payment

`POST /api/payments`

The request identifies the hold and includes a payment-provider reference or payment method token. The server verifies payment with the payment provider before confirming the order.

An idempotency key should prevent retries from charging the customer or creating an order twice.

### View Purchased Tickets

`GET /api/tickets`

Returns tickets belonging to the authenticated user.

### Important Error Responses

- `400 Bad Request`: Invalid input.
- `401 Unauthorized`: User is not authenticated.
- `404 Not Found`: Event or seat does not exist.
- `409 Conflict`: Seat is no longer available.
- `410 Gone`: Hold has expired.
- `429 Too Many Requests`: Request rate limit exceeded.
- `503 Service Unavailable`: Service temporarily unavailable.

## 4. Data Model

### Users

- `user_id` — Primary key.
- `name`
- `email` — Unique.
- `created_at`

### Events

- `event_id` — Primary key.
- `name`
- `venue`
- `event_date`
- `status`

### Seats

- `seat_id` — Primary key.
- `event_id` — Foreign key to Events.
- `seat_number`
- `status`

A unique constraint on `(event_id, seat_number)` prevents duplicate seat records for the same event.

### Orders

- `order_id` — Primary key.
- `user_id` — Foreign key to Users.
- `seat_id` — Foreign key to Seats.
- `hold_id` — Reference to the hold used for the purchase.
- `payment_status`
- `order_status`
- `created_at`

A database constraint or equivalent transactional rule must prevent more than one confirmed order for the same seat.

### Seat_Holds

- `hold_id` — Primary key.
- `user_id` — Foreign key to Users.
- `seat_id` — Foreign key to Seats.
- `status`
- `expires_at`
- `created_at`

A hold is temporary. Expired holds must be marked expired or otherwise made inactive within the transactional booking logic before another customer can acquire the seat.

### Relationships

- One user can create many orders.
- One event can have many seats.
- One seat can have multiple historical holds.
- A seat can have at most one confirmed purchase.
- An order must reference a valid user and seat.

## 5. Preventing Double-Booking

The database, not the user interface or cache, must be the final authority on seat ownership.

When a customer requests a seat, the server starts a database transaction and attempts a conditional update that succeeds only if the seat is still available. If another transaction has already claimed it, the update affects no rows and the request fails.

The system then creates the temporary hold in the same transaction. Database constraints provide additional protection against duplicate confirmed orders.

When payment succeeds, the server verifies the payment and confirms the order transactionally. If payment fails or the hold expires, the hold is released according to the defined recovery process.

For example, Alice and Brian attempt to purchase seat A12 simultaneously. Only one transaction can successfully claim the available seat. The other customer receives a conflict response and must select another seat.

This approach prevents two customers from receiving confirmed tickets for the same seat, even when requests arrive at the same time.

## 6. System Architecture

```text
Customers
    |
    v
DNS and CDN
    |
    v
Virtual Waiting Room
    |
    v
Load Balancer
    |
    +-------------------+
    |         |         |
    v         v         v
 App 1      App 2      App 3
    |         |         |
    +---------+---------+
              |
              v
         Ticketing API
              |
       +------+------+
       |      |      |
       v      v      v
    Cache  Primary  Payment
   (Redis) Database Provider
              |
              v
        Background Worker
              |
              v
        Notifications

Monitoring and logging cover all components.
```

### Component Responsibilities

- **DNS/CDN:** Routes users and serves static content efficiently.
- **Virtual waiting room:** Controls admission during high-demand sales.
- **Load balancer:** Distributes requests among healthy application servers.
- **Application servers:** Handle authentication, event browsing, seat selection, and order requests.
- **Ticketing API:** Applies booking rules and coordinates database operations.
- **Cache:** Speeds up event pages and non-critical reads; it does not decide final seat ownership.
- **Primary database:** Stores authoritative seat, hold, and order data.
- **Payment provider:** Processes payments and reports payment status.
- **Background worker:** Processes notifications and other asynchronous tasks.
- **Monitoring and logging:** Detects errors, latency, overload, and failed transactions.

## 7. Handling a Popular Sale

During a popular sale, the waiting room admits customers at a controlled rate instead of allowing all 200,000 people to overwhelm the application at once.

The load balancer distributes admitted requests across multiple application servers. Event information and seat-map reads can be cached, but seat availability must be revalidated against the database before a hold or purchase is confirmed.

The database uses transactions and constraints to prevent double-booking. Rate limits help control abusive or excessive requests. Monitoring tracks queue length, response time, database load, payment failures, and error rates.

The architecture should be load-tested before the sale. Capacity targets should be based on measured results rather than assumed server limits.

## 8. Trade-Offs

### Caching vs. Correctness

Caching makes event pages and seat maps faster, but cached information may become stale. The system therefore uses the database to validate seat claims before confirming a hold or purchase.

### Waiting Room vs. Immediate Access

A waiting room delays some customers but protects the system from sudden traffic spikes and helps manage admission fairly.

### Temporary Holds vs. Seat Utilization

Holds give customers time to pay, but abandoned holds temporarily make seats unavailable. Expiration and reliable cleanup help return those seats to sale.

### Relational Database vs. NoSQL

A relational database such as PostgreSQL provides transactions and constraints that suit seat booking. A NoSQL database may scale certain access patterns well, but the team would still need strong mechanisms to guarantee unique seat ownership.

## 9. Risks and Open Questions

- **Database overload:** Use load testing, query optimization, connection pooling, and controlled admission.
- **Payment delays:** Keep holds time-limited and reconcile delayed payment notifications carefully.
- **Expired holds:** Ensure expiration is enforced transactionally and stale holds are cleaned up.
- **Application server failure:** Run multiple instances behind a health-checking load balancer.
- **Queue fairness:** Define admission rules and monitor waiting times.
- **Database failure:** Define backup, recovery, and failover procedures.
- **Abandoned payments:** Reconcile payment-provider records with order status and provide a safe refund or recovery process.

Questions to resolve before implementation include the maximum acceptable response time, hold duration, waiting-room policy, expected peak request rate, payment timeout policy, and recovery-time objectives.

## 10. Conclusion

TicketHub uses a scalable architecture with a waiting room, load balancing, database transactions, and constraints to manage high traffic while preventing double-booking. Caching and background processing improve performance, while monitoring and recovery procedures support reliability.
