# SnapShare - Scaling Plan

SnapShare is a photo-sharing app: users upload photos and scroll a feed of
photos from people they follow.

**In one glance:** 1,000,000 daily active users, 10 uploads/s (50 peak),
500 feed views/s (2,500 peak), about 750 TB of new photos per year.
The system is very read-heavy (50 reads per write) and storage-heavy, so the
design uses a CDN + cache + read replica for reads, object storage for files,
and a queue + worker for thumbnails.

## 1. Assumptions

- 10,000,000 registered users; 10% are active each day.
- Each active user uploads 1 photo per day and views 50 feed pages per day.
- Original photo = 2 MB; its thumbnail = 50 KB (0.05 MB).
- 1 day is about 100,000 seconds (rounded from 86,400).
- Peak traffic = 5 x the average.
- Decimal units: 1,000 KB = 1 MB, 1,000 MB = 1 GB, 1,000 GB = 1 TB.
- Photos are kept for at least a year. Backups and replica copies are not counted.

**Daily active users (DAU)** = 10,000,000 x 10% = **1,000,000**

## 2. Estimates

```text
Uploads (writes):
  1,000,000 users x 1 photo        = 1,000,000 uploads per day
  1,000,000 / 100,000              = 10 uploads per second (average)
  peak: 10 x 5                     = 50 uploads per second

Feed views (reads):
  1,000,000 users x 50 views       = 50,000,000 feed views per day
  50,000,000 / 100,000             = 500 feed views per second (average)
  peak: 500 x 5                    = 2,500 feed views per second

Photo storage per year:
  originals:   1,000,000 x 2 MB    = 2 TB per day  -> x 365 = 730 TB per year
  thumbnails:  1,000,000 x 50 KB   = 50 GB per day -> x 365 = 18.25 TB per year
  total                            = 748.25 TB, about 750 TB per year
```

| Measure                | Average      | Peak (5x) |
| ---------------------- | ------------ | --------- |
| Daily active users     | 1,000,000    | -         |
| Uploads per second     | 10           | 50        |
| Feed views per second  | 500          | 2,500     |
| Photo storage per year | about 750 TB | -         |

## 3. Read-heavy or write-heavy?

**Read-heavy.** There are 500 feed views per second but only 10 uploads per
second: about **50 reads for every 1 write**. What this means for the design:

- Make reads cheap: CDN for images, Redis cache for feeds, read replicas for
  database queries.
- Make writes reliable rather than instant: uploads are saved safely and slow
  work (thumbnails) runs later in the background.
- A new photo appearing a few seconds late is acceptable, so caching is safe.

## 4. Why photos must not be stored in the database

Photos are large binary files: 750 TB per year would make the database huge,
slow, expensive to back up and replicate, and would fill its memory with big
files instead of small fast rows. Every feed load would also push heavy files
through the database and app servers.

Photo files go into **object storage** (for example Amazon S3), which is built
to store huge numbers of large files cheaply and durably. The database stores
only small **metadata** per photo: id, owner, caption, time and the file's URL
or key. Users download images through the **CDN**.

## 5. Architecture diagram

```text
        Users (browser / mobile app)
          |                      |
   (a) DNS, then API         (b) images, CSS, JS
       calls (HTTPS)             |
          v                      v
  +---------------+         +---------+  cache miss   +----------------+
  | Load Balancer |         |   CDN   |-------------->| OBJECT STORAGE |
  +-------+-------+         +---------+               | originals and  |
          |                                           | thumbnails     |
    +-----+-------+---------+                         +----------------+
    |             |         |                             ^          ^
+-------+     +-------+ +-------+   save / read photo     |          |
| App 1 |     | App 2 | | App 3 |-------------------------+          |
+---+---+     +---+---+ +---+---+                                    |
    |             |         |                                        |
    +------+------+---+-----+----+                                   |
           |          |          |                                   |
           v          v          v                                   |
   +-----------+ +------------+ +---------+    +--------+            |
   |   Cache   | | Primary DB | |  Queue  |--->| Worker |------------+
   |  (Redis)  | | (metadata) | +---------+    +--------+  saves thumbnail
   +-----------+ +-----+------+
                       | copies data
                       v
                +--------------+
                | Read Replica |  (feed queries)
                +--------------+
```

