Library Books REST API

Overview

The Library Books API allows clients to list, retrieve, create,
update, and delete books in a library system.

The API uses REST-style endpoints and JSON for data exchange.

Base URL: `https://api.library.example.com`

1. List All Books

- **Method:** GET
- **Path:** `/books`
- **Description:** Returns a list of books available in the library.
- **Example request body:** None.
- **Success status:** `200 OK`

2. Get One Book

- **Method:** GET
- **Path:** `/books/{id}`
- **Description:** Returns the details of a specific book using its ID.
- **Example request body:** None.
- **Success status:** `200 OK`

Example request:

`GET /books/42`

3. Create a Book

- **Method:** POST
- **Path:** `/books`
- **Description:** Creates a new book in the library catalogue.
- **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958
}
```
