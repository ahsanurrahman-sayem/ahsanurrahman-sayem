/**
 * github-api.js
 * Handles all GitHub API communication.
 * - Fetches repos + topics per repo
 * - Filters: non-fork, public, has "portfolio" topic
 * - Caches in sessionStorage with TTL
 * - Handles rate limits and network failures gracefully
 */

const GithubAPI = (() => {
	const USERNAME       = 'ahsanurrahman-sayem';
	const CACHE_KEY      = `gh_repos_${USERNAME}`;
	const CACHE_TTL_MS   = 10 * 60 * 1000; // 10 minutes
	const REPOS_ENDPOINT = `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`;

	/** Read from sessionStorage; return null if missing or expired */
	function _readCache() {
		try {
			const raw = sessionStorage.getItem(CACHE_KEY);
			if (!raw) return null;
			const { ts, data } = JSON.parse(raw);
			if (Date.now() - ts > CACHE_TTL_MS) {
				sessionStorage.removeItem(CACHE_KEY);
				return null;
			}
			return data;
		} catch {
			return null;
		}
	}

	/** Write to sessionStorage; silently ignore quota errors */
	function _writeCache(data) {
		try {
			sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
		} catch { /* storage full — carry on */ }
	}

	/**
	 * Fetch topics for a single repo.
	 * GitHub requires Accept: application/vnd.github.mercy-preview+json for topics.
	 * Returns [] on failure so it never blocks.
	 */
	async function _fetchTopics(repoName) {
		try {
			const res = await fetch(
				`https://api.github.com/repos/${USERNAME}/${repoName}/topics`,
				{ headers: { Accept: 'application/vnd.github.mercy-preview+json' } }
			);
			if (!res.ok) return [];
			const json = await res.json();
			return json.names ?? [];
		} catch {
			return [];
		}
	}

	/**
	 * Fetch all public non-fork repos.
	 * Then attach topics to each repo (parallel fetches).
	 * Returns array sorted by updated_at desc.
	 */
	async function fetchRepos() {
		const cached = _readCache();
		if (cached) return { repos: cached, fromCache: true };

		const res = await fetch(REPOS_ENDPOINT, {
			headers: { Accept: 'application/vnd.github.v3+json' }
		});

		if (res.status === 403 || res.status === 429) {
			const reset = res.headers.get('X-RateLimit-Reset');
			const resetTime = reset ? new Date(parseInt(reset, 10) * 1000).toLocaleTimeString() : 'soon';
			throw new RateLimitError(`GitHub API rate limit exceeded. Resets at ${resetTime}.`);
		}

		if (!res.ok) {
			throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
		}

		const allRepos = await res.json();

		// Filter: public, non-fork only
		const eligible = allRepos.filter(r => !r.fork && !r.private);

		// Attach topics in parallel (max 6 concurrent via batching)
		const withTopics = await _batchFetchTopics(eligible);

		// Filter: only repos with "portfolio" topic
		const portfolioRepos = withTopics.filter(r =>
			Array.isArray(r.topics) && r.topics.includes('portfolio')
		);

		// Sort by updated_at descending (API already does this but let's be explicit)
		portfolioRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

		_writeCache(portfolioRepos);
		return { repos: portfolioRepos, fromCache: false };
	}

	/** Fetch topics in controlled batches of 6 to avoid hammering the API */
	async function _batchFetchTopics(repos, batchSize = 6) {
		const result = [...repos];
		for (let i = 0; i < result.length; i += batchSize) {
			const batch = result.slice(i, i + batchSize);
			const topics = await Promise.all(batch.map(r => _fetchTopics(r.name)));
			topics.forEach((t, idx) => { result[i + idx].topics = t; });
		}
		return result;
	}

	/** Custom error class for rate limit responses */
	class RateLimitError extends Error {
		constructor(msg) {
			super(msg);
			this.name = 'RateLimitError';
		}
	}

	return { fetchRepos, RateLimitError, USERNAME };
})();
