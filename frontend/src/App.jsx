import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = "http://localhost:5000/api";
const DEMO_STUDENT = "Demo Student";

function App() {
  const [courses, setCourses] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState("courses");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingCourse, setSavingCourse] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [courseResponse, enrolmentResponse] =
          await Promise.all([
            fetch(`${API_URL}/courses`),
            fetch(
              `${API_URL}/enrollments?studentName=${encodeURIComponent(
                DEMO_STUDENT
              )}`
            ),
          ]);

        if (!courseResponse.ok || !enrolmentResponse.ok) {
          throw new Error("The server could not load the required data.");
        }

        const courseData = await courseResponse.json();
        const enrolmentData = await enrolmentResponse.json();

        if (!cancelled) {
          setCourses(courseData);
          setEnrolled(
            enrolmentData.map((item) => Number(item.courseId))
          );
          setLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            `Could not connect to the backend. Make sure the server is running. ${error.message}`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || course.category === category;

    const matchesPage =
      page === "courses" || enrolled.includes(Number(course.id));

    return matchesSearch && matchesCategory && matchesPage;
  });
const categoryCounts = courses.reduce((counts, course) => {
  const categoryName = course.category || "Other";
  counts[categoryName] = (counts[categoryName] || 0) + 1;
  return counts;
}, {});

const chartData = {
  labels: Object.keys(categoryCounts),
  datasets: [
    {
      label: "Available courses",
      data: Object.values(categoryCounts),
      backgroundColor: ["#5145df", "#62b6cb", "#f3b562"],
      borderRadius: 8,
    },
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
    },
  },
};
  async function enrol(course) {
    if (enrolled.includes(Number(course.id))) {
      setMessage(`You are already enrolled in ${course.title}.`);
      return;
    }

    setSavingCourse(course.id);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/enrollments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: DEMO_STUDENT,
          courseId: Number(course.id),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Enrolment failed.");
      }

      setEnrolled((previous) => [
        ...previous,
        Number(course.id),
      ]);
      setMessage(result.message || "Enrolment saved successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSavingCourse(null);
    }
  }

  return (
    <div className="app">
      <header className="navbar">
        <a
          className="brand"
          href="#home"
          onClick={() => setPage("courses")}
        >
          <span className="brand-icon">E</span>
          <span>EduLearn</span>
        </a>

        <nav>
          <button
            className={page === "courses" ? "nav-link active" : "nav-link"}
            onClick={() => {
              setPage("courses");
              setMessage("");
            }}
          >
            Courses
          </button>

          <button
            className={page === "learning" ? "nav-link active" : "nav-link"}
            onClick={() => {
              setPage("learning");
              setMessage("");
            }}
          >
            My Learning
          </button>
        </nav>

        <span className="student-badge">Demo Student</span>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">LEARN • GROW • SUCCEED</span>
            <h1>
              Build skills for
              <br />
              your future.
            </h1>
            <p>
              Explore practical courses, develop new skills and take the
              next step in your learning journey.
            </p>
            <button
              className="primary-button"
              onClick={() =>
                document
                  .getElementById("course-catalogue")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore courses →
            </button>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="art-circle">🎓</div>
            <div className="art-note">Your future starts here</div>
          </div>
        </section>

        <section className="stats">
          <div>
            <strong>{courses.length}</strong>
            <span>Available courses</span>
          </div>
          <div>
            <strong>{enrolled.length}</strong>
            <span>My enrolments</span>
          </div>
          <div>
            <strong>Flexible</strong>
            <span>Learn at your pace</span>
          </div>
        </section>

{page === "learning" && (
  <section className="dashboard-chart">
    <div className="section-heading">
      <span className="eyebrow">COURSE INSIGHTS</span>
      <h2>Course Catalogue Overview</h2>
      <p>Available courses grouped by category.</p>
    </div>

    <div className="chart-container">
      {courses.length > 0 ? (
        <Bar data={chartData} options={chartOptions} />
      ) : (
        <p>No course data available.</p>
      )}
    </div>
  </section>
)}
        <section className="catalogue" id="course-catalogue">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR LEARNING JOURNEY</span>
              <h2>
                {page === "courses"
                  ? "Explore our courses"
                  : "My Learning"}
              </h2>
              <p>
                {page === "courses"
                  ? "Find a course that matches your interests."
                  : "Courses you have enrolled in appear here."}
              </p>
            </div>
          </div>

          <div className="filters">
            <input
              type="search"
              placeholder="Search courses..."
              aria-label="Search courses"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              aria-label="Filter by category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="All">All categories</option>
              <option value="IT">Information Technology</option>
              <option value="Business">Business</option>
            </select>
          </div>

          {message && (
            <div className="notice" role="status">
              <span>{message}</span>
              <button
                onClick={() => setMessage("")}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}

          {loadError ? (
            <div className="notice" role="alert">
              {loadError}
            </div>
          ) : loading ? (
            <div className="empty-state">
              <h3>Loading courses...</h3>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="empty-state">
              <span>📚</span>
              <h3>No courses found</h3>
              <p>
                Try another search or select a different category.
              </p>
            </div>
          ) : (
            <div className="course-grid">
              {filteredCourses.map((course) => (
                <article className="course-card" key={course.id}>
                  <div className="course-art">
                    {Number(course.id) === 1
                      ? "💻"
                      : Number(course.id) === 2
                      ? "🗄️"
                      : Number(course.id) === 3
                      ? "🔐"
                      : Number(course.id) === 4
                      ? "🗣️"
                      : Number(course.id) === 5
                      ? "📈"
                      : "📋"}
                  </div>

                  <div className="course-content">
                    <span className="category-tag">
                      {course.category}
                    </span>

                    <h3>{course.title}</h3>
                    <p>{course.description}</p>

                    <div className="course-meta">
                      <span>◷ {course.duration}</span>
                      <span>{course.level}</span>
                    </div>

                    <button
                      className={
                        enrolled.includes(Number(course.id))
                          ? "enrol-button enrolled"
                          : "enrol-button"
                      }
                      disabled={savingCourse === course.id}
                      onClick={() => enrol(course)}
                    >
                      {savingCourse === course.id
                        ? "Enrolling..."
                        : enrolled.includes(Number(course.id))
                        ? "Enrolled ✓"
                        : "Enrol now →"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer>
        <strong>EduLearn</strong>
        <span>Practical learning for a brighter future.</span>
      </footer>
    </div>
  );
}

export default App;