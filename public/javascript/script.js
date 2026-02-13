let count = 0;
let performanceData = [];
let startTime;
let currentSessionId = null;
let selectedLevel = "Beginner";
let currentSubIndex = 0;
let currentSubtopics = [];
let currentQuiz = [];

document.getElementById("submit").style.display = "none";

document.getElementById("myForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  count = 0;
  performanceData = [];
  startTime = Date.now();

  const title = document.getElementById("title").value.trim();

  if (!title) {
    document.getElementById("output").innerHTML = "Enter a topic";
    return;
  }

  try {
    const response = await fetch("/sub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ 
  title,
  level: selectedLevel
})

    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Server error:", errText);
      alert("Server error. Check backend.");
      return;
    }

    const data = await response.json();

    currentSessionId = data.sessionId;
    const module = data.module;
    currentQuiz = module.quiz;
      currentSubtopics = module.subtopic;
currentSubIndex = 0;

    if (!module || !module.subtopic || !module.quiz) {
      console.error("Invalid structure:", module);
      alert("Invalid server response");
      return;
    }

    document.getElementById("info").innerHTML = "";
    document.getElementById("explain").innerHTML = "";
    document.getElementById("output").innerHTML = "";

  


renderSubtopic();






    document.getElementById("submit").style.display = "block";

  } catch (err) {
    console.error("Fetch error:", err);
    alert("Something went wrong.");
  }
});


// 🔥 Answer Checker
function checker(selected, correct, subtopic) {
  const timeTaken = (Date.now() - startTime) / 1000;
  const isCorrect = selected === correct;

  if (isCorrect) count++;

  performanceData.push({
    subtopic,
    correct: isCorrect,
    timeTaken
  });

  startTime = Date.now();
}


// 🔥 Show Result
function showresult() {

  const total = performanceData.length;
  if (total === 0) return;

  const correct = performanceData.filter(q => q.correct).length;
  const accuracy = (correct / total) * 100;
  const avgTime =
    performanceData.reduce((sum, q) => sum + q.timeTaken, 0) / total;

  let topicStats = {};

  performanceData.forEach(q => {
    if (!topicStats[q.subtopic]) {
      topicStats[q.subtopic] = { correct: 0, total: 0 };
    }
    topicStats[q.subtopic].total++;
    if (q.correct) topicStats[q.subtopic].correct++;
  });

  let strengths = [];
  let gaps = [];

  for (let topic in topicStats) {
    let percent = (topicStats[topic].correct / topicStats[topic].total) * 100;
    if (percent >= 80) strengths.push(topic);
    else if (percent < 60) gaps.push(topic);
  }

  document.getElementById("result").innerHTML = `
    <h2>Learning Profile Analysis</h2>
    <p>Score: ${correct}/${total}</p>
    <p>Accuracy: ${accuracy.toFixed(2)}%</p>
    <p>Average Response Time: ${avgTime.toFixed(2)} seconds</p>
    <hr>
    <h3>Strength Areas:</h3>
    <p>${strengths.length ? strengths.join(", ") : "None identified"}</p>
    <h3>Learning Gaps:</h3>
    <p>${gaps.length ? gaps.join(", ") : "No major gaps"}</p>
  `;

  if (gaps.length > 0) {
    loadDeepExplanation(gaps);
  }
  loadNextTopics(accuracy);

}


// 🔥 Deep Explanation
async function loadDeepExplanation(weakTopics) {

  const deepExplainSection = document.getElementById("deepExplainSection");

  deepExplainSection.innerHTML += `<h3>Improving Weak Areas</h3>`;

  try {
    const response = await fetch("/deep-explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weakTopics,
        originalTopic: document.getElementById("title").value
      })
    });

    const data = await response.json();

    if (!data.explanations) return;

    data.explanations.forEach(item => {
      deepExplainSection.innerHTML += `
        <div class="deep-card">
          <h4>${item.subtopic}</h4>
          <p><strong>Simplified Explanation:</strong> ${item.simplified_explanation}</p>
          <p><strong>Real-world Example:</strong> ${item.real_world_example}</p>
          <p><strong>Analogy:</strong> ${item.analogy}</p>
          <p><strong>Common Mistake:</strong> ${item.common_mistake}</p>
          <hr>
        </div>
      `;
    });

  } catch (err) {
    console.error("Deep explain error:", err);
  }
}

