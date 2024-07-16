document.addEventListener('DOMContentLoaded', async function() {
    // Call your backend API to generate a session
    const sessionResponse = await fetch('http://localhost:4000/generate_session');
    const sessionData = await sessionResponse.json();

    // Show the question container
    document.getElementById('questionContainer').style.display = 'block';

    // Start the question flow
    await initiateQuestionFlow(sessionData);
});

let recognition; // Declare the recognition object globally

async function initiateQuestionFlow(sessionID) {
    // Call your backend API to generate questions
    const questionResponse = await fetch(`http://localhost:4000/generate_questions/${sessionID}`);
    const questionData = await questionResponse.json();

    // Display the first question and question count in the output div
    document.getElementById('questionOutput').innerText = `Question: ${questionData[0]}`;
    updateQuestionCount(questionData.length);

    // Add event listener for the next question button
    document.getElementById('nextQuestionBtn').addEventListener('click', async function() {
        const answer = document.getElementById('answerInput').value;

        // Format the data to send to the store_qa API
        const data = {
            Question: questionData[0],
            answer: answer,
        };

        // Call your backend API to store the answer
        await fetch(`http://localhost:4000/store_qa/${sessionID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        // Clear the text box
        document.getElementById('answerInput').value = '';

        // Check if there are more questions
        if (questionData.length > 1) {
            // Get the next question
            questionData.shift(); // Remove the first question from the array
            document.getElementById('questionOutput').innerText = `Question: ${questionData[0]}`;
            updateQuestionCount(questionData.length);
        } else {
            // All questions answered, proceed to prediction
            document.getElementById('questionContainer').style.display = 'none';
            await sendStoredDataToPredict(sessionID);
        }
    });

    // Add event listener for pressing Enter key
    document.getElementById('answerInput').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            // Simulate a click on the "Next Question" button
            document.getElementById('nextQuestionBtn').click();
        }
    });

    // Add event listener for the "Stop Chat" button
    document.getElementById('stopChatBtn').addEventListener('click', async function() {
        // Stop the chat and proceed to prediction
        document.getElementById('questionContainer').style.display = 'none';
        await sendStoredDataToPredict(sessionID);
    });

    // Add event listener for the voice input button
    const toggleBtn = document.getElementById('voiceInputBtn');
    const output = document.getElementById('output');

    let isRecording = false;
    recognition = new webkitSpeechRecognition() || new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        output.textContent = 'Listening...';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        document.getElementById('answerInput').value += transcript + ' '; // Append transcript to the existing content
        };

    recognition.onend = () => {
        output.textContent += ' (Recording ended)';
    };

    recognition.onerror = (event) => {
        output.textContent = 'Error occurred: ' + event.error;
    };

    toggleBtn.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
            toggleBtn.textContent = 'Start Recording';
        } else {
            recognition.start();
            toggleBtn.textContent = 'Stop Recording';
        }

        isRecording = !isRecording;
    });
}

function updateQuestionCount(remainingQuestions) {
    const totalQuestions = 10; // Set the total number of questions here
    const answeredQuestions = totalQuestions - remainingQuestions;
    document.getElementById('questionCount').innerText = `Question ${answeredQuestions}/${totalQuestions}`;
}

async function sendStoredDataToPredict(sessionID) {
    try {
        // Call your backend API to get the stored data
        const storedDataResponse = await fetch(`http://localhost:4000/store_qa/${sessionID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });

        if (!storedDataResponse.ok) {
            throw new Error(`Error: ${storedDataResponse.status} - ${storedDataResponse.statusText}`);
        }

        const rawStoredData = await storedDataResponse.text();
        console.log('Raw Stored Data:', rawStoredData);

        const storedData = JSON.parse(rawStoredData);
        const nonEmptyStoredData = storedData.filter(item => Object.keys(item).length > 0);
        // Call your backend API to predict mental health sentiment using stored data
        const predictResponse = await fetch('http://localhost:4000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionID, storedData: nonEmptyStoredData }),
        });

        const predictionData = await predictResponse.json();

        console.log(predictionData);  // Log the prediction response

        if (predictionData && predictionData.sentiment && predictionData.reason && predictionData['things to do']) {
            document.getElementById('predictionOutput').innerText = `Prediction: ${predictionData.sentiment}, Reason: ${predictionData.reason}, Things to do: ${predictionData['things to do']}`;
            document.getElementById('predictionOutput').style.display = 'block';
        } else {
            console.error('Invalid prediction response:', predictionData);
            // Handle the case where the response does not have the expected structure
        }
    } catch (error) {
        console.error('Error:', error);
    }
}