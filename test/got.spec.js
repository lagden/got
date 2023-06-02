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
		name: 'requestName',
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
			name: 'requestName',
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
