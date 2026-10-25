# SnapShare - Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view feed pages containing photos from people they follow.

The estimates use these assumptions:

- Registered users: 10,000,000.
- Daily active users (DAU): 10% of registered users.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- Each original photo averages 2 MB.
- Each photo has one thumbnail averaging 50 KB (0.05 MB).
- For easy estimates, 1 day is approximated as 100,000 seconds.
- Peak traffic is estimated at 5 times the average traffic.
- Every uploaded original photo and its thumbnail are retained for one year.
- Decimal storage units are used: 1,000 KB = 1 MB, 1,000 MB = 1 GB, and 1,000 GB = 1 TB.
- Storage estimates exclude database metadata, backups, replication copies, and any extra image versions.

## 2. Load Estimates

### Daily active users

Daily active users = Registered users × Daily activity percentage

= 10,000,000 × 10%

= **1,000,000 daily active users**.

### Photo uploads per day and per second

Each active user uploads one photo per day.

Daily uploads = 1,000,000 × 1 = **1,000,000 uploads/day**.

Average uploads per second = 1,000,000 ÷ 100,000 = **10 uploads/second**.

Peak uploads per second = 10 × 5 = **50 uploads/second**.

### Feed views per day and per second

Each active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50 = **50,000,000 feed views/day**.

Average feed views per second = 50,000,000 ÷ 100,000 = **500 feed views/second**.

Peak feed views per second = 500 × 5 = **2,500 feed views/second**.

### Photo storage per year

Each day, SnapShare stores 1,000,000 original photos.

Original-photo storage per day:

1,000,000 × 2 MB = 2,000,000 MB = **2,000 GB = 2 TB/day**.

Original-photo storage per year:

2 TB × 365 = **730 TB/year**.

Thumbnail storage per day:

1,000,000 × 50 KB = 50,000,000 KB = **50 GB/day**.

Thumbnail storage per year:

50 GB × 365 = **18.25 TB/year**.

Total annual storage for original photos and thumbnails:

730 TB + 18.25 TB = **748.25 TB/year**, or approximately **750 TB/year**.

These estimates represent new storage added each year, assuming uploads continue at the same rate and files are not deleted.

### Estimate summary

| Measurement                              |                 Estimate |
| ---------------------------------------- | -----------------------: |
| Registered users                         |               10,000,000 |
| Daily active users                       |                1,000,000 |
| Photo uploads per day                    |                1,000,000 |
| Average uploads per second               |                       10 |
| Peak uploads per second                  |                       50 |
| Feed views per day                       |               50,000,000 |
| Average feed views per second            |                      500 |
| Peak feed views per second               |                    2,500 |
| Annual original-photo storage            |                   730 TB |
| Annual thumbnail storage                 |                 18.25 TB |
| Total annual photo and thumbnail storage | 748.25 TB (about 750 TB) |

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is **read-heavy** because users view feed pages much more frequently than they upload photos. The estimate is 50,000,000 feed views and 1,000,000 uploads per day, which means approximately **50 feed views for every photo upload**.

The architecture should prioritize fast reads. A CDN can deliver photo files and thumbnails efficiently, a cache can serve frequently requested feed data, and database read replicas can handle many metadata queries. Uploads should be reliable, while thumbnail generation should happen in the background so it does not slow down the upload response.

## 4. Why Photos Should Use Object Storage

Original photos and thumbnails should be stored in **object storage**, not directly inside the relational database. Hundreds of terabytes of large binary files would increase database size, backup time, and storage and input/output pressure.

Object storage is designed to store large files durably and scale as the number of photos grows. The database should store structured metadata such as the photo ID, owner, caption, upload time, and object-storage key or URL. The CDN can then cache and deliver the files to users.

## 5. SnapShare Architecture Diagram

```text
                           +------------------+
                           |   Users/Clients  |
                           | browser or mobile|
                           +--------+---------+
                                    |
                                    v
                               +----+----+
                               |   DNS   |
                               +----+----+
                                    |
                 +------------------+-------------------+
                 |                                      |
                 v                                      v
        +-------------------+                  +-------------------+
        | CDN               |                  | API requests      |
        | static files,     |                  | over HTTPS        |
        | photos, thumbnails|                  +---------+---------+
        +---------+---------+                            |
                  ^                                      v
                  |                              +-------+--------+
                  |                              | Load Balancer  |
                  |                              +-------+--------+
                  |                                      |
                  |                     +----------------+----------------+
                  |                     |                |                |
                  |                     v                v                v
                  |               +-----------+    +-----------+    +-----------+
                  |               | App       |    | App       |    | App       |
                  |               | Server 1  |    | Server 2  |    | Server 3  |
                  |               +-----+-----+    +-----+-----+    +-----+-----+
                  |                     |                |                |
                  |                     +----------------+----------------+
                  |                                      |
                  |             +------------------------+----------------------+
                  |             |                        |                      |
                  |             v                        v                      v
                  |       +-----------+           +-------------+        +-------------+
                  |       | Cache     |           | Primary DB  |        | Message     |
                  |       | (Redis)   |           | metadata    |        | Queue       |
                  |       +-----------+           +------+------+        +------+------+
                  |                                      |                      |
                  |                                      | replication          v
                  |                                      v               +-------------+
                  |                               +-------------+        | Thumbnail   |
                  |                               | Read Replica|        | Worker      |
                  |                               | feed reads  |        +------+------+
                  |                               +-------------+               |
                  |                                                              |
                  |                         original photo and thumbnail files  |
                  +--------------------------------------------------------------+
                                                   +-----------------------------+
                                                   |
                                                   v
                                          +-------------------+
                                          | Object Storage    |
                                          | originals and     |
                                          | thumbnails        |
                                          +-------------------+

Flow notes:
- API requests go through the load balancer to any healthy app server.
- App servers read and write photo metadata through the database and use Redis
  to cache frequently requested feed data.
- New metadata writes go to the primary database; read-heavy queries can use
  the read replica.
- After an original photo is stored, the app queues a thumbnail job.
- A background worker reads the original from object storage, creates a
  thumbnail, and saves it back to object storage.
- The CDN caches and delivers static files, photos, and thumbnails to users.
```

