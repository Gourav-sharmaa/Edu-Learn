const express = require("express");
const cors = require("cors");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;
const DB_PATH = path.join(__dirname, "edulearn.sqlite");

app.use(cors());
app.use(express.json());

async function startServer() {
  const SQL = await initSqlJs();

  const db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      level TEXT NOT NULL,
      duration TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name TEXT NOT NULL,
      course_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );
  `);

  function saveDatabase() {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  }

  function getRows(sql, params = []) {
    const statement = db.prepare(sql);
    statement.bind(params);

    const rows = [];
    while (statement.step()) {
      rows.push(statement.getAsObject());
    }

    statement.free();
    return rows;
  }

  const initialCourses = [
    {
      id: 1,
      title: "Web Development Basics",
      category: "IT",
      level: "Beginner",
      duration: "6 weeks",
      description: "Learn HTML, CSS and JavaScript."
    },
    {
      id: 2,
      title: "Database Fundamentals",
      category: "IT",
      level: "Beginner",
      duration: "4 weeks",
      description: "Understand databases, tables and SQL."
    },
    {
      id: 3,
      title: "Cybersecurity Essentials",
      category: "IT",
      level: "Intermediate",
      duration: "5 weeks",
      description: "Learn online safety and security."
    },
    {
      id: 4,
      title: "Business Communication",
      category: "Business",
      level: "Beginner",
      duration: "3 weeks",
      description: "Improve workplace communication."
    },
    {
      id: 5,
      title: "Digital Marketing Basics",
      category: "Business",
      level: "Beginner",
      duration: "4 weeks",
      description: "Learn digital marketing fundamentals."
    },
    {
      id: 6,
      title: "Project Management",
      category: "Business",
      level: "Intermediate",
      duration: "6 weeks",
      description: "Learn project planning and teamwork."
    }
  ];

  const existingCourses = getRows(
    "SELECT COUNT(*) AS total FROM courses"
  )[0].total;

  if (existingCourses === 0) {
    for (const course of initialCourses) {
      db.run(
        `INSERT INTO courses
        (id, title, category, level, duration, description)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          course.id,
          course.title,
          course.category,
          course.level,
          course.duration,
          course.description
        ]
      );
    }
    saveDatabase();
  }

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      message: "EduLearn API is running"
    });
  });

  app.get("/api/courses", (req, res) => {
    res.json(getRows("SELECT * FROM courses ORDER BY id"));
  });

  app.get("/api/enrollments", (req, res) => {
    const studentName = String(req.query.studentName || "").trim();

    const enrollments = studentName
      ? getRows(
          `SELECT e.id, e.student_name AS studentName,
          e.course_id AS courseId, e.created_at AS enrolledAt,
          c.title AS courseTitle
          FROM enrollments e
          JOIN courses c ON c.id = e.course_id
          WHERE e.student_name = ?`,
          [studentName]
        )
      : getRows(
          `SELECT e.id, e.student_name AS studentName,
          e.course_id AS courseId, e.created_at AS enrolledAt,
          c.title AS courseTitle
          FROM enrollments e
          JOIN courses c ON c.id = e.course_id`
        );

    res.json(enrollments);
  });

  app.post("/api/enrollments", (req, res) => {
    const studentName = String(req.body?.studentName || "").trim();
    const courseId = Number(req.body?.courseId);

    if (!studentName || !Number.isInteger(courseId)) {
      return res.status(400).json({
        error: "Student name and a valid course ID are required."
      });
    }

    const course = getRows(
      "SELECT id FROM courses WHERE id = ?",
      [courseId]
    )[0];

    if (!course) {
      return res.status(404).json({
        error: "Course not found."
      });
    }

    db.run(
      "INSERT INTO enrollments (student_name, course_id) VALUES (?, ?)",
      [studentName, courseId]
    );

    const enrollment = getRows(
      `SELECT e.id, e.student_name AS studentName,
      e.course_id AS courseId, e.created_at AS enrolledAt,
      c.title AS courseTitle
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.id = last_insert_rowid()`
    )[0];

    saveDatabase();

    res.status(201).json({
      message: "Enrolment saved successfully.",
      enrollment
    });
  });

  saveDatabase();

  app.listen(PORT, () => {
    console.log(`EduLearn backend running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Could not start EduLearn backend:", error);
  process.exit(1);
});