export class UnauthorizedAccessError extends Error {
    constructor() {
        super("Unauthorized access");

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, UnauthorizedAccessError.prototype);
    }
}

export class TaskNotFoundError extends Error {
    constructor() {
        super("Task not found");

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, TaskNotFoundError.prototype);
    }
}