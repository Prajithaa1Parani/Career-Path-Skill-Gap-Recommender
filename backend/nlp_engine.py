import csv
import numpy as np
import spacy
import faiss
from pathlib import Path
from spacy.matcher import PhraseMatcher
from fastembed import TextEmbedding
from fastembed.common.model_description import ModelSource, PoolingType

# BLOCK 1: Load dataset and NLP model
# jobs is a list of rows like {"job_role": ..., "required_skills": ...}
with open(Path(__file__).with_name("jobs.csv"), encoding="utf-8") as file:
    jobs = list(csv.DictReader(file))

nlp = spacy.load("en_core_web_sm")

# BLOCK 2: Create skill vocabulary
skill_list = set()

for job in jobs:
    skill_list.update(job["required_skills"].split(", "))

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
# Uses the compressed (quantized) all-MiniLM-L6-v2 model:
# 23 MB instead of 90 MB, so it fits on the free Vercel server
TextEmbedding.add_custom_model(
    model="all-MiniLM-L6-v2-quantized",
    sources=ModelSource(hf="Xenova/all-MiniLM-L6-v2"),
    model_file="onnx/model_quantized.onnx",
    pooling=PoolingType.MEAN,
    normalization=True,
    dim=384
)

model = TextEmbedding("all-MiniLM-L6-v2-quantized")

def embed(texts):
    # Returns one normalized 384-dimension vector per text
    return np.array(list(model.embed(texts)))

job_embeddings = embed([job["required_skills"] for job in jobs])

# BLOCK 7: FAISS similarity search
index = faiss.IndexFlatIP(job_embeddings.shape[1])
index.add(job_embeddings)

def recommend_roles(user_skills):
    if not user_skills:
        return []

    embedding = embed([", ".join(user_skills)])

    _, indices = index.search(embedding, min(3, len(jobs)))

    return [jobs[i]["job_role"] for i in indices[0]]

# BLOCK 8: Skill gap analysis
def analyze_skill_gap(user_skills, role):
    required = next(
        job["required_skills"]
        for job in jobs
        if job["job_role"] == role
    )

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