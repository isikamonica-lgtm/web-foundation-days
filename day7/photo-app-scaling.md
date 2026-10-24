SnapShare Scaling Plan

1\. Assumptions



SnapShare is a photo-sharing application where users upload photos and view feeds containing photos from people they follow.



The following assumptions are used for the scaling estimates:



\* Registered users: 10,000,000.

\* Daily active users: 10% of registered users.

\* Each active user uploads 1 photo per day.

\* Each active user views 50 feed pages per day.

\* Each original photo is approximately 2 MB.

\* Each photo has one thumbnail of approximately 50 KB.

\* One day is approximated as 100,000 seconds for the calculations.

\* Peak traffic is estimated to be five times the average traffic.

\* The system receives one million photo uploads every day throughout the year.

\* Storage calculations use decimal units: 1,000 KB = 1 MB and 1,000 MB = 1 GB.

2\. Load Estimates

Daily Active Users



Daily active users = Registered users × Daily activity percentage



= 10,000,000 × 10%



= 1,000,000 daily active users.



Photo Uploads Per Day



Each active user uploads one photo per day.



Daily uploads = 1,000,000 × 1



= 1,000,000 uploads per day.



Average Uploads Per Second



Average uploads per second = Daily uploads ÷ 100,000



= 1,000,000 ÷ 100,000



= 10 uploads per second.



&#x20;Peak Uploads Per Second



Peak uploads = Average uploads × 5



= 10 × 5



= 50 uploads per second.



Feed Views Per Day



Each active user views 50 feed pages per day.



Daily feed views = 1,000,000 × 50



= 50,000,000 feed views per day.

&#x20;Average Feed Views Per Second



Average feed views per second = 50,000,000 ÷ 100,000



= 500 feed views per second.



Peak Feed Views Per Second



Peak feed views = Average feed views × 5



= 500 × 5



= 2,500 feed views per second.



\### Photo Storage Per Year



Each original photo is 2 MB.



Daily original-photo storage:



1,000,000 × 2 MB = 2,000,000 MB = 2 TB per day.



Annual original-photo storage:



2 TB × 365 = 730 TB per year.



Each thumbnail is 50 KB.



Daily thumbnail storage:



1,000,000 × 50 KB = 50,000,000 KB = 50 GB per day.



Annual thumbnail storage:



50 GB × 365 = 18.25 TB per year.



Total annual photo storage:



730 TB + 18.25 TB = 748.25 TB per year.



Therefore, SnapShare needs approximately 748.25 TB of additional storage per year for original photos and thumbnails.



These estimates exclude database records, backups, replication overhead, and additional image versions.

&#x20;Summary of Load Estimates



| Measurement                   |   Estimate |

| ----------------------------- | ---------: |

| Registered users              | 10,000,000 |

| Daily active users            |  1,000,000 |

| Photo uploads per day         |  1,000,000 |

| Average uploads per second    |         10 |

| Peak uploads per second       |         50 |

| Feed views per day            | 50,000,000 |

| Average feed views per second |        500 |

| Peak feed views per second    |      2,500 |

| Annual original-photo storage |     730 TB |

| Annual thumbnail storage      |   18.25 TB |

| Total annual photo storage    |  748.25 TB |

&#x20;3. Is SnapShare Read-Heavy or Write-Heavy?



SnapShare is a read-heavy system because users view feed pages much more frequently than they upload photos.



The application handles approximately 500 feed views per second on average and 10 photo uploads per second.



This means feed views occur approximately 50 times more frequently than photo uploads.



The design should therefore prioritize efficient reads by using caching, database read replicas, and a CDN to deliver photos and thumbnails quickly.



Multiple application servers and a load balancer will also help the application handle peak traffic.

&#x20;4. Why Photos Should Use Object Storage



Photos should be stored in object storage rather than directly inside the database.



Original photos and thumbnails are large files, and storing them directly in the database would increase storage requirements and place unnecessary pressure on database operations.



Object storage is designed to store large files reliably and scale as the number of photos grows.



The database should store information about each photo, including its ID, owner, caption, upload time, and object-storage key or URL.



The actual photo files should be stored in object storage. The CDN can then deliver the files to users efficiently.



5\. SnapShare Architecture Diagram



