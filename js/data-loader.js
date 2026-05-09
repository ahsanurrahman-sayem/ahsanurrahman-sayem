/**
 * data-loader.js
 * Loads repo data from the local repos.json file.
 * No GitHub API. No rate limits. You control what shows up.
 *
 * To add/remove a project: edit data/repos.json
 */

const GithubAPI = (() => {
	const JSON_PATH = 'data/repos.json';

	async function fetchRepos() {
		const res = await fetch(JSON_PATH);

		if (!res.ok) {
			throw new Error(`Could not load repos.json: ${res.status} ${res.statusText}`);
		}

		const repos = await res.json();

		if (!Array.isArray(repos)) {
			throw new Error('repos.json must be a JSON array.');
		}

		// Sort by updated_at descending
		repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

		return { repos, fromCache: false };
	}

	// Kept so projects.js works without any changes
	class RateLimitError extends Error {
		constructor(msg) {
			super(msg);
			this.name = 'RateLimitError';
		}
	}

	return { fetchRepos, RateLimitError };
})();
