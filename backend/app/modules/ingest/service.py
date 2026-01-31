"""AI Vision Service using OpenRouter API."""
import base64
import json
import re
from typing import Tuple
import httpx

# Constants
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-2.5-flash"  # Verified OpenRouter ID

# Math Safety keywords
MATH_KEYWORDS = [
    "équation", "equation", "calcul", "calculate", "résoudre", "solve",
    "formule", "formula", "mathématique", "mathematics", "algèbre", "algebra",
    "géométrie", "geometry", "dérivée", "derivative", "intégrale", "integral",
    "∫", "∑", "∏", "√", "π", "θ", "∆", "∂"
]

SYSTEM_PROMPT = """You are an educational content analyzer for French students. 
Analyze the provided image of a lesson/course material and extract:

1. **title**: A concise title for this lesson (max 10 words)
2. **subject**: The academic subject (e.g., "Histoire", "Sciences", "Français", "Mathématiques")
3. **raw_text**: The complete text extracted from the image, preserving structure
4. **synthesis**: A clear, student-friendly summary of the key concepts (3-5 bullet points)

⚠️ MATH SAFETY RULE: If this content contains math problems, equations, or exercises:
- Extract the text/equations as-is in raw_text
- In synthesis, only EXPLAIN the concepts, DO NOT solve any problems
- Set is_math_content to true

Respond in JSON format with this exact structure:
{
  "title": "string",
  "subject": "string",
  "raw_text": "string",
  "synthesis": "string",
  "study_tips": ["string", "string", "string"],
  "is_math_content": boolean
}

Always respond in French."""



async def _analyze_batch(batch_images: list[str], api_key: str) -> dict:
    """Helper to analyze a batch of images."""
    content_payload = [
        {
            "type": "text",
            "text": "Analyze these lesson documents and extract the structured content."
        }
    ]

    for img_b64 in batch_images:
        # Clean base64 if it has data URL prefix
        if "base64," in img_b64:
            img_b64 = img_b64.split("base64,")[1]
        
        content_payload.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{img_b64}"
            }
        })
    
    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": content_payload
            }
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 8192
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
            error_detail = response.text
            raise Exception(f"OpenRouter API error ({response.status_code}): {error_detail}")
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        try:
            analysis = json.loads(content)
            return analysis
        except json.JSONDecodeError:
            json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            else:
                print(f"FAILED CONTENT PREVIEW: {content[:500]}...")
                raise Exception("Failed to parse AI response as JSON")

async def analyze_documents(images_base64: list[str], api_key: str) -> Tuple[dict, bool]:
    """
    Analyze multiple images using OpenRouter Vision API with batching.
    """
    BATCH_SIZE = 5
    batches = [images_base64[i:i + BATCH_SIZE] for i in range(0, len(images_base64), BATCH_SIZE)]
    
    full_analysis = {
        "title": "Sans titre",
        "subject": "Général",
        "raw_text": "",
        "synthesis": "",
        "is_math_content": False,
        "usage": {}
    }
    
    print(f"Processing {len(images_base64)} images in {len(batches)} batches...")
    
    for index, batch in enumerate(batches):
        print(f"Analyzing batch {index + 1}/{len(batches)}...")
        try:
            batch_result = await _analyze_batch(batch, api_key)
            
            # For the first batch, take title and subject
            if index == 0:
                full_analysis["title"] = batch_result.get("title", "Sans titre")
                full_analysis["subject"] = batch_result.get("subject", "Général")
            
            # Accumulate text and synthesis
            chunk_text = batch_result.get("raw_text", "")
            chunk_synthesis = batch_result.get("synthesis", "")
            
            full_analysis["raw_text"] += f"\n\n--- Partie {index + 1} ---\n" + chunk_text
            full_analysis["synthesis"] += f"\n" + chunk_synthesis
            
            # Check for math (if any batch has math, whole doc is math)
            if batch_result.get("is_math_content", False) or \
               any(k in chunk_text.lower() for k in MATH_KEYWORDS):
                full_analysis["is_math_content"] = True
                
        except Exception as e:
            print(f"Error processing batch {index + 1}: {str(e)}")
            # Continue with what we have, or could fail? 
            # Ideally fail to warn user, but for now lets re-raise to be safe
            raise e

    return full_analysis, full_analysis["is_math_content"]
