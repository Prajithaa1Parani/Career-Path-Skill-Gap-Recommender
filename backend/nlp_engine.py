import pandas as pd
import spacy
import faiss
from pathlib import Path
from spacy.matcher import PhraseMatcher
from sentence_transformers import SentenceTransformer

# BLOCK 1: Load dataset and NLP model
jobs = pd.read_csv(Path(__file__).with_name("jobs.csv"))
nlp = spacy.load("en_core_web_sm")

# BLOCK 2: Create skill vocabulary
skill_list = set()

for text in jobs["required_skills"]:
    skill_list.update(text.split(", "))

# BLOCK 3: Phrase Matching
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
matcher.add("SKILLS", [
    nlp.make_doc(skill) for skill in sorted(skill_list)
])

# BLOCK 4: Named Entity Recognition
ruler = nlp.add_pipe(
    "entity_ruler",
    before="ner",
    config={"phrase_matcher_attr": "LOWER"}
)

ruler.add_patterns([
    {"label": "SKILL", "pattern": skill}
    for skill in sorted(skill_list)
])

# BLOCK 5: Extract skills
def extract_skills(text):
    doc = nlp(text)

    phrase_skills = {
        doc[start:end].text.lower()
        for _, start, end in matcher(doc)
    }

    entity_skills = {
        ent.text.lower()
        for ent in doc.ents
        if ent.label_ == "SKILL"
    }

    return sorted(phrase_skills | entity_skills)

# BLOCK 6: Sentence embeddings
model = SentenceTransformer(
    "all-MiniLM-L6-v2",
    device="cpu"
)

job_embeddings = model.encode(
    jobs["required_skills"].tolist(),
    normalize_embeddings=True
)

# BLOCK 7: FAISS similarity search
index = faiss.IndexFlatIP(job_embeddings.shape[1])
index.add(job_embeddings)

def recommend_roles(user_skills):
    if not user_skills:
        return []

    embedding = model.encode(
        [", ".join(user_skills)],
        normalize_embeddings=True
    )

    _, indices = index.search(embedding, min(3, len(jobs)))

    return jobs.iloc[indices[0]]["job_role"].tolist()

# BLOCK 8: Skill gap analysis
def analyze_skill_gap(user_skills, role):
    required = jobs.loc[
        jobs["job_role"] == role, "required_skills"
    ].iloc[0]

    required_skills = set(required.split(", "))
    current_skills = set(user_skills)

    matching = required_skills & current_skills
    missing = required_skills - current_skills

    return {
        "matching_skills": sorted(matching),
        "missing_skills": sorted(missing),
        "match_percentage": round(
            len(matching) / len(required_skills) * 100, 2
        )
    }

# BLOCK 9: Complete NLP pipeline
def analyze_profile(text):
    user_skills = extract_skills(text)

    recommendations = [
        {
            "role": role,
            **analyze_skill_gap(user_skills, role)
        }
        for role in recommend_roles(user_skills)
    ]

    # Show the role with the highest skill coverage first
    recommendations.sort(
        key=lambda job: job["match_percentage"],
        reverse=True
    )

    return {
        "extracted_skills": user_skills,
        "recommendations": recommendations
    }

# Test only when this file is executed directly
if __name__ == "__main__":
    print("CareerLens NLP engine ready!")
    print(analyze_profile("Python, SQL, Data Analysis"))