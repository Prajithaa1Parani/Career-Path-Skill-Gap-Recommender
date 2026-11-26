import { useState } from 'react'
import './App.css'

// Backend address: uses VITE_API_URL when deployed, localhost otherwise
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

function App() {
  const [skills, setSkills] = useState('')
const [result, setResult] = useState(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')

async function analyzeSkills() {
  if (!skills.trim()) {
    setError('Please enter your skills.')
    return
  }

  setLoading(true)
  setError('')
  setResult(null)

  try {
    const response = await fetch(
      `${API_URL}/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: skills })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Analysis failed')
    }

    setResult(data)

  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
async function uploadResume(event) {
  const file = event.target.files[0]

  if (!file) return

  setLoading(true)
  setError('')
  setResult(null)

  const formData = new FormData()
  formData.append('resume', file)

  try {
    const response = await fetch(
      `${API_URL}/upload`,
      {
        method: 'POST',
        body: formData
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Resume analysis failed')
    }

    setResult(data)

  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
    event.target.value = ''
  }
}

  return (
    <div className="dashboard">

      <aside className="sidebar">
        <h2>CareerLens</h2>
        <p>Career Intelligence Platform</p>

        <nav>
          <a href="#dashboard">Dashboard</a>
          <a href="#resume">Resume Analysis</a>
          <a href="#skills">Skill Assessment</a>
        </nav>
      </aside>

      <main className="main-content" id="dashboard">

        <header>
          <span>YOUR CAREER WORKSPACE</span>
          <h1>Discover your career potential.</h1>
          <p>Analyze your skills and explore your future career.</p>
        </header>

        <section className="panel" id="resume">
          <h2>Upload your resume</h2>
          <p>Extract your skills automatically using NLP.</p>
<input
  type="file"
  accept=".pdf"
  onChange={uploadResume}
  disabled={loading}
/>

{loading && <p>Analyzing your profile...</p>}
        </section>

        <section className="panel" id="skills">
          <h2>Enter your skills</h2>
          <p>Tell us about your technical knowledge.</p>

          <textarea
  placeholder="Python, Java, SQL, React..."
  value={skills}
  onChange={(e) => setSkills(e.target.value)}
/>

<button onClick={analyzeSkills} disabled={loading}>
  {loading ? 'Analyzing your profile...' : 'Analyze my profile'}
</button>

{error && <p style={{ color: 'red' }}>{error}</p>}
</section>
{/* Career Analysis Results */}
{result && (
  <section className="panel" id="results">

    <h2>Career Analysis Results</h2>

    <p>Skills identified: {result.extracted_skills.length}</p>

    <div className="skill-tags">
      {result.extracted_skills.map((skill) => (
        <span className="skill-tag" key={skill}>
          {skill}
        </span>
      ))}
    </div>

    <h2>Recommended Career Paths</h2>

    {result.recommendations.length === 0 && (
      <p>No matching career paths found. Try entering more skills.</p>
    )}

    {result.recommendations.map((job) => (
      <div className="career-card" key={job.role}>

        <h3>{job.role}</h3>

        <p>Skill Coverage: {job.match_percentage}%</p>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${job.match_percentage}%` }}
          />
        </div>

        <h4>Matching Skills</h4>

        <div className="skill-tags">
          {job.matching_skills.map((skill) => (
            <span className="matched-skill" key={skill}>
              {skill}
            </span>
          ))}
        </div>

        <h4>Skills to Learn</h4>

        <div className="skill-tags">
          {job.missing_skills.map((skill) => (
            <span className="missing-skill" key={skill}>
              {skill}
            </span>
          ))}
        </div>

      </div>
    ))}

  </section>
)}
      </main>

    </div>
  )
}

export default App