function setLevel(level) {
  selectedLevel = level;
  alert("Level set to: " + level);
}

async function loadNextTopics(accuracy) {

  const resultDiv = document.getElementById("nextTopicsSection");
  
  resultDiv.innerHTML += `<h3>Recommended Next Topics</h3>`;

  try {

    const response = await fetch("/next-topic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: document.getElementById("title").value,
        accuracy: accuracy.toFixed(2),
        level: selectedLevel
      })
    });

    const data = await response.json();

    if (!data.next_topics) return;

    data.next_topics.forEach(item => {
      resultDiv.innerHTML += `
        <div class="next-topic-card">
          <h4>${item.title}</h4>
          <p>${item.reason}</p>
          <button onclick="startNextTopic('${item.title}')">
            Start This Topic
          </button>
        </div>
      `;
    });

  } catch (err) {
    console.error("Next topic error:", err);
  }
}

function startNextTopic(topic) {
  document.getElementById("title").value = topic;
  document.getElementById("myForm").dispatchEvent(new Event("submit"));
}

function renderSubtopic() {

  if (!currentSubtopics || currentSubtopics.length === 0) return;

  const progressPercent = ((currentSubIndex + 1) / currentSubtopics.length) * 100;
  const container = document.getElementById("explain");

  const sub = currentSubtopics[currentSubIndex];

  container.innerHTML = `
    <div class="sub">

      <div class="progress-indicator">
        Step ${currentSubIndex + 1} of ${currentSubtopics.length}
      </div>

      <div class="progress-bar-wrapper">
        <div class="progress-bar" style="width:${progressPercent}%"></div>
      </div>

      <h2>${sub.title}</h2>

      <div class="sub-content">
        <p>${sub.content}</p>
      </div>

      <div class="nav-buttons" style="margin-top:20px;">
        ${currentSubIndex > 0 ? 
          `<button class="prev" onclick="prevSubtopic()">⬅ Previous</button>` : ""}

        ${currentSubIndex < currentSubtopics.length - 1 ?
          `<button class="next" onclick="nextSubtopic()">Next ➡</button>` :
          `<button class="quiz-start" onclick="showQuiz()">Start Quiz</button>`
        }
      </div>

    </div>
  `;
}


function nextSubtopic() {
  if (currentSubIndex < currentSubtopics.length - 1) {
    currentSubIndex++;
    renderSubtopic();
  }
}

function prevSubtopic() {
  if (currentSubIndex > 0) {
    currentSubIndex--;
    renderSubtopic();
  }
}


function showQuiz() {

  document.getElementById("output").innerHTML = "";

  currentQuiz.forEach((q, index) => {
    document.getElementById("output").innerHTML += `
      <div>
        <h3>${index + 1}. ${q.question}</h3>
        ${Object.entries(q.options).map(([key, value]) =>
          `<input type="radio" 
              name="q-${index}" 
              onclick="checker('${key}','${q.answer}','${q.subtopic}',${index})">
            ${key}. ${value}<br>`
        ).join("")}
        <br>
      </div>
    `;
  });

  document.getElementById("submit").style.display = "block";
}

window.addEventListener("load", function () {
  const topic = localStorage.getItem("selectedTopic");

   document.getElementById("manualControls").style.display = "none";
  if (topic) {
    document.getElementById("title").value = topic;
    document.getElementById("myForm").dispatchEvent(new Event("submit"));
    localStorage.removeItem("selectedTopic");
  }
});