```text

&#x20;                        USERS / CLIENTS

&#x20;                               |

&#x20;                               v

&#x20;                             \[ DNS ]

&#x20;                               |

&#x20;               +---------------+----------------+

&#x20;               |                                |

&#x20;               v                                v

&#x20;       \[ CDN: Static Files ]             \[ API Requests ]

&#x20;       HTML, CSS, JavaScript                     |

&#x20;                                                 v

&#x20;                                         \[ Load Balancer ]

&#x20;                                                 |

&#x20;                           +---------------------+---------------------+

&#x20;                           |                     |                     |

&#x20;                           v                     v                     v

&#x20;                     \[ App Server 1 ]      \[ App Server 2 ]      \[ App Server 3 ]

&#x20;                           |                     |                     |

&#x20;                           +---------------------+---------------------+

&#x20;                                                 |

&#x20;                             +-------------------+-------------------+

&#x20;                             |                   |                   |

&#x20;                             v                   v                   v

&#x20;                      \[ Cache ]           \[ Primary DB ]        \[ Message Queue ]

&#x20;                      (Redis)                    |                    |

&#x20;                                                 v                    v

&#x20;                                          \[ Read Replica ]        \[ Worker ]

&#x20;                                                                      |

&#x20;                                                                      v

&#x20;                                                            \[ Object Storage ]

&#x20;                                                             Original Photos

&#x20;                                                              and Thumbnails



&#x20;                   CDN also delivers cached photos and thumbnails

&#x20;                             from Object Storage.

```

&#x20;6. Components and the Problems They Solve



1.Users/Clients: Allow users to upload photos, view feeds, and interact with SnapShare.



2.DNS: Translates the SnapShare domain name into the IP address needed to reach the application.



3.CDN: Delivers static files, photos, and thumbnails from nearby edge servers to reduce latency and the load on the origin infrastructure.



4.Load Balancer: Distributes incoming API requests across healthy application servers to prevent one server from becoming overloaded.



5.Application Servers: Process API requests, authenticate users, validate uploads, manage feeds, and coordinate database and storage operations.



6.Cache (Redis): Stores frequently accessed feed data and other commonly requested information in memory to reduce database queries and improve response times.



7.Primary Database: Stores authoritative application records, including users, photo metadata, captions, and relationships between users.



8.Read Replica: Handles database read queries to reduce the workload on the primary database, which accepts writes.



9.Object Storage: Stores original photos and thumbnails separately from the database and supports the large storage requirements of a photo-sharing application.



10\. Message Queue: Holds background jobs, such as thumbnail-generation requests, so application servers do not have to complete these tasks before responding to users.



11.Worker: Processes queued jobs in the background, generates thumbnails from uploaded photos, and stores the resulting files in object storage.



7\. Step-by-Step Photo Upload Flow



1\. A user selects a photo and uploads it through the SnapShare application.



2\. The request reaches the load balancer, which forwards it to a healthy application server.



3\. The application server authenticates the user and validates the uploaded photo, including its format and size.



4\. The application server stores the original photo in object storage and obtains its object key or URL.



5\. The application server saves the photo metadata, including the owner, caption, upload time, and object-storage key, in the primary database.



6\. After the original photo has been stored successfully, the application server adds a thumbnail-generation job to the message queue.



7\. The application confirms the successful upload to the user without waiting for the thumbnail-generation job to finish.



8\. A background worker retrieves the job from the queue and generates a smaller thumbnail from the original photo.



9\. The worker stores the thumbnail in object storage and records its key or URL in the database.



10\. The CDN can cache the original photo and thumbnail to improve delivery speed for subsequent requests.



11\. When another user views a feed containing the photo, the application retrieves the relevant feed metadata, using the cache and database as appropriate, and serves the photo through the CDN when available.

8\. Design Trade-Offs



Trade-Off 1: Speed Versus Freshness



Caching feed data improves response times and reduces database load. However, cached feeds may briefly contain outdated information.



For SnapShare, this trade-off can be acceptable if feed updates appear shortly after they occur. Cache invalidation or expiration should be used to limit stale dat

Trade-Off 2: Simplicity Versus Scalability



A single application server is simpler to develop and maintain, but it may become overloaded as the number of users increases.



Multiple application servers behind a load balancer improve scalability and availability, but they introduce additional infrastructure and operational complexity.

Trade-Off 3: Cost Versus Reliability



Using read replicas, redundant application servers, and reliable object storage improves resilience and helps the system handle increasing traffic.



However, additional infrastructure increases operating costs. SnapShare should add capacity according to its workload and reliability requirements.



Trade-Off 4: Immediate Processing Versus Background Processing



Generating thumbnails during the original upload request would make users wait longer.



Using a message queue and background workers allows the application to respond sooner. However, thumbnails may not be available immediately, and the system must handle failed jobs and retry processing when appropriate.



Conclusion



SnapShare requires a scalable architecture because it supports one million daily active users, approximately 2,500 peak feed views per second, and an estimated 748.25 TB of additional photo and thumbnail storage per year.



A CDN, load balancer, multiple application servers, Redis cache, primary database, read replica, object storage, message queue, and background worker address the application's performance, scalability, and reliability requirements.



The design prioritizes efficient feed delivery while separating photo storage and background processing from the main application request flow.



