# Library REST API - Books Resource

## Base URL

`https://api.citylibrary.org/v1`

All requests and responses use JSON where a request or response body is required.

## Endpoints

### 1. List All Books

- **Method:** `GET`
- **Path:** `/books`
- **Description:** Returns a list of all books in the library.
- **Example request body:** None.
- **Success status:** `200 OK`

### 2. Get One Book

- **Method:** `GET`
- **Path:** `/books/{id}`
- **Description:** Returns the details of a specific book using its ID.
- **Example request:** `GET /books/15`
- **Example request body:** None.
- **Success status:** `200 OK`

### 3. Create a Book

- **Method:** `POST`
- **Path:** `/books`
- **Description:** Creates a new book in the library.
- **Example request body:**

  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958,
    "copies": 3
  }
  ```

- **Success status:** `201 Created`
- **Response:** Returns the newly created book, including its ID.

### 4. Update a Book

- **Method:** `PATCH`
- **Path:** `/books/{id}`
- **Description:** Updates specific fields of an existing book.
- **Example request:** `PATCH /books/15`
- **Example request body:**

  ```json
  {
    "copies": 5
  }
  ```

- **Success status:** `200 OK`

### 5. Delete a Book

- **Method:** `DELETE`
- **Path:** `/books/{id}`
- **Description:** Deletes a book from the library using its ID.
- **Example request:** `DELETE /books/15`
- **Example request body:** None.
- **Success status:** `204 No Content`

### 6. List Books by Author

- **Method:** `GET`
- **Path:** `/books?author=Chinua%20Achebe`
- **Description:** Returns books written by the specified author.
- **Example request:** `GET /books?author=Chinua%20Achebe`
- **Example request body:** None.
- **Success status:** `200 OK`

## Error Responses

### 400 Bad Request

The request contains invalid data or is missing required information.

**Example:** Creating a book without a required title or providing the year as text instead of a number.

### 404 Not Found

The requested resource does not exist.

**Example:** Requesting `GET /books/99999` when no book has that ID.
