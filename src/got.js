import ResponseError from './lib/response-error.js'

/**
 * Set of HTTP methods that are considered as HEAD or GET requests.
 * @type {Set<string>}
 */
const mapHeadGet = new Set(['get', 'head'])

/**
 * Map containing the AbortControllers for ongoing requests.
 * @type {Map<string, AbortController>}
 */
const controllers = new Map()

/**
 * Default options for fetch requests.
 * @type {Object}
 */
const optionsDefault = {
	method: 'POST',
	mode: 'cors',
	credentials: 'include',
	redirect: 'follow',
	referrerPolicy: 'no-referrer-when-downgrade',
}

/**
 * Abort the ongoing request with the given name.
 * @param {string} name - The name of the request.
 * @returns {AbortController} - The created AbortController instance.
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
 * Performs a fetch request.
 * @param {Object} args - The arguments for the fetch request.
 * @param {string} args.endpoint - The URL endpoint to send the request to.
 * @param {string} [args.name] - The name of the request.
 * @param {Object} [args.options] - Additional options for the fetch request.
 * @param {boolean} [args.onlyResponse=false] - Flag indicating whether to return only the response object.
 * @param {boolean} [args.ignoreAbort=false] - Flag indicating whether to ignore aborting duplicate requests.
 * @returns {Promise<any>} - A promise that resolves to the response data or the response object.
 */
export async function got(args) {
	const {
		endpoint,
		name,
		options = {},
		onlyResponse = false,
		ignoreAbort = false,
	} = args

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
 * Performs a GraphQL request using the `got` function.
 * @param {Object} args - The arguments for the GraphQL request.
 * @param {string} args.source - The GraphQL query/mutation.
 * @param {Object} [args.variableValues] - The variable values for the GraphQL request.
 * @param {string} [args.operationName] - The operation name for the GraphQL request.
 * @param {string} args.endpoint - The URL endpoint to send the request to.
 * @param {string} [args.name] - The name of the request.
 * @param {Object} [args.options] - Additional options for the fetch request.
 * @returns {Promise<any>} - A promise that resolves to the response data.
 * @throws {ResponseError} If the response status is not OK (2xx).
 */
export async function gql(args) {
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
 * Performs a RESTful request using the `got` function.
 * @param {Object} args - The arguments for the RESTful request.
 * @param {any} args.data - The data to send in the request body.
 * @param {string} args.endpoint - The URL endpoint to send the request to.
 * @param {string} [args.name] - The name of the request.
 * @param {boolean} [args.onlyResponse=false] - Flag indicating whether to return only the response object.
 * @param {boolean} [args.json=true] - Flag indicating whether to set the 'Content-Type' header to 'application/json'.
 * @param {Object} [args.options] - Additional options for the fetch request.
 * @returns {Promise<any>} - A promise that resolves to the response data or the response object.
 * @throws {ResponseError} If the response status is not OK (2xx).
 */
export async function rest(args) {
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
