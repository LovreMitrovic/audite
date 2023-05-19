class NotFoundDatabaseError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

module.exports = NotFoundDatabaseError;