import test from 'ava'
import uWS from 'uWebSockets.js'
import {server} from './helper/server.js'
import {
	got,
	gql,
	rest,
} from '../src/got.js'

test.before(async t => {
	const {token, http} = await server()
	t.context = {token, http}
})

test.after(t => {
	if (t.context.token) {
		uWS.us_listen_socket_close(t.context.token)
	}
})

test('got function - should return response object', async t => {
	const response = await got({
		name: 'gotName',
		endpoint: t.context.http,
		options: {
			method: 'GET',
		},
		ignoreAbort: true,
		onlyResponse: true,
	})

	t.is(typeof response, 'object')
	t.deepEqual(await response.text(), 'Nothing to see here!')
})

test('got function - should throw ResponseError', async t => {
	const error = await t.throwsAsync(async () => {
		await got({
			name: 'gotError',
			endpoint: `${t.context.http}/status/500`,
			options: {
				method: 'GET',
			},
			ignoreAbort: true,
			onlyResponse: true,
		})
	})

	t.is(error.name, 'ResponseError')
	t.is(error.message, 'Internal Server Error')
	t.is(error.status, 500)
	t.is(error.statusCode, 500)
	t.is(error.statusText, 'Internal Server Error')
	t.deepEqual(error.body, {status: 500, error: 'Internal Server Error'})
})

test('gql function - should return response object', async t => {
	const response = await gql({
		source: 'query {data}',
		endpoint: `${t.context.http}/data`,
		name: 'gqlRequest',
	})

	t.is(typeof response, 'object')
	t.deepEqual(response, {data: {source: 'query {data}'}})
})

test('rest function - should return response object', async t => {
	const response = await rest({
		data: {key: 'value'},
		endpoint: `${t.context.http}/data`,
		name: 'restRequest',
	})

	t.is(typeof response, 'object')
	t.deepEqual(response, {data: {key: 'value'}})
})

test('rest function - should abort the first request', async t => {
	const promises = [
		rest({endpoint: `${t.context.http}/json?a=1`, name: 'restRequestAbort', options: {method: 'GET'}}),
		rest({endpoint: `${t.context.http}/json?b=1`, name: 'restRequestAbort', options: {method: 'GET'}}),
	]
	const results = await Promise.allSettled(promises)
	t.is(typeof results, 'object')
})

test('rest function - no data - should return response object', async t => {
	const response = await rest({
		endpoint: 'https://registry.npmjs.org/@tadashi/got/latest',
		name: 'restRequestNoData',
		json: false,
		options: {
			method: 'GET',
			credentials: 'omit',
		},
	})

	t.is(typeof response, 'object')
})

test('rest got - simple - should return response object', async t => {
	const response = await got({
		endpoint: 'https://registry.npmjs.org/@tadashi/got/latest',
	})

	t.is(typeof response, 'object')
})

test('redirect post', async t => {
	const response = await rest({
		data: {value: '30030030030'},
		endpoint: `${t.context.http}/redirect`,
		name: 'restRedirect',
		options: {
			method: 'POST',
		},
	})

	t.is(response.data.value, '30030030030')
	t.is(typeof response, 'object')
})

test('redirect post loop - should throw ResponseError', async t => {
	const error = await t.throwsAsync(async () => {
		await got({
			name: 'gotLoopError',
			endpoint: `${t.context.http}/redirect-loop`,
			options: {
				method: 'POST',
			},
			ignoreAbort: true,
			onlyResponse: true,
			maxRedirects: 1,
		})
	})

	t.is(error.name, 'ResponseError')
	t.is(error.message, 'ERR_TOO_MANY_REDIRECTS')
	t.is(error.status, 429)
})

test('rest function - should return response text', async t => {
	const error = await t.throwsAsync(async () => {
		await got({
			name: 'gotError',
			endpoint: `${t.context.http}/any`,
			options: {
				method: 'GET',
			},
		})
	})

	t.is(error.name, 'ResponseError')
	t.is(error.message, 'Unauthorized')
	t.is(error.status, 401)
	t.is(error.statusCode, 401)
	t.is(error.statusText, 'Unauthorized')
	t.is(error.body, 'Unauthorized')
})