Reading the diagram: (a) API calls go through the load balancer to any app
server; (b) images and static files come from the CDN, which fetches from
object storage only on a miss. Writes go to the primary DB, feed reads go to
the replica, and slow jobs go to the queue, then the worker.

## 6. Components, one sentence each

- **Users/clients:** the browser or mobile app that uploads photos and scrolls the feed.
- **DNS:** turns snapshare.com into the IP addresses of our servers so users can find us.
- **CDN:** serves photos, thumbnails and static files from edge servers near users, which cuts latency and keeps image traffic off our servers.
- **Load balancer:** spreads API requests across healthy app servers, so no single server is overloaded or a single point of failure.
- **App servers (stateless):** run the upload and feed logic, and because they hold no user data in memory, any server can handle any request and we can add more as traffic grows.
- **Cache (Redis):** keeps prepared feeds in fast memory so the 500+ feed views per second do not all hit the database.
- **Primary database:** holds the one true copy of users, follows and photo metadata and accepts all writes.
- **Read replica:** serves the heavy feed queries from a copy of the primary, protecting the primary.
- **Object storage:** stores hundreds of terabytes of original photos and thumbnails cheaply and durably, which a database cannot do well.
- **Message queue:** holds thumbnail jobs so the upload request can finish quickly, and lets bursts of uploads wait instead of overloading the system.
- **Thumbnail worker:** takes jobs from the queue and creates the 50 KB thumbnails in the background so users never wait for image processing.

## 7. Upload flow, step by step

1. The user picks a photo; the app sends it to the API (`POST /photos`) over HTTPS.
2. DNS resolves the domain and the request reaches the **load balancer**, which forwards it to a healthy **app server**.
3. The app server checks the user's token and validates the file type and size (and applies rate limiting).
4. It saves the original 2 MB photo to **object storage** and gets back the file's key/URL.
5. It inserts a metadata row (photo id, owner, caption, time, URL) into the **primary database**.
6. It adds a job "make thumbnail for photo 123" to the **queue**.
7. It invalidates the cached feeds of the user's followers, then replies **201 Created** straight away; the user does not wait for the thumbnail.
8. In the background, a **worker** takes the job from the queue and reads the original from object storage.
9. The worker creates the 50 KB thumbnail, saves it to object storage and updates the photo's row with the thumbnail URL. If it fails, the job is retried with back-off (wait 1s, 2s, 4s).
10. Followers load their feed (cache or read replica) and the **CDN** serves the thumbnail; until it is ready the app shows a placeholder.

## 8. Trade-offs

1. **Speed vs freshness.** Cached feeds and read replicas make scrolling fast and protect the database, but a follower may see a new photo a few seconds late (cache expiry, replication lag). Acceptable for a photo feed, unlike a bank balance.
2. **Fast upload vs immediate thumbnail.** The queue and worker give a quick reply even in busy periods, but the thumbnail appears a moment later, so the app shows a placeholder. Doing resizing inside the request would exhaust app server threads at 50 uploads/s.
3. **Cost vs reliability.** Several app servers, a replica, a CDN and object storage cost more money than one server, but they remove single points of failure and are far cheaper and more reliable than serving 750 TB a year from our own machines.
4. **Simplicity vs scalability.** One server and one database are easy to build, but cannot handle 2,500 feed views/s or this much storage. We accept the extra complexity of a load balancer, queue and workers, but avoid sharding: photo metadata is small (about 1 KB x 1,000,000 = 1 GB per day), so one primary with replicas is enough for now.

## 9. Extra: when something fails

- **App server crashes:** the load balancer's health check stops sending it traffic; servers are stateless, so no data is lost.
- **Primary database fails:** a read replica is promoted to primary (failover).
- **Worker is slow or down:** jobs wait safely in the queue; photos still upload and show a placeholder (graceful degradation).
- **Monitoring:** logs, metrics (latency, error rate, cache hit rate, queue length) and alerts show problems before users notice.
