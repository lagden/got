import ResponseError from './lib/response-error.js'

/**
 * Set of HTTP methods that correspond to HEAD or GET requests.
 * @type {Set<string>}
 */
const mapHeadGet = new Set(['get', 'head'])

/**
 * A map to store the number of redirects for each request name.
 * @type {Map<string, number>}
 */
const redirects = new Map()

/**
 * A map to store AbortControllers for ongoing requests.
 * @type {Map<string, AbortController>}
 */
const controllers = new Map()

/**
 * Default options for fetch requests.
 * @type {RequestInit}
 */
const optionsDefault = {
	method: 'POST',
	mode: 'cors',
	credentials: 'include',
	redirect: 'follow',
	referrerPolicy: 'no-referrer-when-downgrade',
}

/**
 * Abort a request by its name or create an AbortController for a new request.
 * @param {string} [name] - The name associated with the request.
 * @returns {AbortController|undefined} The AbortController for the new request.
 */
function _abort(name) {
	if (name && controllers.has(name)) {
		const controller = controllers.get(name)
		controller?.abort()
		controllers.delete(name)
	}

	if (name) {
		const controller = new AbortController()
		controllers.set(name, controller)
		return controller
	}
}

/**
 * Perform a fetch request with advanced options.
 * @async
 * @param {Object} args - The arguments for the fetch request.
 * @param {string} args.endpoint - The URL to make the request to.
 * @param {number} [args.maxRedirects=5] - Maximum number of allowed redirects.
 * @param {string} [args.name] - The name associated with the request.
 * @param {boolean} [args.ignoreAbort=false] - If true, allows multiple requests with the same name.
 * @param {boolean} [args.onlyResponse=false] - If true, only the response object is returned.
 * @param {Object} [args.options] - Additional fetch options.
 * @returns {Promise<Response|Object>} The response or parsed JSON of the response.
 */
export async function got(args) {
	const {
		endpoint,
		maxRedirects = 5,
		name,
		ignoreAbort = false,
		onlyResponse = false,
		options = {},
	} = args

	let cc = 0
	if (redirects.has(name)) {
		cc = redirects.get(name)
	} else {
		redirects.set(name, cc)
	}

	let controller
	if (ignoreAbort === false || name === undefined) {
		// Avoid multiple requests
		controller = _abort(name)

		// Set AbortController
		if (controller) {
			options.signal = controller.signal
		}
	}

	// Create request
	const request = new globalThis.Request(endpoint, options)

	try {
		const response = await globalThis.fetch(request)

		if (/post/i.test(options.method) && response.redirected) {
			if (cc >= maxRedirects) {
				throw new ResponseError('ERR_TOO_MANY_REDIRECTS', 429)
			}

			redirects.set(name, cc + 1)
			return got({
				...args,
				endpoint: response.url,
			})
		}

		if (!response.ok) {
			const chunks = []

			const reader = response.body.getReader()
			const pump = async () => {
				const {done, value} = await reader.read()
				if (done) {
					return
				}
				chunks.push(new TextDecoder().decode(value))
				return pump()
			}
			await pump()

			// // Replace the above code with this one soon (113-122)
			// for await (const chunk of response.body) {
			// 	chunks.push(new TextDecoder().decode(chunk))
			// }

			const allbody = chunks.join('')
			let body
			try {
				body = JSON.parse(allbody)
			} catch {
				body = allbody
			}
			throw new ResponseError(response.statusText, response.status, body)
		}

		if (onlyResponse) {
			return response
		}

		return response.json()
	} finally {
		if (controllers.has(name)) {
			controllers.delete(name)
		}
		controller = undefined

		if (redirects.has(name)) {
			redirects.delete(name)
		}
	}
}

/**
 * Perform a GraphQL request using the 'got' function with JSON body.
 * @async
 * @param {Object} args - The arguments for the GraphQL request.
 * @param {string} args.endpoint - The URL of the GraphQL endpoint.
 * @param {number} [args.maxRedirects=5] - Maximum number of allowed redirects.
 * @param {string} [args.name] - The name associated with the request.
 * @param {string} [args.operationName] - Name of the operation to be executed.
 * @param {string} args.source - The GraphQL query/mutation.
 * @param {Object} [args.variableValues] - Variables to be passed with the query/mutation.
 * @param {Object} [args.options] - Additional fetch options.
 * @returns {Promise<Response|Object>} The response or parsed JSON of the response.
 */
export async function gql(args) {
	const {
		endpoint,
		maxRedirects = 5,
		name,
		operationName,
		source,
		query,
		variableValues,
		variables,
		options = {},
	} = args

	const _options = {
		headers: {
			'Content-Type': 'application/json',
		},
		...optionsDefault,
		...options,
	}

	_options.body = _options?.body ?? JSON.stringify({source, query, variableValues, variables, operationName})

	return got({
		endpoint,
		maxRedirects,
		name,
		options: _options,
	})
}

/**
 * Perform a RESTful request using the 'got' function with optional JSON body.
 * @async
 * @param {Object} args - The arguments for the RESTful request.
 * @param {Object} args.data - The data to be sent in the request body (if applicable).
 * @param {string} args.endpoint - The URL to make the request to.
 * @param {boolean} [args.json=true] - If true, sets 'Content-Type' header to 'application/json'.
 * @param {number} [args.maxRedirects=5] - Maximum number of allowed redirects.
 * @param {string} [args.name] - The name associated with the request.
 * @param {boolean} [args.onlyResponse=false] - If true, only the response object is returned.
 * @param {Object} [args.options] - Additional fetch options.
 * @returns {Promise<Response|Object>} The response or parsed JSON of the response.
 */
export async function rest(args) {
	let {
		data,
		endpoint,
		name,
		json = true,
		maxRedirects = 5,
		onlyResponse = false,
		options = {},
	} = args

	const _options = {
		...optionsDefault,
		...options,
	}

	if (json) {
		_options.headers = {
			..._options.headers,
			'Content-Type': 'application/json',
		}
	}

	const isHeadOrGet = mapHeadGet.has(String(_options.method).toLowerCase())

	if (isHeadOrGet) {
		Reflect.deleteProperty(_options, 'body')
		const _url = new URL(endpoint)
		for (const [k, v] of Object.entries(data ?? {})) {
			_url.searchParams.append(k, v)
		}
		endpoint = _url.href
	} else {
		_options.body = _options?.body ?? JSON.stringify(data)
	}

	return got({
		endpoint,
		maxRedirects,
		name,
		onlyResponse,
		options: _options,
	})
}
