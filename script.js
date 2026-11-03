// ---------- Settings ----------
const API_BASE_URL = "https://api.github.com";
const MAX_REPOS = 6;
 
// ---------- DOM elements ----------
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const searchButton = document.querySelector("#search-button");
const exampleButtons = document.querySelectorAll("[data-username]");
const statusMessage = document.querySelector("#status-message");
const profileSection = document.querySelector("#profile-section");
const profileContainer = document.querySelector("#profile");
const reposSection = document.querySelector("#repos-section");
const reposList = document.querySelector("#repos-list");
 
// ---------- Event listeners ----------
// A form submit event fires on button click AND when pressing Enter.
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSearch(searchInput.value);
});
 
exampleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const username = button.dataset.username;
    searchInput.value = username;
    handleSearch(username);
  });
});
 
// ---------- Main flow ----------
async function handleSearch(rawUsername) {
  const username = rawUsername.trim();
 
  if (username === "") {
    hideResults();
    showError("Please enter a GitHub username.");
    searchInput.focus();
    return;
  }
 
  hideResults();
  setLoading(true);
 
  try {
    // Both requests start at the same time and we wait for both.
    const [user, repos] = await Promise.all([
      fetchUser(username),
      fetchRepos(username),
    ]);
 
    clearStatus();
    renderProfile(user);
    renderRepos(repos);
  } catch (error) {
    showError(getErrorMessage(error, username));
  } finally {
    setLoading(false);
  }
}
 
// ---------- API requests ----------
async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
 
  if (response.status === 404) throw new Error("NOT_FOUND");
  if (response.status === 403 || response.status === 429) throw new Error("RATE_LIMIT");
  if (!response.ok) throw new Error("API_ERROR");
 
  return response.json();
}
 
function fetchUser(username) {
  return fetchJson(`${API_BASE_URL}/users/${encodeURIComponent(username)}`);
}
 
function fetchRepos(username) {
  return fetchJson(
    `${API_BASE_URL}/users/${encodeURIComponent(username)}/repos?sort=updated&direction=desc&per_page=30`
  );
}
 
// ---------- Rendering ----------
function renderProfile(user) {
  const displayName = user.name || user.login;
 
  const details = [
    user.location ? `<li>📍 ${escapeHTML(user.location)}</li>` : "",
    user.company ? `<li>🏢 ${escapeHTML(user.company)}</li>` : "",
    `<li>📅 Joined ${formatDate(user.created_at)}</li>`,
  ].join("");
 
  profileContainer.innerHTML = `
    <article class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg sm:p-8">
      <div class="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
        <img
          src="${user.avatar_url}"
          alt="Avatar of ${escapeHTML(user.login)}"
          class="h-28 w-28 shrink-0 rounded-full ring-4 ring-slate-800 sm:h-32 sm:w-32"
        />
        <div class="min-w-0 flex-1">
          <h2 class="break-words text-2xl font-bold sm:text-3xl">${escapeHTML(displayName)}</h2>
          <p class="text-slate-400">@${escapeHTML(user.login)}</p>
          <p class="mt-3 text-slate-300">${user.bio ? escapeHTML(user.bio) : "This user has no bio."}</p>
          <ul class="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-400 sm:justify-start">
            ${details}
          </ul>
        </div>
      </div>
 
      <dl class="mt-6 grid grid-cols-3 gap-3 text-center">
        ${renderStat("Repositories", user.public_repos)}
        ${renderStat("Followers", user.followers)}
        ${renderStat("Following", user.following)}
      </dl>
 
      <a
        href="${user.html_url}"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:w-auto"
      >
        View GitHub profile
      </a>
    </article>
  `;
 
  profileSection.classList.remove("hidden");
}
 
function renderStat(label, value) {
  return `
    <div class="rounded-xl bg-slate-800/60 px-2 py-4">
      <dd class="text-xl font-bold sm:text-2xl">${value.toLocaleString()}</dd>
      <dt class="text-xs text-slate-400 sm:text-sm">${label}</dt>
    </div>
  `;
}
 
function renderRepos(repos) {
  reposSection.classList.remove("hidden");
 
  if (repos.length === 0) {
    reposList.innerHTML = `
      <li class="col-span-full rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
        This user has no public repositories yet.
      </li>
    `;
    return;
  }
 
  reposList.innerHTML = [...repos]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, MAX_REPOS)
    .map(createRepoCard)
    .join("");
}
 
function createRepoCard(repo) {
  return `
    <li class="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-indigo-500/60">
      <a
        href="${repo.html_url}"
        target="_blank"
        rel="noopener noreferrer"
        class="break-words text-lg font-semibold text-indigo-400 hover:underline"
      >
        ${escapeHTML(repo.name)}
      </a>
      <p class="mt-2 flex-1 text-sm text-slate-400">
        ${repo.description ? escapeHTML(repo.description) : "No description provided."}
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
        <span class="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs">
          ${repo.language ? escapeHTML(repo.language) : "No language"}
        </span>
        <span class="inline-flex items-center gap-1" title="Stars">
          <svg class="h-4 w-4 fill-current text-yellow-400" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>
          ${repo.stargazers_count.toLocaleString()}
        </span>
        <span class="inline-flex items-center gap-1" title="Forks">
          <svg class="h-4 w-4 fill-current text-slate-400" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/></svg>
          ${repo.forks_count.toLocaleString()}
        </span>
      </div>
    </li>
  `;
}
 
// ---------- Status helpers (loading and errors) ----------
function setLoading(isLoading) {
  searchButton.disabled = isLoading;
  searchButton.textContent = isLoading ? "Searching..." : "Search";
 
  if (isLoading) {
    statusMessage.innerHTML = `
      <div class="flex items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        <span class="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400"></span>
        Loading profile...
      </div>
    `;
    statusMessage.classList.remove("hidden");
  }
}
 
function showError(message) {
  statusMessage.innerHTML = `
    <div class="rounded-xl border border-red-500/40 bg-red-500/10 p-5 text-center text-red-300">
      ${escapeHTML(message)}
    </div>
  `;
  statusMessage.classList.remove("hidden");
}
 
function clearStatus() {
  statusMessage.innerHTML = "";
  statusMessage.classList.add("hidden");
}
 
function hideResults() {
  profileSection.classList.add("hidden");
  reposSection.classList.add("hidden");
}
 
function getErrorMessage(error, username) {
  switch (error.message) {
    case "NOT_FOUND":
      return `We couldn't find a user named "${username}". Check the spelling and try again.`;
    case "RATE_LIMIT":
      return "GitHub's request limit was reached. Please wait a few minutes and try again.";
    case "API_ERROR":
      return "GitHub returned an error. Please try again later.";
    default:
      return "Network problem. Check your internet connection and try again.";
  }
}
 
// ---------- Utilities ----------
function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
 
// Prevents user-provided text (bio, descriptions...) from injecting HTML.
function escapeHTML(text) {
  const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(text).replace(/[&<>"']/g, (character) => replacements[character]);
}
 