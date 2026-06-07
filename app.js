const today = new Date();
let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let currentUser = null;

const config = window.SUPABASE_CONFIG || {};
const hasSupabaseConfig =
  config.url &&
  config.anonKey &&
  !config.url.includes("PASTE_") &&
  !config.anonKey.includes("PASTE_") &&
  window.supabase;
const dbClient = hasSupabaseConfig ? window.supabase.createClient(config.url, config.anonKey) : null;

const state = {
  trainingDays: {},
  shooting: [],
  lifting: []
};

const els = {
  authPanel: document.querySelector("#authPanel"),
  authForm: document.querySelector("#authForm"),
  authTitle: document.querySelector("#authTitle"),
  authHelp: document.querySelector("#authHelp"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  signUpButton: document.querySelector("#signUpButton"),
  signOutButton: document.querySelector("#signOutButton"),
  userBar: document.querySelector("#userBar"),
  userEmail: document.querySelector("#userEmail"),
  statusMessage: document.querySelector("#statusMessage"),
  tabs: document.querySelectorAll(".tab-button"),
  panels: {
    calendar: document.querySelector("#calendarPanel"),
    shooting: document.querySelector("#shootingPanel"),
    lifting: document.querySelector("#liftingPanel")
  },
  monthLabel: document.querySelector("#monthLabel"),
  calendarGrid: document.querySelector("#calendarGrid"),
  monthTrainCount: document.querySelector("#monthTrainCount"),
  bestShooting: document.querySelector("#bestShooting"),
  latestLift: document.querySelector("#latestLift"),
  shootingForm: document.querySelector("#shootingForm"),
  liftingForm: document.querySelector("#liftingForm"),
  shotDate: document.querySelector("#shotDate"),
  liftDate: document.querySelector("#liftDate"),
  shootingRows: document.querySelector("#shootingRows"),
  liftingRows: document.querySelector("#liftingRows"),
  shootingChart: document.querySelector("#shootingChart"),
  liftingChart: document.querySelector("#liftingChart"),
  chartFilter: document.querySelector("#chartFilter")
};

els.shotDate.value = toDateInput(today);
els.liftDate.value = toDateInput(today);

els.tabs.forEach((button) => {
  button.addEventListener("click", () => {
    els.tabs.forEach((tab) => tab.classList.toggle("active", tab === button));
    Object.entries(els.panels).forEach(([name, panel]) => {
      panel.classList.toggle("active", name === button.dataset.tab);
    });
  });
});

document.querySelector("#prevMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  render();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  render();
});

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireSupabase()) return;

  const { error } = await dbClient.auth.signInWithPassword({
    email: els.authEmail.value,
    password: els.authPassword.value
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  setStatus("Signed in. Loading your tracker...");
});

els.signUpButton.addEventListener("click", async () => {
  if (!requireSupabase()) return;

  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || !password) {
    setStatus("Add an email and password first.", "error");
    return;
  }

  const { error } = await dbClient.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin }
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  setStatus("Account created. If Supabase email confirmation is on, check your inbox.");
});

els.signOutButton.addEventListener("click", async () => {
  if (!requireSupabase()) return;
  await dbClient.auth.signOut();
  currentUser = null;
  clearState();
  updateAuthUi();
  render();
});

els.shootingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireLogin()) return;

  const made = Number(document.querySelector("#shotsMade").value);
  const taken = Number(document.querySelector("#shotsTaken").value);

  if (made > taken) {
    setStatus("Made shots cannot be higher than shots taken.", "error");
    return;
  }

  const { error } = await dbClient.from("shooting_sessions").insert({
    user_id: currentUser.id,
    session_date: els.shotDate.value,
    shot_type: document.querySelector("#shotType").value,
    spot: document.querySelector("#shotSpot").value,
    made,
    taken
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  setStatus("Shooting session saved.");
  await loadRemoteData();
});

els.liftingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireLogin()) return;

  const { error } = await dbClient.from("lifting_sessions").insert({
    user_id: currentUser.id,
    session_date: els.liftDate.value,
    exercise: document.querySelector("#exerciseName").value.trim(),
    weight: Number(document.querySelector("#liftWeight").value),
    reps: Number(document.querySelector("#liftReps").value)
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  setStatus("Lift saved.");
  await loadRemoteData();
});

els.chartFilter.addEventListener("change", renderShooting);

function requireSupabase() {
  if (dbClient) return true;
  setStatus("Add your Supabase URL and anon key in supabase-config.js first.", "error");
  return false;
}

function requireLogin() {
  if (!requireSupabase()) return false;
  if (currentUser) return true;
  setStatus("Sign in first so your data can be saved.", "error");
  return false;
}

function setStatus(message, type = "info") {
  els.statusMessage.textContent = message;
  els.statusMessage.className = `status-message ${type}`;
}

