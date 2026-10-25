let calorieTarget = 2000;
let chart;
let weeklyChart;

// passwords are plaintext — fine for now, don't ship this to prod
const foodDB = {
    apple: 95, banana: 105, egg: 78, chicken: 165, rice: 200,
    pizza: 285, burger: 300, milk: 120, oatmeal: 150,
    salmon: 208, broccoli: 55, bread: 79, pasta: 220,
    yogurt: 100, orange: 62, steak: 271, avocado: 160
};

// deselects all cards in the group, selects the clicked one
function selectChoice(el, inputId, value) {
    el.closest('.choice-group').querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById(inputId).value = value;
}

// shows matching foods as you type
function handleFoodInput() {
    let val = document.getElementById("foodName").value.trim().toLowerCase();
    let dropdown = document.getElementById("autocompleteList");

    if (!val) { dropdown.style.display = "none"; return; }

    let matches = Object.keys(foodDB).filter(f => f.startsWith(val));

    if (matches.length === 0) { dropdown.style.display = "none"; return; }

    dropdown.innerHTML = matches.slice(0, 5).map(f =>
        `<div class="ac-item" onclick="pickFood('${f}')">
            <span>${f.charAt(0).toUpperCase() + f.slice(1)}</span>
            <span class="ac-cal">${foodDB[f]} kcal</span>
        </div>`
    ).join('');

    dropdown.style.display = "block";
}

// fills inputs when you pick from the dropdown
function pickFood(name) {
    document.getElementById("foodName").value = name;
    document.getElementById("calories").value = foodDB[name];
    document.getElementById("autocompleteList").style.display = "none";
}

// close dropdown when clicking anywhere else on the page
document.addEventListener("click", (e) => {
    if (!e.target.closest(".autocomplete-wrap")) {
        let d = document.getElementById("autocompleteList");
        if (d) d.style.display = "none";
    }
});

function getUser() { return localStorage.getItem("currentUser"); }

// pulls user data and makes sure the shape is right before returning
function getUserData() {
    let all = JSON.parse(localStorage.getItem("userData")) || {};
    let user = getUser();
    if (!user) return all;

    if (!all[user]) all[user] = { history: {}, profile: {}, water: {} };
    if (!all[user].history) all[user].history = {};
    if (!all[user].profile) all[user].profile = {};
    if (!all[user].water)   all[user].water   = {};

    return all;
}

function saveUserData(data) { localStorage.setItem("userData", JSON.stringify(data)); }

function register() {
    let email    = document.getElementById("registerEmail").value.trim().toLowerCase();
    let password = document.getElementById("registerPassword").value.trim();

    if (!email || !password) { alert("Enter email and password"); return; }

    let users = JSON.parse(localStorage.getItem("users")) || [];
    if (users.find(u => u.email === email)) { alert("User already exists"); return; }

    users.push({ email, password });
    localStorage.setItem("users", JSON.stringify(users));
    alert("Account created!");
    showLogin();
}

function login() {
    let email    = document.getElementById("loginEmail").value.trim().toLowerCase();
    let password = document.getElementById("loginPassword").value.trim();

    let users = JSON.parse(localStorage.getItem("users")) || [];
    let user  = users.find(u => u.email === email && u.password === password);

    if (!user) { alert("Wrong email or password"); return; }

    localStorage.setItem("currentUser", email);

    // clear fields so they don't show if you log out and back in
    document.getElementById("loginEmail").value    = "";
    document.getElementById("loginPassword").value = "";

    let data = getUserData();

    // skip onboarding if they've already set up their profile
    if (data[email].profile && data[email].profile.name) {
        let p = data[email].profile;
        calorieTarget = p.calorieTarget;
        loadDashboard(p);
    } else {
        switchScreen("step0");
    }
}

function logout() { localStorage.removeItem("currentUser"); location.reload(); }
function showRegister() { switchScreen("register"); }
function showLogin()    { switchScreen("login"); }

const allScreens = ["login","register","step0","step1","step2","step3","step4","dashboard"];

// hides everything then shows just the one we want
function switchScreen(id) {
    allScreens.forEach(s => {
        let el = document.getElementById(s);
        if (el) el.style.display = "none";
    });
    let target = document.getElementById(id);
    if (target) {
        target.style.display = "block";
        // retrigger the fade-in animation
        target.style.animation = "none";
        void target.offsetWidth;
        target.style.animation = "";
    }
}