## 6. Components and the Problems They Solve

- **Users/clients:** Let people upload photos and browse feeds.
- **DNS:** Translates the SnapShare domain name into the network address used to reach the service.
- **CDN:** Delivers static files, photos, and thumbnails from nearby edge servers, reducing image latency and origin traffic.
- **Load balancer:** Distributes API requests across healthy app servers and stops sending traffic to unhealthy servers.
- **App servers:** Authenticate users, validate uploads, implement feed and upload logic, and coordinate the database, object storage, cache, and queue.
- **Cache (Redis):** Keeps frequently requested feed data in fast memory to reduce repeated database queries and improve response time.
- **Primary database:** Stores the authoritative records for users, follows, captions, timestamps, and photo metadata, and accepts metadata writes.
- **Read replica:** Serves many metadata read queries so the primary database can focus on writes.
- **Object storage:** Stores original photo files and generated thumbnails separately from the database, scaling to hundreds of terabytes of files.
- **Message queue:** Holds thumbnail-generation jobs so the upload request does not have to wait for image processing.
- **Thumbnail worker:** Processes queued jobs, creates smaller thumbnail images, and saves them in object storage.

## 7. Step-by-Step Photo Upload Flow

1. A user selects a photo and submits it through the SnapShare app over HTTPS.
2. The request reaches the load balancer, which forwards it to a healthy app server.
3. The app server authenticates the user and validates the file type, file size, and request.
4. The app server stores the original photo in object storage and records the object's key or URL.
5. The app server saves the photo metadata (such as owner, caption, upload time, and object-storage key) in the primary database.
6. Once the original file and metadata have been saved successfully, the app server places a job such as `generate thumbnail for photo 123` on the message queue.
7. The app server responds to the user with a success response (for example, `201 Created`) without waiting for thumbnail processing to finish.
8. A thumbnail worker retrieves the job from the queue and reads the original photo from object storage.
9. The worker creates a smaller thumbnail, saves it to object storage, and updates the photo metadata with the thumbnail key or URL.
10. The CDN can cache and deliver the original and thumbnail to users. If the thumbnail is not ready yet, the app can show a placeholder.
11. Feed data in the cache should expire or be invalidated when needed so followers can see new photo metadata. Because caches and read replicas may briefly lag, a new photo may not appear in every feed immediately.

This pipeline separates slow image processing from the user-facing upload request. If thumbnail jobs arrive faster than workers can process them, jobs wait in the queue rather than making every upload request do the processing itself.

## 8. Design Trade-Offs

### Trade-off 1: Speed versus freshness

Caching feed data makes reads faster and reduces database load, but cached feeds may briefly show outdated information. SnapShare can accept a short delay for a new photo to appear, while using cache expiration or invalidation to limit stale results.

### Trade-off 2: Fast upload response versus immediate thumbnail availability

Creating thumbnails in the background lets the app respond quickly, even when many photos are uploaded at once. However, a thumbnail may not be ready immediately, so the app may need to show a placeholder until the worker finishes.

### Trade-off 3: Scalability and reliability versus cost

Multiple app servers, a read replica, a CDN, a queue, and object storage improve performance and resilience, but they add infrastructure and operating costs. SnapShare should add capacity based on measured traffic and reliability needs.

### Trade-off 4: Simple architecture versus operational complexity

A single application and database are easier to build and maintain initially. Distributing work across app servers, caches, replicas, queues, and workers scales better, but requires monitoring, retry handling, and more careful debugging.

## Conclusion

Using the required estimation shortcut, SnapShare has **1,000,000 daily active users**, about **10 average uploads per second** (50 at peak), and about **500 average feed views per second** (2,500 at peak). Original photos and thumbnails add approximately **748.25 TB of storage per year** under the stated assumptions.

The system is read-heavy, so the design prioritizes fast feed delivery through a CDN, cache, and read replica. Original photos are kept in object storage, while a message queue and background thumbnail worker keep image processing separate from the user-facing upload request.
