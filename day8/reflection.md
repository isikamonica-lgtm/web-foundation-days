# Day 8 Reflection

The most difficult concept in the course was handling concurrency when multiple users try to change the same data at once. Ticket sales made the problem concrete: two people can both see a seat as available, so checking availability in the application and then saving later is not enough. I worked through it by tracing two purchase requests step by step and identifying where the database transaction, row lock, and unique constraint must act together. The key lesson was that the database, not a cached seat map or the interface, has to decide who owns the seat.

Based on the feedback I received, I would improve my capstone is by making its assumptions and failure paths more explicit. I would explain what happens when traffic spikes, a hold expires during checkout, or a payment callback is retried, rather than describing only the successful path. I would also add measurable latency and capacity targets so reviewers can assess whether the architecture meets its goals.

Next, I want to learn more about load testing and observability for distributed systems. I would practice generating realistic traffic, finding the bottleneck, and using metrics and traces to distinguish a slow database from a queue or payment-provider delay. That would help me validate designs with evidence instead of relying only on estimates.
This reflection is part of my Day 8 TicketHub system design assignment.
