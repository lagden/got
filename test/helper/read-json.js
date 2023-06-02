/* Helper function for reading a posted JSON body */
function readJson(res, cb, err) {
	let buffer

	res.onData((ab, isLast) => {
		const chunk = Buffer.from(ab)
		if (isLast) {
			let json
			if (buffer) {
				try {
					json = JSON.parse(Buffer.concat([buffer, chunk]))
				} catch {
					res.close()
					return
				}
				cb(json)
			} else {
				try {
					json = JSON.parse(chunk)
				} catch {
					res.close()
					return
				}
				cb(json)
			}
		} else {
			buffer = buffer ? Buffer.concat([buffer, chunk]) : Buffer.concat([chunk])
		}
	})

	/* Register error cb */
	res.onAborted(err)
}

export default readJson
