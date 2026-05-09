/**
 * projects.js
 * Handles all DOM operations for the projects section.
 * Responsibilities:
 *   - Render repo cards
 *   - Render loading skeletons
 *   - Render error states
 *   - Filter by language / topic / search query
 *   - Build filter buttons dynamically from fetched data
 *   - No global state pollution (all state is module-local)
 */

const ProjectsRenderer = (() => {

	/* ─── DOM References ─────────────────────────────────── */
	const grid          = () => document.getElementById('projects-grid');
	const filterBar     = () => document.getElementById('projects-filter-bar');
	const searchInput   = () => document.getElementById('projects-search');
	const countEl       = () => document.getElementById('projects-count');
	const errorBanner   = () => document.getElementById('projects-error');

	/* ─── Internal State ─────────────────────────────────── */
	let _allRepos      = [];
	let _activeFilter  = 'all'; // language slug or 'all'
	let _activeSearch  = '';

	/* ─── Language Color Map ─────────────────────────────── */
	// GitHub's canonical language colors (subset)
	const LANG_COLORS = {
		JavaScript : '#f1e05a',
		TypeScript : '#3178c6',
		Python     : '#3572A5',
		C          : '#555555',
		'C++'      : '#f34b7d',
		'C#'       : '#178600',
		Rust       : '#dea584',
		Go         : '#00ADD8',
		Java       : '#b07219',
		Ruby       : '#701516',
		PHP        : '#4F5D95',
		HTML       : '#e34c26',
		CSS        : '#563d7c',
		Shell      : '#89e051',
		Kotlin     : '#A97BFF',
		Swift      : '#F05138',
		Dart       : '#00B4AB',
		Lua        : '#000080',
		Haskell    : '#5e5086',
		Nix        : '#7e7eff',
	};

	function _langColor(lang) {
		return LANG_COLORS[lang] ?? '#8b949e';
	}

	/* ─── Date Formatting ────────────────────────────────── */
	function _formatDate(isoString) {
		const d = new Date(isoString);
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function _relativeTime(isoString) {
		const diff = Date.now() - new Date(isoString).getTime();
		const days = Math.floor(diff / 86400000);
		if (days === 0) return 'today';
		if (days === 1) return 'yesterday';
		if (days < 30)  return `${days}d ago`;
		if (days < 365) return `${Math.floor(days / 30)}mo ago`;
		return `${Math.floor(days / 365)}y ago`;
	}

	/* ─── HTML Sanitization ──────────────────────────────── */
	// Prevent XSS: all user-sourced strings go through this
	function _esc(str) {
		if (!str) return '';
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	/* ─── Card Template ──────────────────────────────────── */
	function _buildCard(repo) {
		const name        = _esc(repo.name);
		const desc        = _esc(repo.description) || '<span class="no-desc">No description provided.</span>';
		const lang        = repo.language;
		const stars       = repo.stargazers_count ?? 0;
		const updated     = _formatDate(repo.updated_at);
		const updatedRel  = _relativeTime(repo.updated_at);
		const repoUrl     = _esc(repo.html_url);
		const homepage    = repo.homepage && repo.homepage.trim() !== '' ? _esc(repo.homepage) : null;
		const color       = _langColor(lang);
		const topics      = Array.isArray(repo.topics) ? repo.topics.filter(t => t !== 'portfolio') : [];

		const langBadge = lang
			? `<span class="card-lang">
					<span class="lang-dot" style="background:${color}"></span>
					${_esc(lang)}
			   </span>`
			: `<span class="card-lang muted">Unknown</span>`;

		const starsBadge = `
			<span class="card-stars" title="${stars} star${stars !== 1 ? 's' : ''}">
				<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
					<path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0
					0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0
					1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0
					1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1
					.416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
				</svg>
				${stars}
			</span>`;

		const topicTags = topics.length > 0
			? `<div class="card-topics">${topics.slice(0, 4).map(t =>
				`<span class="topic-tag">${_esc(t)}</span>`
			  ).join('')}</div>`
			: '';

		const demoLink = homepage
			? `<a href="${homepage}" target="_blank" rel="noopener noreferrer"
				   class="card-btn card-btn--demo" aria-label="Live demo of ${name}">
					<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
						<path d="M8.75 3a.75.75 0 0 0 0 1.5h2.69L6.22 9.72a.75.75 0 1
						0 1.06 1.06l5.22-5.22v2.69a.75.75 0 0 0 1.5 0V3.75A.75.75
						0 0 0 13 3H8.75Z"/>
						<path d="M3.25 3.5a.75.75 0 0 0 0 1.5H5A.75.75 0 0 1 5.75
						5.75v6.5a.75.75 0 0 1-.75.75H2.5A.75.75 0 0 1 1.75
						12.25V5A.75.75 0 0 1 2.5 4.25H3a.75.75 0 0 0 0-1.5H2.5A2.25
						2.25 0 0 0 .25 5v7.25A2.25 2.25 0 0 0 2.5 14.5H5A2.25 2.25
						0 0 0 7.25 12.25v-6.5A2.25 2.25 0 0 0 5 3.5H3.25Z"/>
					</svg>
					Live Demo
				</a>`
			: '';

		return `
		<article class="project-card" data-lang="${_esc(lang ?? '')}" data-name="${name}" role="listitem">
			<div class="card-header">
				<svg class="card-repo-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
					<path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75
					0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714
					1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2
					11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5
					9h8Z"/>
				</svg>
				<h3 class="card-name">
					<a href="${repoUrl}" target="_blank" rel="noopener noreferrer">${name}</a>
				</h3>
			</div>

			<p class="card-desc">${desc}</p>

			${topicTags}

			<div class="card-meta">
				${langBadge}
				${starsBadge}
				<span class="card-updated" title="Last updated ${updated}">
					<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
						<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0
						1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028 2.03a.749.749
						0 0 1-.326 1.275.749.749 0 0 1-.734-.215L7.22
						8.384a.75.75 0 0 1-.22-.53V4.75a.75.75 0 0 1 1.5 0Z"/>
					</svg>
					${updatedRel}
				</span>
			</div>

			<div class="card-actions">
				<a href="${repoUrl}" target="_blank" rel="noopener noreferrer"
				   class="card-btn card-btn--source" aria-label="View source of ${name}">
					<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
						<path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45
						7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2
						0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88
						3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12
						0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68
						0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44
						1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0
						3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51
						1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82
						1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49
						0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/>
					</svg>
					Source
				</a>
				${demoLink}
			</div>
		</article>`;
	}

	/* ─── Skeleton Loader ────────────────────────────────── */
	function _buildSkeleton(count = 6) {
		return Array.from({ length: count }, () => `
			<div class="project-card skeleton" aria-hidden="true">
				<div class="sk sk-title"></div>
				<div class="sk sk-body"></div>
				<div class="sk sk-body sk-body--short"></div>
				<div class="sk sk-meta"></div>
				<div class="sk sk-actions"></div>
			</div>`
		).join('');
	}

	/* ─── Filter Bar ─────────────────────────────────────── */
	function _buildFilterBar(repos) {
		const bar = filterBar();
		if (!bar) return;

		// Collect unique languages
		const langs = [...new Set(repos.map(r => r.language).filter(Boolean))].sort();

		const buttons = [
			`<button class="filter-btn active" data-filter="all">All</button>`,
			...langs.map(l =>
				`<button class="filter-btn" data-filter="${_esc(l)}"
					style="--lang-color:${_langColor(l)}">
					<span class="lang-dot" style="background:${_langColor(l)}"></span>
					${_esc(l)}
				</button>`
			)
		].join('');

		bar.innerHTML = buttons;

		bar.addEventListener('click', e => {
			const btn = e.target.closest('.filter-btn');
			if (!btn) return;
			bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
			btn.classList.add('active');
			_activeFilter = btn.dataset.filter;
			_renderFiltered();
		});
	}

	/* ─── Search ─────────────────────────────────────────── */
	function _attachSearch() {
		const input = searchInput();
		if (!input) return;

		let debounceTimer;
		input.addEventListener('input', () => {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				_activeSearch = input.value.trim().toLowerCase();
				_renderFiltered();
			}, 200);
		});
	}

	/* ─── Filtered Render ────────────────────────────────── */
	function _renderFiltered() {
		const g = grid();
		if (!g) return;

		let filtered = _allRepos;

		if (_activeFilter !== 'all') {
			filtered = filtered.filter(r => (r.language ?? '') === _activeFilter);
		}

		if (_activeSearch) {
			filtered = filtered.filter(r =>
				r.name.toLowerCase().includes(_activeSearch) ||
				(r.description ?? '').toLowerCase().includes(_activeSearch)
			);
		}

		const count = countEl();
		if (count) count.textContent = `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`;

		if (filtered.length === 0) {
			g.innerHTML = `
				<div class="projects-empty" role="status">
					<svg width="40" height="40" viewBox="0 0 16 16" aria-hidden="true">
						<path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>
						<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0
						1 0 13 0 6.5 6.5 0 0 0-13 0Z"/>
					</svg>
					<p>No projects match your filter.</p>
					<button class="filter-btn" onclick="document.getElementById('projects-search').value='';
					document.querySelector('.filter-btn[data-filter=all]').click()">
						Clear filters
					</button>
				</div>`;
			return;
		}

		// Use DocumentFragment for a single reflow
		const fragment = document.createDocumentFragment();
		const temp     = document.createElement('div');
		temp.innerHTML = filtered.map(_buildCard).join('');
		while (temp.firstChild) fragment.appendChild(temp.firstChild);

		g.innerHTML = '';
		g.appendChild(fragment);

		// Stagger card entrance
		g.querySelectorAll('.project-card').forEach((card, i) => {
			card.style.animationDelay = `${i * 60}ms`;
			card.classList.add('card-enter');
		});
	}

	/* ─── Error Banner ───────────────────────────────────── */
	function showError(message, isRateLimit = false) {
		const g = grid();
		if (g) g.innerHTML = '';

		const banner = errorBanner();
		if (!banner) return;

		banner.hidden = false;
		banner.innerHTML = `
			<div class="error-inner ${isRateLimit ? 'error--ratelimit' : 'error--network'}">
				<svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
					<path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75
					1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25
					0 0 0-.44 0L1.698 13.132a.25.25 0 0 0
					.22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75
					0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>
				</svg>
				<p>${_esc(message)}</p>
			</div>`;
	}

	/* ─── Public API ─────────────────────────────────────── */

	/** Show skeleton placeholders while loading */
	function showSkeletons(count = 6) {
		const g = grid();
		if (g) g.innerHTML = _buildSkeleton(count);
	}

	/** Hide skeletons and render real data */
	function renderRepos(repos) {
		_allRepos = repos;
		_buildFilterBar(repos);
		_attachSearch();
		_renderFiltered();
	}

	return { showSkeletons, renderRepos, showError };
})();


/* ─── Bootstrap ──────────────────────────────────────────── */
// Runs after DOM is ready; coordinates API + renderer
document.addEventListener('DOMContentLoaded', async () => {
	ProjectsRenderer.showSkeletons(6);

	try {
		const { repos } = await GithubAPI.fetchRepos();
		ProjectsRenderer.renderRepos(repos);
	} catch (err) {
		const isRate = err instanceof GithubAPI.RateLimitError || err.name === 'RateLimitError';
		ProjectsRenderer.showError(err.message, isRate);
		console.error('[Portfolio] GitHub fetch error:', err);
	}
});
