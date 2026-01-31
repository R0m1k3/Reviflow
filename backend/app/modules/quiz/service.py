"""Quiz/Flashcard generation service."""
import json
import httpx
from typing import Dict, Any, List
from app.modules.ingest.service import OPENROUTER_API_URL, DEFAULT_MODEL

SYSTEM_PROMPT = """You are an expert French teacher. 
Create a multiple-choice quiz (QCM) based on the provided lesson text.

Guidelines:
1.  **Language**: French.
2.  **Topic**: Extract the main topic/subject of the text.
3.  **Target Audience**: Students.
4.  **Format**: {num_questions} questions.
5.  **Difficulty**: {difficulty}

Output strictly valid JSON with this structure. Do NOT include markdown formatting (like ```json), introduction, or conclusion. Just the raw JSON object.
{{
  "topic": "string",
  "questions": [
    {{
      "id": 1,
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0, // Index 0-3
      "explanation": "Brief explanation."
    }}
  ]
}}
"""

async def generate_quiz(text_content: str, api_key: str, difficulty: str = "medium", series_index: int = 1) -> Dict[str, Any]:
    """Generates a quiz from text content using LLM."""
    
    # Determine number of questions based on text length
    # Smart Quiz Sizing based on "Information Density"
    # Heuristic: ~400 characters (approx 60-80 words) usually contain 1 indexable fact.
    length = len(text_content)
    
    # 1. Estimate maximal unique questions possible
    density_factor = 400
    max_unique_questions = max(3, int(length / density_factor))
    
    # 2. Determine session size (Cap at 15 to prevent cognitive overload)
    target_questions = min(max_unique_questions, 15)
    
    # 3. Adjust for very short texts to avoid hallucinations/redundancy
    if length < 600:
        target_questions = 3
    elif length < 1200:
        target_questions = 5
        
    num_questions = target_questions
    
    # Calculate potential series (Party Mode "Revision Series" concept)
    # This is just internal logic for now, could be returned in metadata later
    total_series = (int(length / 300) // 15) + 1
    
    print(f"Smart Sizing: Length={length} chars -> {num_questions} questions (Series estimate: {total_series})")
    
    # Series Context Hint
    series_hint = ""
    if total_series > 1:
        series_hint = f"\n\nCONTEXT: This text is long and is split into {total_series} parts. This is Part {series_index}. Please focus your questions on the section of the text corresponding roughly to part {series_index}/{total_series}."

    prompt = SYSTEM_PROMPT.format(difficulty=difficulty, num_questions=num_questions) + series_hint
    
    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Here is the lesson text:\n\n{text_content}"}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 4000
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://reviflow.app",
        "X-Title": "Reviflow"
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            OPENROUTER_API_URL,
            json=payload,
            headers=headers,
            timeout=60.0
        )

        if response.status_code != 200:
            raise Exception(f"OpenRouter API error ({response.status_code}): {response.text}")

        result = response.json()
        content = result["choices"][0]["message"]["content"]
        usage = result.get("usage", {})
        
        try:
            return {
                "quiz": json.loads(content),
                "usage": usage,
                "meta": {"total_series": total_series}
            }
        except json.JSONDecodeError:
            print(f"JSON Parse Error - Raw Content: {content}")
            # Robust Fallback strategy
            import re
            cleaned = content
            
            # 1. Try finding a markdown code block
            json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
            if json_match:
                 cleaned = json_match.group(1)
            else:
                 # 2. Try finding the outermost JSON object
                 # Find first '{'
                 start = content.find('{')
                 # Find last '}'
                 end = content.rfind('}')
                 
                 if start != -1 and end != -1:
                     cleaned = content[start:end+1]

            try:
                return {
                    "quiz": json.loads(cleaned),
                    "usage": usage,
                    "meta": {"total_series": total_series}
                }
            except json.JSONDecodeError as e:
                print(f"Deep Parse Failed: {e}")
                raise Exception("Failed to parse AI response as JSON. Content might be truncated or invalid.")

