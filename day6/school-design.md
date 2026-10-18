# Day 6 Assignment: School Database Design

## 1. Table Descriptions

### Students Table

The students table stores information about each student. It contains an ID, name, and email address. The ID is the primary key, which uniquely identifies each student. The name and email columns are NOT NULL, so they cannot be empty. The email column also has a UNIQUE constraint to prevent two students from registering with the same email address.

### Courses Table

The courses table stores information about the courses offered by the school. It contains an ID, course name, and course code. The ID is the primary key, and the course name and course code are required. The course code is UNIQUE to prevent duplicate course codes.

### Enrolments Table

The enrolments table records which students are enrolled in which courses and stores their grades. It contains an ID, student ID, course ID, and grade. The student ID and course ID are foreign keys referencing the students and courses tables. The UNIQUE constraint on the combination of student ID and course ID prevents the same student from enrolling in the same course twice.

## 2. Relationships Between Tables

The relationship between students and enrolments is one-to-many because one student can have multiple enrolment records, while each enrolment belongs to one student.

The relationship between courses and enrolments is also one-to-many because one course can have multiple enrolment records, while each enrolment refers to one course.

Students and courses have a many-to-many relationship because one student can take several courses, and one course can have several students.

The enrolments table acts as a join table between students and courses. It is needed to represent the many-to-many relationship and to store additional information about each enrolment, such as the student's grade.

## 3. Index

I would add an index on the course ID in the enrolments table:

CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);

This index would help the database find enrolments for a particular course more quickly. It would also improve queries that count students per course or list students enrolled in a course. The trade-off is that the index requires additional storage and may slightly slow down inserts and updates.

## 4. SQL or NoSQL?

I would choose a relational SQL database such as SQLite for this school system. The data has clear relationships between students, courses, and enrolments. SQL supports primary keys, foreign keys, UNIQUE constraints, joins, and transactions, which help maintain data consistency and prevent invalid enrolments. The grade can be stored alongside each enrolment, making it easy to retrieve and update. A NoSQL database could be useful for more flexible or document-oriented data, but a relational SQL database is a better fit for this structured school system.
