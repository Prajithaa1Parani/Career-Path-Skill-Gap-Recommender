import { useState } from 'react'
import './App.css'

// Backend address: uses VITE_API_URL when deployed, localhost otherwise
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

const GITHUB_URL = 'https://github.com/Prajithaa1Parani/Career-Path-Skill-Gap-Recommender'

// Sends skill text to the backend and returns the analysis
async function requestAnalysis(text) {
  const response = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Analysis failed')
  }

  return data
}

function App() {
  const [skills, setSkills] = useState('')
  const [result, setResult] = useState(null)     // analysis shown on screen
  const [baseline, setBaseline] = useState(null) // real analysis, before any what-if
  const [learned, setLearned] = useState([])     // skills added in the what-if simulator
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Shows a fresh analysis and clears the what-if simulator
  function showAnalysis(data) {
    setResult(data)
    setBaseline(data)
    setLearned([])
  }

  async function analyzeSkills() {
    if (!skills.trim()) {
      setError('Please enter your skills.')
      return
    }

    setLoading(true)
    setError('')

    try {
      showAnalysis(await requestAnalysis(skills))
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

    const formData = new FormData()
    formData.append('resume', file)

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Resume analysis failed')
      }

      showAnalysis(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  // WHAT-IF SIMULATOR
  // Runs the same analysis again with the user's real skills
  // plus the skills they pretend to have learned
  async function simulate(newLearned) {
    if (newLearned.length === 0) {
      setResult(baseline)
      setLearned([])
      return
    }

    setLoading(true)
    setError('')

    try {
      const allSkills = [...baseline.extracted_skills, ...newLearned]
      setResult(await requestAnalysis(allSkills.join(', ')))
      setLearned(newLearned)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Compares a role with the real analysis: "+7%", "New match" or nothing
  function coverageChange(job) {
    const before = baseline.recommendations.find((item) => item.role === job.role)

    if (!before) return 'New match'

    const difference = Math.round(job.match_percentage) - Math.round(before.match_percentage)

    return difference > 0 ? `+${difference}%` : ''
  }

  return (
    <div className="page" id="top">

      <nav className="navbar">
        <a className="brand" href="#top">
          <span className="brand-mark" />
          CareerLens
        </a>

        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </nav>

      <header className="hero">
        <span className="pill">NLP-powered career intelligence</span>
        <h1>Find the career your skills <em>already</em> point to.</h1>
        <p>
          Paste your skills or upload a resume. CareerLens reads it, matches you
          to the closest career paths and shows exactly what to learn next.
        </p>
      </header>

      <section className="composer">
        <textarea
          placeholder="Python, SQL, React, machine learning..."
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />

        <div className="composer-actions">
          <label className="upload-button">
            Upload resume (PDF)
            <input
              type="file"
              accept=".pdf"
              onChange={uploadResume}
              disabled={loading}
              hidden
            />
          </label>

          <button className="primary-button" onClick={analyzeSkills} disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze my profile'}
          </button>
        </div>
      </section>

      {error && <p className="error-message">{error}</p>}

      {result && (
        <section className="results">

          <div className="section-heading">
            <h2>Your skills</h2>
            <span>{result.extracted_skills.length} identified</span>
          </div>

          <div className="chips">
            {result.extracted_skills.map((skill) =>
              learned.includes(skill) ? (
                <button
                  className="chip learned"
                  key={skill}
                  title="Remove from the simulation"
                  onClick={() => simulate(learned.filter((item) => item !== skill))}
                  disabled={loading}
                >
                  {skill} ×
                </button>
              ) : (
                <span className="chip" key={skill}>{skill}</span>
              )
            )}
          </div>

          <div className="section-heading">
            <h2>Recommended career paths</h2>
          </div>

          <div className="simulator-bar">
            <span className="simulator-label">What-if simulator</span>

            {learned.length === 0 ? (
              <p>Click any skill under “Skills to learn” to see how your match would change.</p>
            ) : (
              <>
                <p>Showing your results as if you had learned: {learned.join(', ')}.</p>
                <button onClick={() => simulate([])} disabled={loading}>Reset</button>
              </>
            )}
          </div>

          {result.recommendations.length === 0 && (
            <p className="empty-message">
              No matching career paths found. Try entering more skills.
            </p>
          )}

          <div className={loading ? 'cards updating' : 'cards'}>
            {result.recommendations.map((job, index) => (
              <article className="career-card" key={job.role}>

                <div className="card-top">
                  <span className="rank">0{index + 1}</span>
                  {index === 0 && <span className="badge">Best match</span>}
                </div>

                <h3>{job.role}</h3>

                <div className="coverage">
                  <strong>{Math.round(job.match_percentage)}%</strong>
                  <span>skill coverage</span>
                  {coverageChange(job) && (
                    <span className="change">{coverageChange(job)}</span>
                  )}
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${job.match_percentage}%` }}
                  />
                </div>

                <h4>You already have</h4>

                <div className="chips">
                  {job.matching_skills.length === 0 && (
                    <span className="none-yet">None yet</span>
                  )}

                  {job.matching_skills.map((skill) => (
                    <span className="chip matched" key={skill}>{skill}</span>
                  ))}
                </div>

                <h4>Skills to learn</h4>

                <div className="chips">
                  {job.missing_skills.map((skill) => (
                    <button
                      className="chip missing"
                      key={skill}
                      title="What if I learn this?"
                      onClick={() => simulate([...learned, skill])}
                      disabled={loading}
                    >
                      + {skill}
                    </button>
                  ))}
                </div>

              </article>
            ))}
          </div>

        </section>
      )}

      <section className="steps" id="how">
        <div className="step">
          <span>01</span>
          <h3>Extract</h3>
          <p>spaCy reads your text and picks out every skill it recognises.</p>
        </div>

        <div className="step">
          <span>02</span>
          <h3>Match</h3>
          <p>MiniLM embeddings and FAISS find the career roles closest in meaning.</p>
        </div>

        <div className="step">
          <span>03</span>
          <h3>Close the gap</h3>
          <p>See what you already have, what is missing, and simulate learning it.</p>
        </div>
      </section>

      <footer>CareerLens · Career path and skill gap recommender</footer>

    </div>
  )
}

export default App