function updateAuthUi() {
  const signedIn = Boolean(currentUser);
  els.authForm.classList.toggle("hidden", signedIn);
  els.userBar.classList.toggle("hidden", !signedIn);
  els.userEmail.textContent = signedIn ? currentUser.email : "";
  els.authTitle.textContent = signedIn ? "Signed in" : "Sign in";
  els.authHelp.textContent = signedIn
    ? "Your training data is now stored in Supabase."
    : "Use your email and password to save progress long-term in Supabase.";

  document.body.classList.toggle("is-signed-out", !signedIn);
}

async function boot() {
  render();

  if (!dbClient) {
    setStatus("Supabase is not connected yet. Follow README.md, then paste your project URL and anon key.");
    updateAuthUi();
    return;
  }

  const {
    data: { session }
  } = await dbClient.auth.getSession();

  currentUser = session?.user || null;
  updateAuthUi();

  if (currentUser) {
    await loadRemoteData();
  } else {
    setStatus("Sign in or create an account to start saving progress.");
  }

  dbClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    updateAuthUi();
    if (currentUser) {
      await loadRemoteData();
    } else {
      clearState();
      render();
      setStatus("Signed out.");
    }
  });
}

async function loadRemoteData() {
  if (!currentUser) return;

  const [trainingResult, shootingResult, liftingResult] = await Promise.all([
    dbClient.from("training_days").select("*").order("training_date", { ascending: true }),
    dbClient.from("shooting_sessions").select("*").order("session_date", { ascending: true }).order("created_at"),
    dbClient.from("lifting_sessions").select("*").order("session_date", { ascending: true }).order("created_at")
  ]);

  const error = trainingResult.error || shootingResult.error || liftingResult.error;
  if (error) {
    setStatus(error.message, "error");
    return;
  }

  state.trainingDays = Object.fromEntries(
    trainingResult.data.map((row) => [
      row.training_date,
      { id: row.id, basketball: row.basketball, lifting: row.lifting }
    ])
  );
  state.shooting = shootingResult.data.map((row) => ({
    id: row.id,
    date: row.session_date,
    type: row.shot_type,
    spot: row.spot,
    made: row.made,
    taken: row.taken,
    createdAt: row.created_at
  }));
  state.lifting = liftingResult.data.map((row) => ({
    id: row.id,
    date: row.session_date,
    exercise: row.exercise,
    weight: Number(row.weight),
    reps: row.reps,
    createdAt: row.created_at
  }));

  render();
}

function clearState() {
  state.trainingDays = {};
  state.shooting = [];
  state.lifting = [];
}

function toDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${value}T12:00:00`)
  );
}

function pct(made, taken) {
  return taken ? (made / taken) * 100 : 0;
}

function oneRepMax(weight, reps) {
  return Math.round(weight * (1 + reps / 30));
}

function sortedByDate(items) {
  return [...items].sort((a, b) => `${a.date}-${a.createdAt}`.localeCompare(`${b.date}-${b.createdAt}`));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstDay.getDay());
  const monthName = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(currentMonth);
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  els.monthLabel.textContent = monthName;
  els.calendarGrid.innerHTML = "";

  weekdayNames.forEach((day) => {
    const weekday = document.createElement("div");
    weekday.className = "weekday";
    weekday.textContent = day;
    els.calendarGrid.appendChild(weekday);
  });

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = toDateInput(date);
    const entry = state.trainingDays[key] || { basketball: false, lifting: false };
    const card = document.createElement("article");
    card.className = `day-card${date.getMonth() === month ? "" : " is-muted"}`;
    card.innerHTML = `
      <span class="day-number">${date.getDate()}</span>
      <label class="check-line"><input type="checkbox" data-date="${key}" data-kind="basketball" ${
        entry.basketball ? "checked" : ""
      }> Basketball</label>
      <label class="check-line"><input type="checkbox" data-date="${key}" data-kind="lifting" ${
        entry.lifting ? "checked" : ""
      }> Lifting</label>
    `;
    els.calendarGrid.appendChild(card);
  }

  els.calendarGrid.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      if (!requireLogin()) {
        checkbox.checked = !checkbox.checked;
        return;
      }

      const { date, kind } = checkbox.dataset;
      state.trainingDays[date] = state.trainingDays[date] || { basketball: false, lifting: false };
      state.trainingDays[date][kind] = checkbox.checked;

      const entry = state.trainingDays[date];
      const { error } = await dbClient.from("training_days").upsert(
        {
          user_id: currentUser.id,
          training_date: date,
          basketball: entry.basketball,
          lifting: entry.lifting,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id,training_date" }
      );

      if (error) {
        setStatus(error.message, "error");
        checkbox.checked = !checkbox.checked;
        state.trainingDays[date][kind] = checkbox.checked;
        renderSummary();
        return;
      }

      setStatus("Training day saved.");
      renderSummary();
    });
  });
}

function renderShooting() {
  const rows = sortedByDate(state.shooting);
  const previousByType = {};
  els.shootingRows.innerHTML = "";

  if (!rows.length) {
    els.shootingRows.innerHTML = `<tr><td class="empty-state" colspan="8">No shooting sessions yet.</td></tr>`;
  }

  rows.forEach((session) => {
    const percent = pct(session.made, session.taken);
    const previous = previousByType[session.type];
    const diff = previous === undefined ? null : percent - previous;
    previousByType[session.type] = percent;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(session.date)}</td>
      <td>${escapeHtml(session.type)}</td>
      <td>${escapeHtml(session.spot)}</td>
      <td>${session.made}</td>
      <td>${session.taken}</td>
      <td><strong>${percent.toFixed(1)}%</strong></td>
      <td>${renderDelta(diff)}</td>
      <td><button class="delete-button" data-id="${session.id}" data-list="shooting" type="button">Delete</button></td>
    `;
    els.shootingRows.appendChild(row);
  });

  drawLineChart(
    els.shootingChart,
    rows
      .filter((item) => els.chartFilter.value === "All" || item.type === els.chartFilter.value)
      .map((item) => ({ label: `${item.date} ${item.type}`, value: pct(item.made, item.taken) })),
    "%"
  );
}

