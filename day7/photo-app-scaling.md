# SnapShare - Scaling Plan

## 1. Assumptions

- 10,000,000 registered users; 10% active each day.
- Each active user, per day: uploads 1 photo, views 50 feed packages.
- Photo = 2 MB, thumbnail = 50 KB. 1 day = 86,400 seconds. Peak traffic = 5x average traffic.

- **Daily active users (DAU)** = 10,000,000 x 10% = **1,000,000**

## 2. Estimates

- **Uploads:** 1,000,000/day / 100,000 = **10 per second** (peak **50/s**)
- **Feed views:** 50,000,000/day / 100,000 = **500 per second** (peak **2,500/s**)
- **Storage:** originals 1,000,000 x 2 MB = 2 TB/day = 730 TB/year; thumbnails 50 GB/day = 18 TB/year; total about **750 TB per year**

## 3. Read-heavy or write-heavy?

**Read-heavy:** 500 feed views/s vs 10 uploads/s = 50 reads per write. So make reads cheap (CDN, cache, read replicas), keep uploads reliable, do slow work in the background, and accept feeds that are a few seconds stale.

## 4. Photos and the database

Photos must not be stored in the database: 750 TB/year of large files would make it huge, slow and costly to back up and replicate. They go in **object storage** (e.g. Amazon S3), built for cheap, durable storage of large files. The database keeps only small metadata (id, owner, caption, time, file URL), and the CDN delivers the files.

## 5. Architecture

```text
Users --> DNS
  |  \__ photos, CSS, JS __> CDN --miss--> OBJECT STORAGE
  |                                          ^           ^
  v API calls (HTTPS)                        |           |
Load Balancer                                |           |
  |                                          |           |
  +--> App 1 --+                             |           |
  +--> App 2 --+-- save/read photos ---------+           |
  +--> App 3 --+                                         |
        |  |  |                                          |
        |  |  +--> Queue --> Worker -- thumbnails -------+
        |  +-----> Primary DB (writes) --copies--> Read Replica (feed reads)
        +--------> Cache (Redis)
```

## 6. Components (one sentence each)

- **Clients:** the app or browser users upload and scroll with.
- **DNS:** turns snapshare.com into our server addresses.
- **CDN:** serves photos and static files from servers near users, cutting latency and load.
- **Load balancer:** spreads requests over healthy app servers, avoiding overload and a single point of failure.
- **App servers:** stateless API servers, so we can add more as traffic grows.
- **Cache (Redis):** keeps feeds in memory so most reads skip the database.
- **Primary DB:** source of truth for metadata; takes all writes.
- **Read replica:** a copy that serves feed queries, protecting the primary.
- **Object storage:** cheap, durable home for hundreds of TB of photos and thumbnails.
- **Queue:** holds thumbnail jobs so uploads return fast and bursts wait safely.
- **Worker:** creates thumbnails in the background.

## 7. Upload flow

1. App sends the photo (`POST /photos`) through the load balancer to an app server.
2. App server checks the user's token, file type and size.
3. It saves the original to object storage.
4. It writes the photo's metadata row to the primary DB.
5. It adds the job "make thumbnail for photo 123" to the queue.
6. It invalidates followers' cached feeds and replies **201 Created** at once.
7. A worker takes the job and reads the original from object storage.
8. It creates the 50 KB thumbnail, saves it to object storage and updates the DB row (failed jobs are retried).
9. The CDN serves the thumbnail to followers; a placeholder shows until it is ready.
   **Failure handling:** If the original photo is saved to object storage but the database write fails, the system retries the database operation. If the upload cannot be completed, a background cleanup job removes orphaned files after a safe waiting period. The system should also retry failed thumbnail jobs.

## 8. Trade-offs

1. **Speed vs freshness:** cache and replicas make feeds fast, but a new photo may appear a few seconds late (eventual consistency). Fine for a photo feed.
2. **Fast upload vs instant thumbnail:** the queue keeps uploads quick at 50/s peak, but the thumbnail arrives a moment later.
3. **Cost vs reliability:** more servers, a CDN and replicas cost more but remove single points of failure.
4. **Simplicity vs scalability:** we skip sharding because metadata is small (about 1 GB/day); one primary plus replicas is enough for now.
