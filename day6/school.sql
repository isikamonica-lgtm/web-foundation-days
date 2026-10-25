-- ==========================================
-- DAY 6 ASSIGNMENT: SCHOOL DATABASE
-- ==========================================

-- STEP 1: CREATE TABLES

CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL,
    
    course_code TEXT NOT NULL UNIQUE
);
   CREATE TABLE ELEMENTS(
   id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,

    grade TEXT CHECK (
        grade IS NULL OR grade IN ('A', 'B', 'C', 'D', 'E')
    ),

    FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,

    FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE CASCADE,

    UNIQUE (student_id, course_id)
);
);
-- Index to speed up searches by course
CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);


-- STEP 2: INSERT SAMPLE STUDENTS

INSERT INTO students (id, name, email)
VALUES
    (1, 'Amina Hassan', 'amina@example.com'),
    (2, 'Brian Otieno', 'brian@example.com'),
    (3, 'Cynthia Wanjiku', 'cynthia@example.com'),
    (4, 'David Kiptoo', 'david@example.com');


-- STEP 3: INSERT SAMPLE COURSES

INSERT INTO courses (id, course_name, course_code)
VALUES
    (1, 'Web Development', 'WD101'),
    (2, 'Database Systems', 'DB101'),
    (3, 'Cloud Computing', 'CC101');


-- STEP 4: INSERT SAMPLE ENROLMENTS

INSERT INTO enrolments (id, student_id, course_id, grade)
VALUES
    (1, 1, 1, 'A'),
    (2, 1, 2, 'B'),
    (3, 2, 1, 'B'),
    (4, 2, 3, 'A'),
    (5, 3, 2, 'A');


-- ==========================================
-- STEP 5: REQUIRED QUERIES
-- ==========================================


-- QUERY 1:
-- Find all courses taken by one student.
-- Example: Amina Hassan.

SELECT
    students.name AS student_name,
    courses.course_name,
    courses.course_code,
    enrolments.grade
FROM students
JOIN enrolments
    ON students.id = enrolments.student_id
JOIN courses
    ON courses.id = enrolments.course_id
WHERE students.name = 'Amina Hassan';


-- QUERY 2:
-- Find all students enrolled in one course.
-- Example: Web Development.

SELECT
    students.name AS student_name,
    students.email,
    courses.course_name
FROM students
JOIN enrolments
    ON students.id = enrolments.student_id
JOIN courses
    ON courses.id = enrolments.course_id
WHERE courses.course_name = 'Web Development';


-- QUERY 3:
-- Count the number of students enrolled in each course.

SELECT
    courses.course_name,
    COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments
    ON courses.id = enrolments.course_id
GROUP BY courses.id, courses.course_name;


-- QUERY 4:
-- Find students who have no enrolments.

SELECT
    students.id,
    students.name,
    students.email
FROM students
LEFT JOIN enrolments
    ON students.id = enrolments.student_id
WHERE enrolments.student_id IS NULL;


-- QUERY 5:
-- Update one student's grade for one course.
-- Change Amina's Database Systems grade from B to A.

UPDATE enrolments
SET grade = 'A'
WHERE student_id = 1
  AND course_id = 2;


-- Verify the grade update.

SELECT
    students.name AS student_name,
    courses.course_name,
    enrolments.grade
FROM enrolments
JOIN students
    ON students.id = enrolments.student_id
JOIN courses
    ON courses.id = enrolments.course_id
WHERE students.id = 1
  AND courses.id = 2;