# LLM Sentence Completion Demo

This demo helps Product Managers and Designers understand how Large Language Models (LLMs) work by visualizing tokenization, context-based predictions, and sentence completion.

## Features

1. **Input & Tokenization**
   - Process multiple natural language sentences
   - View tokenization results using tiktoken
   - Display original text, tokens, and token IDs

2. **Bag-of-Words Sentence Completion**
   - Demonstrates frequency-based word prediction
   - Compare 1-word vs 2-word context predictions
   - View probability scores for next word predictions

## Project Structure

```
llm-demo/
├── backend/
│   ├── main.py           # FastAPI backend server
│   └── requirements.txt  # Python dependencies
└── frontend/
    ├── src/
    │   └── App.tsx      # React frontend application
    └── package.json     # Node.js dependencies
```

## Setup Instructions

### Backend Setup

1. Create a Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Install Node.js and npm if not already installed

2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open your browser to the frontend URL (typically http://localhost:5173)
2. Enter multiple sentences in the text area (one per line)
3. Click "Process Sentences" to see:
   - How each sentence is tokenized
   - Predictions based on 1-word context
   - Predictions based on 2-word context
   - Probability scores for each prediction

## Example Input

Try these example sentences:
```
The cat sat on the mat.
The dog ran in the park.
The bird flew over the tree.
```

## Technical Details

- Backend: Python FastAPI with tiktoken for tokenization
- Frontend: React with TypeScript and Chakra UI
- Simple n-gram model for word prediction (for educational purposes)
- RESTful API for communication between frontend and backend 