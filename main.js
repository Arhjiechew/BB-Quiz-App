import './style.css'
// 注意：Vite 环境下使用 Firebase v9+ 的模块化写法
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";

// 从 .env 读取配置
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 游戏状态
let currentRole = "";
let playerName = "";
let questions = [];
let currentIndex = 0;
let score = 0;
let streak = 0;
let maxStreak = 0;
let correctCount = 0;

// UI 元素引用
const pages = {
    role: document.getElementById('page1-role'),
    name: document.getElementById('page2-name'),
    quiz: document.getElementById('page3-quiz'),
    result: document.getElementById('page4-result')
};

// 1. 选择组别
document.getElementById('btnSelectJunior').onclick = () => showNamePage("Junior");
document.getElementById('btnSelectSenior').onclick = () => showNamePage("Senior");

function showNamePage(role) {
    currentRole = role;
    document.getElementById('displayRole').innerText = role;
    pages.role.classList.add('hidden');
    pages.name.classList.remove('hidden');
}

document.getElementById('btnBackToRole').onclick = () => {
    pages.name.classList.add('hidden');
    pages.role.classList.remove('hidden');
};

// 2. 开始答题 (全大写名字 + 随机抽50题)
document.getElementById('btnStartQuiz').onclick = async () => {
    const nameInput = document.getElementById('playerName').value.trim();
    if (!nameInput) return alert("Please enter your name!");
    
    playerName = nameInput.toUpperCase(); // 强制大写
    pages.name.classList.add('hidden');
    pages.quiz.classList.remove('hidden');

    // 拉取数据库
    const colName = currentRole === "Junior" ? "JuniorQuestions" : "SeniorQuestions";
    const querySnapshot = await getDocs(collection(db, colName));
    questions = querySnapshot.docs.map(doc => doc.data());
    
    // Shuffle & Slice 50
    questions.sort(() => Math.random() - 0.5);
    questions = questions.slice(0, 50);

    loadQuestion();
};

// 3. 加载题目
function loadQuestion() {
    const q = questions[currentIndex];
    document.getElementById('progressText').innerText = `Question ${currentIndex + 1} of ${questions.length}`;
    document.getElementById('questionText').innerText = q.question;
    document.getElementById('nextBtn').classList.add('hidden');

    const btns = document.querySelectorAll('.option-btn');
    btns.forEach((btn, i) => {
        btn.innerText = q.options[i];
        btn.className = "option-btn";
        btn.disabled = false;
        btn.onclick = () => handleAnswer(i, q.correct_index);
    });
}

// 4. 判断对错 (变色逻辑)
function handleAnswer(selected, correct) {
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(btn => btn.disabled = true); // 锁死

    if (selected === correct) {
        btns[selected].classList.add('correct');
        streak++;
        correctCount++;
        if (streak > maxStreak) maxStreak = streak;
        score += 10 * Math.pow(2, streak - 1);
    } else {
        btns[selected].classList.add('wrong');
        btns[correct].classList.add('correct');
        streak = 0;
    }

    document.getElementById('scoreDisplay').innerText = score;
    document.getElementById('streakDisplay').innerText = streak;
    document.getElementById('correctDisplay').innerText = `${correctCount} / ${questions.length}`;
    document.getElementById('nextBtn').classList.remove('hidden');
}

// 5. 下一题
document.getElementById('nextBtn').onclick = () => {
    currentIndex++;
    if (currentIndex < questions.length) {
        loadQuestion();
    } else {
        finishGame();
    }
};

// 6. 结束并上传 (Replace Score)
async function finishGame() {
    pages.quiz.classList.add('hidden');
    pages.result.classList.remove('hidden');

    document.getElementById('finalName').innerText = playerName;
    document.getElementById('finalScore').innerText = score;
    document.getElementById('finalCombo').innerText = maxStreak;
    document.getElementById('finalCorrect').innerText = correctCount;

    // 使用 Role_Name 作为 ID 实现覆盖
    await setDoc(doc(db, "Leaderboard", `${currentRole}_${playerName}`), {
        name: playerName,
        role: currentRole,
        score: score,
        maxCombo: maxStreak,
        correctAnswers: correctCount,
        timestamp: serverTimestamp()
    });
}

document.getElementById('btnRestart').onclick = () => location.reload();