function nextStep(step) {
    if (step === 1 && !document.getElementById("name").value.trim()) { alert("Enter your name"); return; }
    if (step === 3 && !document.getElementById("weight").value)       { alert("Enter your weight"); return; }
    if (step === 4 && (!document.getElementById("height").value || !document.getElementById("age").value)) {
        alert("Enter height and age"); return;
    }
    switchScreen("step" + step);
}

function goBack(step) { switchScreen("step" + step); }

// Mifflin-St Jeor BMR → multiply for TDEE → adjust for goal
function generateRecommendation(profile) {
    let weight = Number(profile.weight);
    let height = Number(profile.height);
    let sex    = profile.sex;
    let goal   = profile.goal;
    let age    = Number(profile.age) || 25;

    if (!weight || !height) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

    let bmr = sex === "male"
        ? (10 * weight) + (6.25 * height) - (5 * age) + 5
        : (10 * weight) + (6.25 * height) - (5 * age) - 161;

    let tdee = bmr * 1.4; // light activity multiplier

    let calories =
        goal === "cut"  ? tdee - 500 :
        goal === "bulk" ? tdee + 400 :
        tdee;

    // 1.8g protein per kg bodyweight, 25% cals from fat, rest from carbs
    let protein = weight * 1.8;
    let fat     = (calories * 0.25) / 9;
    let carbs   = (calories - (protein * 4 + fat * 9)) / 4;

    return {
        calories: Math.round(calories),
        protein:  Math.round(protein),
        carbs:    Math.round(carbs),
        fat:      Math.round(fat)
    };
}

function startApp() {
    let name   = document.getElementById("name").value.trim();
    let sex    = document.getElementById("sex").value || "male";
    let weight = Number(document.getElementById("weight").value);
    let height = Number(document.getElementById("height").value);
    let age    = Number(document.getElementById("age").value);
    let goal   = document.getElementById("goalType").value || "cut";

    if (!name || !weight || !height || !age) { alert("Please fill in all fields"); return; }

    let bmi = weight / ((height / 100) ** 2);
    let rec = generateRecommendation({ sex, weight, height, goal, age });
    calorieTarget = rec.calories;

    let data = getUserData();
    let user = getUser();

    data[user].profile = { name, bmi, calorieTarget, sex, weight, height, age, goal };
    if (!data[user].water) data[user].water = {};

    saveUserData(data);
    loadDashboard(data[user].profile, rec);
}

// rec is optional — recalculate if not passed in (e.g. on page reload)
function loadDashboard(p, rec) {
    if (!rec) rec = generateRecommendation(p);
    calorieTarget = p.calorieTarget;

    switchScreen("dashboard");

    document.getElementById("welcome").innerText     = "Hey, " + p.name + " 👋";
    document.getElementById("bmiResult").innerText   = p.bmi.toFixed(1);
    document.getElementById("calorieGoal").innerText = Math.round(calorieTarget) + " kcal";
    document.getElementById("goalTag").innerText     = p.goal || "";

    displayRecommendation(rec);
    updateUI();
}

function displayRecommendation(rec) {
    let box = document.getElementById("recommendationBox");
    if (!box) return;

    box.innerHTML = `
        <div class="macro-item"><div class="macro-val">${rec.calories}</div><div class="macro-label">kcal</div></div>
        <div class="macro-item"><div class="macro-val">${rec.protein}g</div><div class="macro-label">Protein</div></div>
        <div class="macro-item"><div class="macro-val">${rec.carbs}g</div><div class="macro-label">Carbs</div></div>
        <div class="macro-item"><div class="macro-val">${rec.fat}g</div><div class="macro-label">Fat</div></div>
    `;
}

function addFood() {
    let name     = document.getElementById("foodName").value.trim().toLowerCase();
    let calInput = document.getElementById("calories");

    // auto-fill calories if it's a known food and the field is empty
    if (foodDB[name] && !calInput.value) calInput.value = foodDB[name];

    let cal = parseInt(calInput.value);

    if (!name || !cal || cal <= 0) { alert("Enter a valid food and calorie amount"); return; }

    let today = new Date().toLocaleDateString();
    let data  = getUserData();
    let user  = getUser();

    if (!data[user].history[today]) data[user].history[today] = [];
    data[user].history[today].push({ name, cal, id: Date.now() }); // id used for deletion later

    saveUserData(data);

    document.getElementById("foodName").value = "";
    document.getElementById("calories").value = "";
    document.getElementById("autocompleteList").style.display = "none";

    updateUI();
}

