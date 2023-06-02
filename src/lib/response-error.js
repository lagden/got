/**
 * Custom error class representing an HTTP response error.
 */
class ResponseError extends Error {
	/**
	 * Create a new ResponseError instance.
	 *
	 * @param {string} message - The error message.
	 * @param {number} status - The HTTP status code.
	 * @param {object} [body] - The response body object (optional).
	 */
	constructor(message, status, body) {
		super(message)
		this.status = status
		this.statusCode = status
		this.statusText = message
		this.body = body
		this.name = 'ResponseError'
	}
}

export default ResponseError