function renderDelta(diff) {
  if (diff === null) return "-";
  const className = diff >= 0 ? "delta-up" : "delta-down";
  const sign = diff >= 0 ? "+" : "";
  return `<span class="${className}">${sign}${diff.toFixed(1)}%</span>`;
}

function renderLifting() {
  const rows = sortedByDate(state.lifting);
  els.liftingRows.innerHTML = "";

  if (!rows.length) {
    els.liftingRows.innerHTML = `<tr><td class="empty-state" colspan="6">No lifts logged yet.</td></tr>`;
  }

  rows.forEach((lift) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(lift.date)}</td>
      <td>${escapeHtml(lift.exercise)}</td>
      <td>${lift.weight}</td>
      <td>${lift.reps}</td>
      <td><strong>${oneRepMax(lift.weight, lift.reps)}</strong></td>
      <td><button class="delete-button" data-id="${lift.id}" data-list="lifting" type="button">Delete</button></td>
    `;
    els.liftingRows.appendChild(row);
  });

  drawLineChart(
    els.liftingChart,
    rows.map((lift) => ({ label: `${lift.date} ${lift.exercise}`, value: oneRepMax(lift.weight, lift.reps) })),
    ""
  );
}

function attachDeleteHandlers() {
  document.querySelectorAll(".delete-button").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!requireLogin()) return;

      const table = button.dataset.list === "shooting" ? "shooting_sessions" : "lifting_sessions";
      const { error } = await dbClient.from(table).delete().eq("id", button.dataset.id);

      if (error) {
        setStatus(error.message, "error");
        return;
      }

      setStatus("Entry deleted.");
      await loadRemoteData();
    });
  });
}

function drawLineChart(canvas, points, suffix) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 44;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfb";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#dce2de";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding + ((height - padding * 2) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  if (!points.length) {
    ctx.fillStyle = "#69746f";
    ctx.font = "18px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Add data to see your progress", width / 2, height / 2);
    return;
  }

  const maxValue = Math.max(100, ...points.map((point) => point.value));
  const minValue = suffix === "%" ? 0 : Math.min(0, ...points.map((point) => point.value));
  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const scaleY = (value) => {
    const ratio = (value - minValue) / (maxValue - minValue || 1);
    return height - padding - ratio * (height - padding * 2);
  };

  ctx.strokeStyle = "#e56d25";
  ctx.lineWidth = 4;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = padding + xStep * index;
    const y = scaleY(point.value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  points.forEach((point, index) => {
    const x = padding + xStep * index;
    const y = scaleY(point.value);
    ctx.fillStyle = "#17785f";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#17211c";
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${point.value.toFixed(1)}${suffix}`, x, Math.max(18, y - 12));
  });
}

function renderSummary() {
  const monthPrefix = toDateInput(currentMonth).slice(0, 7);
  const trainedDays = Object.entries(state.trainingDays).filter(([date, value]) => {
    return date.startsWith(monthPrefix) && (value.basketball || value.lifting);
  }).length;
  const best = state.shooting.reduce((top, item) => Math.max(top, pct(item.made, item.taken)), 0);
  const latest = sortedByDate(state.lifting).at(-1);

  els.monthTrainCount.textContent = trainedDays;
  els.bestShooting.textContent = `${best.toFixed(1)}%`;
  els.latestLift.textContent = latest ? `${latest.exercise} ${oneRepMax(latest.weight, latest.reps)}` : "-";
}

function render() {
  renderCalendar();
  renderShooting();
  renderLifting();
  renderSummary();
  attachDeleteHandlers();
}

boot();