async def generate_remediation_quiz_service(context_items: List[Dict[str, Any]], api_key: str, source_text: str = None) -> Dict[str, Any]:
    """Generates a remediation quiz based on errors."""
    
    # Extract topics from context or questions to guide the LLM
    # This prevents it from thinking the topic is "Remediation"
    topics_context = list(set([item['context'] or "General" for item in context_items if item['context']]))
    joined_topics = ", ".join(topics_context)

    errors_desc = "\n".join([
        f"- Failed Question: {item['question']}\n  Student's Wrong Answer: {item['wrong_answer']}\n  Correct Answer: {item['correct_answer']}\n  Subject Context: {item['context']}"
        for item in context_items
    ])
    
    context_injection = ""
    if source_text:
        # Truncate source text if too long to save tokens, but keep enough for context
        # 1000 chars is usually enough for key concepts
        truncated_text = source_text[:3000] 
        context_injection = f"\n\nREFERENCE LESSON TEXT:\n{truncated_text}\n\n"

    REMEDIATION_SYSTEM_PROMPT = f"""You are an expert tutor in the following subject(s): {joined_topics}.
    Your Goal: Create a remedial quiz to help a student understand concepts they failed previously.
    
    Input: A list of specific questions the student got wrong, including their wrong answer and the correct answer.
    
    Task:
    1. Read the provided REFERENCE LESSON TEXT (if available) to understand the exact curriculum and context.
    2. Identify the underlying concept for EACH failed question.
    3. Generate a NEW multiple-choice question to test that SAME concept, but phrased differently or using a different example.
    4. You MUST generate exactly one new question for every failed question provided in the input list. If there are 10 errors, generate 10 new questions.
    5. The "topic" field in the JSON should be: "{joined_topics} (Remediation)".
    6. **CRITICAL**: The questions must be about the SUBJECT MATTER ({joined_topics}). Do NOT generate questions about "remediation", "learning strategies", or "translation".
    7. **Language**: output MUST be in French.
    8. Provide a clear, helpful "explanation" for the correct answer.

    Output strictly valid JSON with this EXACT structure:
    {{
      "topic": "string",
      "questions": [
        {{
          "id": 1,
          "question": "New question text...",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_answer": 0,
          "explanation": "Clear explanation of why this answer is right."
        }}
      ]
    }}
    """

    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": REMEDIATION_SYSTEM_PROMPT},
            {"role": "user", "content": f"{context_injection}The student made the following mistakes (Generate exactly {len(context_items)} questions):\n{errors_desc}"}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 8000
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://reviflow.app",
        "X-Title": "Reviflow"
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            OPENROUTER_API_URL,
            json=payload,
            headers=headers,
            timeout=120.0
        )

        if response.status_code != 200:
            raise Exception(f"OpenRouter API error ({response.status_code}): {response.text}")

        result = response.json()
        content = result["choices"][0]["message"]["content"]
        usage = result.get("usage", {})
        
        # --- Robust JSON Parsing Strategy ---
        def try_parse_json(text):
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return None
        
        # 1. Direct parse
        parsed = try_parse_json(content)
        
        # 2. Markdown block extraction
        if not parsed:
            import re
            json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
            if json_match:
                parsed = try_parse_json(json_match.group(1))
        
        # 3. Brute-force substring extraction (find outer {})
        if not parsed:
            start = content.find('{')
            end = content.rfind('}')
            if start != -1 and end != -1:
                parsed = try_parse_json(content[start:end+1])
                
        # 4. Repair Truncated JSON (Simple Auto-Close)
        if not parsed:
            # Heuristic: If it looks like it ended abruptly, try adding closures
            # Try adding "]}" or "}]}" or just "}"
            candidates = [content + "}", content + "]}", content + "}]}", content + '"}]}', content + '"]}}' ]
            for candidate in candidates:
                # Need to strip potential markdown markers if we are patching the raw content
                clean_candidate = candidate
                start = clean_candidate.find('{')
                if start != -1:
                     clean_candidate = clean_candidate[start:]
                
                parsed = try_parse_json(clean_candidate)
                if parsed:
                    print("WARN: JSON was truncated but successfully repaired.")
                    break
        
        if parsed:
            return {
                "quiz": parsed,
                "usage": usage
            }
            
        print(f"FAILED JSON CONTENT (First 500 chars): {content[:500]}...")
        print(f"FAILED JSON CONTENT (Last 500 chars): {content[-500:]}...")
        raise Exception("Failed to parse AI response as JSON (Malformed or Truncated)")
