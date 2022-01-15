class Client {

	#initialized = false;

	constructor() {
		this.#initialized = true;
	}

	initialized() {
		return this.#initialized;
	}

}

export { Client };
