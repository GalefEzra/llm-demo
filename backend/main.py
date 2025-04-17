from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Dict
import tiktoken
from collections import defaultdict
import numpy as np

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://llm-demo-henna.vercel.app",  # Production frontend
        "http://localhost:5173",              # Local development frontend
        "https://llm-demo-*",                # Any Vercel preview deployments
        "https://*.vercel.app",              # Any Vercel app
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Redirect root to docs"""
    return RedirectResponse(url="/docs")

class SentencesInput(BaseModel):
    sentences: List[str]

class TokenizedSentence(BaseModel):
    original: str
    tokens: List[str]
    token_ids: List[int]

class PredictionResult(BaseModel):
    context: str
    probabilities: Dict[str, float]
    completed_sentence: str

class CompletionResponse(BaseModel):
    tokenized_sentences: List[TokenizedSentence]
    one_word_predictions: List[PredictionResult]
    two_word_predictions: List[PredictionResult]
    three_word_predictions: List[PredictionResult]
    four_word_predictions: List[PredictionResult]

class ContextOption(BaseModel):
    context: str
    highlighted_words: List[str]
    non_highlighted_words: List[str]

class ContextPrediction(BaseModel):
    word: str
    probability: float

class ContextPredictionResponse(BaseModel):
    context_options: List[ContextOption]
    predictions: List[ContextPrediction]

def tokenize_text(text: str) -> tuple[List[str], List[int]]:
    """Tokenize text using tiktoken."""
    enc = tiktoken.get_encoding("cl100k_base")
    # Don't lowercase the text to preserve case sensitivity
    token_ids = enc.encode(text)
    tokens = [enc.decode([id]) for id in token_ids]
    return tokens, token_ids

def create_ngram_model(sentences: List[str], n: int = 1) -> Dict[tuple, Dict[str, int]]:
    """Create an n-gram model from the sentences."""
    print(f"\nCreating {n}-gram model from {len(sentences)} sentences")
    model = defaultdict(lambda: defaultdict(int))
    
    for sentence in sentences:
        words = sentence.strip().split()
        print(f"Processing sentence: {words}")
        
        if len(words) < n + 1:
            print(f"Skipping sentence - too short ({len(words)} < {n + 1})")
            continue
            
        for i in range(len(words) - n):
            context = tuple(words[i:i+n])
            next_word = words[i+n]
            model[context][next_word] += 1
            print(f"  Added: {context} -> {next_word}")
            
    print(f"Model contains {len(model)} unique contexts")
    return model

def get_next_word_probabilities(context: tuple, model: Dict[tuple, Dict[str, int]]) -> Dict[str, float]:
    """Get probability distribution for the next word given a context."""
    print(f"\nGetting probabilities for context: {context}")
    
    if context not in model:
        print(f"Context {context} not found in model")
        print("Available contexts:", list(model.keys())[:5])  # Print first 5 contexts for debugging
        return {}
        
    total = sum(model[context].values())
    probabilities = {word: count/total for word, count in model[context].items()}
    print(f"Found {len(probabilities)} possible next words")
    print("Top 5 predictions:", sorted(probabilities.items(), key=lambda x: x[1], reverse=True)[:5])
    
    return probabilities

def complete_sentence(context: List[str], model: Dict[tuple, Dict[str, int]], max_length: int = 10) -> str:
    """Complete a sentence using the n-gram model."""
    if not model:  # Handle empty model case
        return ' '.join(context)
        
    current_sentence = context.copy()
    # Get n from first key, or default to 1 if model is empty
    n = len(next(iter(model.keys()))) if model else 1
    
    while len(current_sentence) < max_length:
        if len(current_sentence) < n:
            break
            
        current_context = tuple(current_sentence[-(n):])
        probs = get_next_word_probabilities(current_context, model)
        
        if not probs:
            break
            
        next_word = max(probs.items(), key=lambda x: x[1])[0]
        current_sentence.append(next_word)
        
        # Stop if we hit a period
        if next_word.endswith('.'):
            break
            
    return ' '.join(current_sentence)

@app.post("/process", response_model=CompletionResponse)
async def process_sentences(input_data: SentencesInput):
    try:
        # Tokenize sentences
        tokenized_results = []
        processed_sentences = [s.strip() for s in input_data.sentences if s.strip()]
        
        for sentence in processed_sentences:
            tokens, token_ids = tokenize_text(sentence)
            tokenized_results.append(TokenizedSentence(
                original=sentence,
                tokens=tokens,
                token_ids=token_ids
            ))
        
        # Create n-gram models from all sentences
        one_gram_model = create_ngram_model(processed_sentences, n=1)
        two_gram_model = create_ngram_model(processed_sentences, n=2)
        three_gram_model = create_ngram_model(processed_sentences, n=3)
        four_gram_model = create_ngram_model(processed_sentences, n=4)
        
        # Generate predictions
        one_word_predictions = []
        two_word_predictions = []
        three_word_predictions = []
        four_word_predictions = []
        
        for sentence in processed_sentences:
            words = sentence.split()
            
            # 1-word predictions (for sentences with at least 1 word)
            if len(words) >= 1:
                context_1 = [words[0]]
                probs_1 = get_next_word_probabilities(tuple(context_1), one_gram_model)
                completed_1 = complete_sentence(context_1, one_gram_model)
                
                one_word_predictions.append(PredictionResult(
                    context=' '.join(context_1),
                    probabilities=probs_1,
                    completed_sentence=completed_1
                ))
            
            # 2-word predictions (for sentences with at least 2 words)
            if len(words) >= 2:
                context_2 = words[:2]
                probs_2 = get_next_word_probabilities(tuple(context_2), two_gram_model)
                completed_2 = complete_sentence(context_2, two_gram_model)
                
                two_word_predictions.append(PredictionResult(
                    context=' '.join(context_2),
                    probabilities=probs_2,
                    completed_sentence=completed_2
                ))

            # 3-word predictions (for sentences with at least 3 words)
            if len(words) >= 3:
                context_3 = words[:3]
                probs_3 = get_next_word_probabilities(tuple(context_3), three_gram_model)
                completed_3 = complete_sentence(context_3, three_gram_model)
                
                three_word_predictions.append(PredictionResult(
                    context=' '.join(context_3),
                    probabilities=probs_3,
                    completed_sentence=completed_3
                ))

            # 4-word predictions (for sentences with at least 4 words)
            if len(words) >= 4:
                context_4 = words[:4]
                probs_4 = get_next_word_probabilities(tuple(context_4), four_gram_model)
                completed_4 = complete_sentence(context_4, four_gram_model)
                
                four_word_predictions.append(PredictionResult(
                    context=' '.join(context_4),
                    probabilities=probs_4,
                    completed_sentence=completed_4
                ))
        
        return CompletionResponse(
            tokenized_sentences=tokenized_results,
            one_word_predictions=one_word_predictions,
            two_word_predictions=two_word_predictions,
            three_word_predictions=three_word_predictions,
            four_word_predictions=four_word_predictions
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_context_options/{n_words}", response_model=ContextPredictionResponse)
async def get_context_options(n_words: int, input_data: SentencesInput):
    try:
        processed_sentences = [s.strip() for s in input_data.sentences if s.strip()]
        print(f"\n=== Processing {n_words}-word contexts for sentences ===")
        print(f"Input sentences: {processed_sentences}")
        
        context_options_dict = {}
        predictions = []

        for sentence_idx, sentence in enumerate(processed_sentences):
            words = sentence.split()
            print(f"\nProcessing sentence {sentence_idx + 1}: '{sentence}'")
            print(f"Words: {words}")
            
            if len(words) < n_words:
                print(f"Skipping sentence - too short ({len(words)} < {n_words})")
                continue

            if n_words == 1:
                print("\nGenerating 1-word prediction options:")
                # a) First words in sentences
                if len(words) >= 1:
                    unique_key = f"{sentence_idx}:first:{words[0]}"
                    print(f"  Adding first word option: '{words[0]}'")
                    context_options_dict[unique_key] = ContextOption(
                        context=words[0],
                        highlighted_words=[words[0]],
                        non_highlighted_words=[]
                    )
                
                # b) Second words with first word as context
                if len(words) >= 2:
                    unique_key = f"{sentence_idx}:second:{words[1]}"
                    print(f"  Adding second word option: context='{words[0]}', highlight='{words[1]}'")
                    context_options_dict[unique_key] = ContextOption(
                        context=' '.join([words[0], words[1]]),  # Include both context and highlighted word
                        highlighted_words=[words[1]],
                        non_highlighted_words=[words[0]]
                    )
                
                # c) Third words with first two words as context
                if len(words) >= 3:
                    unique_key = f"{sentence_idx}:third:{words[2]}"
                    print(f"  Adding third word option: context='{words[0]} {words[1]}', highlight='{words[2]}'")
                    context_options_dict[unique_key] = ContextOption(
                        context=' '.join([*words[:2], words[2]]),  # Include both context and highlighted word
                        highlighted_words=[words[2]],
                        non_highlighted_words=words[:2]
                    )
                
                # Continue for subsequent words
                for i in range(3, len(words)):
                    unique_key = f"{sentence_idx}:pos{i}:{words[i]}"
                    print(f"  Adding word {i+1} option: context='{' '.join(words[:i])}', highlight='{words[i]}'")
                    context_options_dict[unique_key] = ContextOption(
                        context=' '.join([*words[:i], words[i]]),  # Include both context and highlighted word
                        highlighted_words=[words[i]],
                        non_highlighted_words=words[:i]
                    )
            else:
                print(f"\nGenerating {n_words}-word prediction options:")
                # a) First n words in sentence
                if len(words) >= n_words:
                    first_n_words = words[:n_words]
                    unique_key = f"{sentence_idx}:first:{' '.join(first_n_words)}"
                    print(f"  Adding first {n_words} words option: highlight='{' '.join(first_n_words)}'")
                    context_options_dict[unique_key] = ContextOption(
                        context=' '.join(first_n_words),
                        highlighted_words=first_n_words,
                        non_highlighted_words=[]
                    )
                
                # b) Subsequent n words with preceding context
                for i in range(1, len(words) - n_words + 1):
                    highlighted = words[i:i + n_words]
                    context = words[:i]
                    unique_key = f"{sentence_idx}:pos{i}:{' '.join(highlighted)}"
                    print(f"  Adding position {i} option: context='{' '.join(context)}', highlight='{' '.join(highlighted)}'")
                    context_options_dict[unique_key] = ContextOption(
                        context=' '.join([*context, *highlighted]),  # Include both context and highlighted words
                        highlighted_words=highlighted,
                        non_highlighted_words=context
                    )

        # Convert dictionary values to list
        context_options = list(context_options_dict.values())

        # Sort context options:
        # First, options with no prefix (first words in sentences)
        # Then, options with prefixes, sorted by prefix length
        context_options.sort(key=lambda x: (
            len(x.non_highlighted_words),  # Sort by prefix length first
            ' '.join(x.non_highlighted_words).lower(),  # Then by prefix text
            ' '.join(x.highlighted_words).lower()  # Then by highlighted text
        ))

        print("\n=== Final context options ===")
        for opt in context_options:
            print(f"Context: {opt.context}")
            print(f"  Highlighted: {opt.highlighted_words}")
            print(f"  Non-highlighted: {opt.non_highlighted_words}\n")

        # Get predictions for the first context option
        if context_options:
            model = create_ngram_model(processed_sentences, n=n_words)
            context_tuple = tuple(context_options[0].highlighted_words)
            probs = get_next_word_probabilities(context_tuple, model)
            predictions = [
                ContextPrediction(word=word, probability=prob)
                for word, prob in sorted(probs.items(), key=lambda x: x[1], reverse=True)
            ]

        return ContextPredictionResponse(
            context_options=context_options,
            predictions=predictions
        )
    except Exception as e:
        print(f"Error in get_context_options: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_predictions/{n_words}", response_model=List[ContextPrediction])
async def get_predictions(n_words: int, context: str, input_data: SentencesInput):
    try:
        print(f"\n=== Getting predictions for {n_words} words with context: '{context}' ===")
        processed_sentences = [s.strip() for s in input_data.sentences if s.strip()]
        print(f"Input sentences: {processed_sentences}")

        # Create n-gram model using n_words as the context size
        model = create_ngram_model(processed_sentences, n=n_words)
        
        # Get the context words
        context_words = context.split()
        print(f"Context words: {context_words}")
        
        # Use the last n_words as context
        context_tuple = tuple(context_words[-n_words:])
        print(f"Using context tuple: {context_tuple}")
        
        # Get probabilities for the next word
        probs = get_next_word_probabilities(context_tuple, model)
        print(f"Generated probabilities: {probs}")
        
        # Convert to list of predictions
        predictions = [
            ContextPrediction(word=word, probability=prob)
            for word, prob in sorted(probs.items(), key=lambda x: x[1], reverse=True)
        ]
        
        print(f"Returning {len(predictions)} predictions")
        for pred in predictions[:5]:  # Print top 5 predictions for debugging
            print(f"  {pred.word}: {pred.probability:.2%}")
            
        return predictions
    except Exception as e:
        print(f"Error in get_predictions: {str(e)}")
        print(f"Context: {context}")
        print(f"n_words: {n_words}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 