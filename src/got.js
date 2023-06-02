import ResponseError from './lib/response-error.js'

const mapHeadGet = new Set(['get', 'head'])
const controllers = new Map()

/**
 * @type {globalThis.Request}
 */
const optionsDefault = {
	method: 'POST',
	mode: 'cors',
	credentials: 'include',
	redirect: 'follow',
	referrerPolicy: 'no-referrer-when-downgrade',
}

/**
 * Aborts a controller and removes it from the controllers map if it exists.
 * Creates and adds a new controller to the controllers map if a name is provided.
 *
 * @param {string} [name] - The name of the controller to abort and add.
 * @returns {AbortController|undefined} The aborted controller if it exists, or the newly created controller.
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
 * Executes an asynchronous HTTP request using the global `fetch` function.
 *
 * @async
 * @param {object} args - The request arguments.
 * @param {string} args.endpoint - The URL endpoint to send the request to.
 * @param {string} [args.name] - The name of the request (for managing multiple requests).
 * @param {object} [args.options] - The options to configure the request (e.g., method, headers, body).
 * @param {boolean} [args.onlyResponse=false] - Flag indicating whether to return the full response or only the JSON body.
 * @param {boolean} [args.ignoreAbort=false] - Flag indicating whether to ignore aborting the request.
 * @returns {Promise<Response|object>} A Promise that resolves to the response object or the parsed JSON body.
 * @throws {ResponseError} If the response status is not OK (2xx).
 */
export async function got(args = {}) {
	const {
		endpoint,
		name = 'tadashi_got',
		options = {},
		onlyResponse = false,
		ignoreAbort = false,
	} = args

	let controller
	if (ignoreAbort === false) {
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

		if (!response.ok) {
			const _error = new ResponseError(response.statusText, response.status)
			if (/application\/json/g.test(response?.headers?.get('content-type'))) {
				_error.body = await response.json()
			}
			throw _error
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
	}
}

/**
 * Executes a GraphQL query using the `got` function with the provided arguments.
 *
 * @async
 * @param {object} args - The GraphQL request arguments.
 * @param {string} args.source - The GraphQL query or mutation string.
 * @param {object} [args.variableValues] - The variable values to be used in the query.
 * @param {string} [args.operationName] - The name of the operation in the query.
 * @param {string} args.endpoint - The URL endpoint for the GraphQL server.
 * @param {string} args.name - The name of the request (for managing multiple requests).
 * @param {object} [args.options] - Additional options to configure the request.
 * @returns {Promise<Response|object>} A Promise that resolves to the response object or the parsed JSON body.
 * @throws {ResponseError} If the response status is not OK (2xx).
 */
export async function gql(args = {}) {
	const {
		source,
		variableValues,
		operationName,
		endpoint,
		name,
		options = {},
	} = args

	const _options = {
		headers: {
			'Content-Type': 'application/json',
		},
		...optionsDefault,
		...options,
	}

	_options.body = _options?.body ?? JSON.stringify({source, variableValues, operationName})

	return got({name, endpoint, options: _options})
}

/**
 * Executes a REST API request using the `got` function with the provided arguments.
 *
 * @async
 * @param {object} [args] - The REST request arguments.
 * @param {object} [args.data] - The request data to be sent in the body (for non-GET/HEAD requests).
 * @param {string} args.endpoint - The URL endpoint for the REST API.
 * @param {string} args.name - The name of the request (for managing multiple requests).
 * @param {boolean} [args.onlyResponse=false] - Flag indicating whether to return the full response or only the JSON body.
 * @param {boolean} [args.json=true] - Flag indicating whether to include 'Content-Type: application/json' header.
 * @param {object} [args.options] - Additional options to configure the request.
 * @returns {Promise<Response|object>} A Promise that resolves to the response object or the parsed JSON body.
 * @throws {ResponseError} If the response status is not OK (2xx).
 */
export async function rest(args = {}) {
	const {
		data,
		endpoint,
		name,
		onlyResponse = false,
		json = true,
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
	} else {
		_options.body = _options?.body ?? JSON.stringify(data)
	}

	return got({name, endpoint, options: _options, onlyResponse})
}
