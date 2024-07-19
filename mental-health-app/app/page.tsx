"use client"
import { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import './App.css'; // Import a CSS file to style your components

interface Analysis {
  sentiment: string;
  reason: string;
  'things to do': string;
}

const Home: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    const generateSession = async () => {
      const response = await axios.get('http://localhost:4000/generate_session');
      setSessionId(response.data);
    };
    generateSession();
  }, []);

  useEffect(() => {
    if (sessionId) {
      const generateQuestions = async () => {
        const response = await axios.get(`http://localhost:4000/generate_questions/${sessionId}`);
        setQuestions(response.data);
      };
      generateQuestions();
    }
  }, [sessionId]);

  const handleAnswerChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setAnswers(prev => ({ ...prev, [index]: value }));
  };
  
  const submitAnswers = async () => {
    await axios.post(`http://localhost:4000/store_qa/${sessionId}`, answers);
    getAnalysis();
  };

  const getAnalysis = async () => {
    const response = await axios.post('http://localhost:4000/predict', answers);
    setAnalysis(response.data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mental Health Analysis</h1>
      </header>
      {questions.length > 0 ? (
        <div className="questions">
          <h2>Questions</h2>
          <ul>
            {questions.map((question, index) => (
              <li key={index}>
                <label>
                  {question}
                  <input
                    type="text"
                    onChange={(e) => handleAnswerChange(index, e)}
                  />
                </label>
              </li>
            ))}
          </ul>
          <button onClick={submitAnswers}>
            Submit Answers
          </button>
        </div>
      ) : (
        <p>Loading questions...</p>
      )}
      {showModal && analysis && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={closeModal}>&times;</span>
            <h2>Analysis</h2>
            <p>Prediction: {analysis.sentiment}</p>
            <p>Reason: {analysis.reason}</p>
            <p>Things to do: {analysis['things to do']}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