function deleteFood(day, id) {
    let data = getUserData();
    let user = getUser();

    data[user].history[day] = data[user].history[day].filter(item => item.id !== id);

    saveUserData(data);
    showDayDetails(day); // refresh the detail view
    updateUI();
}

function getTodayWater() {
    let today = new Date().toLocaleDateString();
    let data  = getUserData();
    let user  = getUser();
    if (!data[user].water) data[user].water = {};
    return data[user].water[today] || 0;
}

function addWater() {
    let today = new Date().toLocaleDateString();
    let data  = getUserData();
    let user  = getUser();

    if (!data[user].water) data[user].water = {};
    if (!data[user].water[today]) data[user].water[today] = 0;
    if (data[user].water[today] >= 8) return; // already at the goal

    data[user].water[today] += 1;
    saveUserData(data);
    updateUI();
}

function getTodayCalories() {
    let today = new Date().toLocaleDateString();
    let data  = getUserData();
    let user  = getUser();
    let day   = data[user].history[today] || [];
    return day.reduce((sum, item) => sum + item.cal, 0);
}

// walks back from today, stops as soon as a day has no entries
function calculateStreak() {
    let data = getUserData();
    let user = getUser();

    let streak = 0;
    let d = new Date();

    for (let i = 0; i < 365; i++) {
        let key     = d.toLocaleDateString();
        let dayData = data[user].history[key];

        if (dayData && dayData.length > 0) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

function updateUI() {
    let total = getTodayCalories();
    let water = getTodayWater();
    let pct   = total / calorieTarget;

    // progress bar shifts green → amber → red as you get close to / over target
    let bar    = document.getElementById("progressBar");
    let barPct = Math.min(pct * 100, 100);
    bar.style.width = barPct + "%";
    bar.classList.remove("warn", "danger");
    if (pct > 1.0)      bar.classList.add("danger");
    else if (pct > 0.9) bar.classList.add("warn");

    document.getElementById("calorieStatus").innerText = total + " kcal";
    document.getElementById("date").innerText = new Date().toDateString();

    let streak      = calculateStreak();
    let streakBadge = document.getElementById("streakBadge");
    if (streakBadge) streakBadge.innerText = streak > 0 ? `🔥 ${streak} day streak` : "Start your streak!";

    // score penalizes how far off target you are, floored at 50
    let diff  = Math.abs(calorieTarget - total);
    let score = Math.max(50, Math.round(100 - Math.min((diff / calorieTarget) * 100, 50)));
    let scoreBadge = document.getElementById("healthScore");
    scoreBadge.innerText         = "Score: " + score;
    scoreBadge.style.color       = score >= 85 ? "var(--accent)" : score >= 70 ? "var(--warn)" : "var(--danger)";
    scoreBadge.style.borderColor = "currentColor";
    scoreBadge.style.background  = "transparent";

    let suggestion = document.getElementById("suggestion");
    if (total > calorieTarget)            suggestion.innerText = "⚠️ Over your goal for today.";
    else if (total < calorieTarget * 0.6) suggestion.innerText = "🍗 You're under-eating — log more meals.";
    else                                  suggestion.innerText  = "✅ Great intake — keep it up!";

    document.getElementById("waterStatus").innerText = water + " / 8";
    document.getElementById("waterProgress").value  = water;

    // filled glasses are fully opaque, empty ones are faded out
    let glasses = document.getElementById("waterGlasses");
    if (glasses) {
        glasses.innerHTML = Array.from({ length: 8 }, (_, i) =>
            `<span class="glass-icon ${i < water ? 'filled' : ''}" onclick="addWater()" title="Glass ${i+1}">💧</span>`
        ).join('');
    }

    let waterSug = document.getElementById("waterSuggestion");
    waterSug.innerText =
        water === 0 ? "Don't forget to hydrate!" :
        water < 4   ? "Keep drinking — halfway there." :
        water < 8   ? "Almost there, keep going." :
                      "Hydration goal reached 🎉";

    updateChart(total);
    updateWeeklyChart();
    displayPastDays();
}

function updateChart(total) {
    if (!window.Chart) return;
    if (chart) chart.destroy(); // have to destroy or the canvas glitches

    let remaining = Math.max(calorieTarget - total, 0);

    chart = new Chart(document.getElementById("calorieChart"), {
        type: "doughnut",
        data: {
            labels: ["Consumed", "Remaining"],
            datasets: [{
                data: [total, remaining],
                backgroundColor: ["rgba(34,197,94,0.8)", "rgba(255,255,255,0.06)"],
                borderColor:     ["rgba(34,197,94,1)",   "rgba(255,255,255,0.08)"],
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
                legend: { labels: { color: "#94a3b8", font: { family: "'DM Sans', sans-serif", size: 12 } } }
            }
        }
    });
}

function updateWeeklyChart() {
    if (!window.Chart) return;

    let data = getUserData();
    let user = getUser();

    let days   = Object.keys(data[user].history).slice(-7);
    let labels = [];
    let values = [];

    days.forEach(d => {
        let total = data[user].history[d].reduce((s, i) => s + i.cal, 0);
        // locale date strings are ugly on the chart, convert to "Mar 29"
        let parts = d.split("/");
        let dt    = new Date(parseInt(parts[2]), parseInt(parts[0])-1, parseInt(parts[1]));
        labels.push(dt.toLocaleDateString('en-US', { month:'short', day:'numeric' }));
        values.push(total);
    });

    if (weeklyChart) weeklyChart.destroy();

    // color each bar: red = over, green = on track, blue = under
    weeklyChart = new Chart(document.getElementById("weeklyChart"), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Calories",
                data: values,
                backgroundColor: values.map(v =>
                    v > calorieTarget        ? "rgba(239,68,68,0.5)"  :
                    v > calorieTarget * 0.85 ? "rgba(34,197,94,0.55)" :
                                               "rgba(56,189,248,0.4)"
                ),
                borderColor: values.map(v =>
                    v > calorieTarget        ? "rgba(239,68,68,1)"  :
                    v > calorieTarget * 0.85 ? "rgba(34,197,94,1)"  :
                                               "rgba(56,189,248,1)"
                ),
                borderWidth: 2,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: "#5c7393", font: { family: "'DM Sans', sans-serif", size: 11 } }, grid: { display: false } },
                y: { ticks: { color: "#5c7393", font: { family: "'DM Sans', sans-serif", size: 11 } }, grid: { color: "rgba(255,255,255,0.04)" } }
            }
        }
    });
}

function displayPastDays() {
    let data = getUserData();
    let user = getUser();

    let container = document.getElementById("historyList");
    container.innerHTML = "";

    let days = Object.keys(data[user].history).slice(-7).reverse(); // newest first

    let meta = document.getElementById("historyMeta");
    if (meta) meta.innerText = days.length > 0 ? `Last ${days.length} days` : "";

    if (days.length === 0) {
        container.innerHTML = "<li style='border:none;background:none;color:var(--muted);font-size:14px;display:block;padding:12px'>No history yet — add your first meal!</li>";
        return;
    }

    days.forEach(day => {
        let total = data[user].history[day].reduce((s, i) => s + i.cal, 0);
        let li    = document.createElement("li");
        li.innerHTML = `<span>${day}</span><span class="day-cal">${total} kcal</span>`;
        li.onclick = () => showDayDetails(day);
        container.appendChild(li);
    });
}

function showDayDetails(day) {
    let data = getUserData();
    let user = getUser();
    let list = document.getElementById("historyList");

    // back button stays pinned at the top of the list
    list.innerHTML = `
        <li style="border:none;background:none;padding:0 0 8px 0;display:block;">
            <button class="btn-ghost small" onclick="displayPastDays()">← Back</button>
            <strong style="margin-left:12px;font-size:14px;">${day}</strong>
        </li>
    `;

    let foods = data[user].history[day] || [];

    if (foods.length === 0) {
        list.innerHTML += `<li style="color:var(--muted);font-size:13px;border:none;background:none;display:block">No entries for this day.</li>`;
        return;
    }

    foods.forEach(item => {
        let li = document.createElement("li");
        li.innerHTML = `
            <div class="food-entry">
                <span>${item.name.charAt(0).toUpperCase() + item.name.slice(1)} — <span style="color:var(--accent);font-family:'JetBrains Mono',monospace;font-size:13px">${item.cal} kcal</span></span>
                <button onclick="deleteFood('${day}', ${item.id})" title="Remove entry">✕</button>
            </div>
        `;
        list.appendChild(li);
    });
}

window.onload = function () {
    let user = getUser();

    if (!user) { switchScreen("login"); return; }

    let data = getUserData();

    // go straight to dashboard if they've already done onboarding
    if (data[user] && data[user].profile && data[user].profile.name) {
        loadDashboard(data[user].profile);
    } else {
        switchScreen("step0");
    }
};