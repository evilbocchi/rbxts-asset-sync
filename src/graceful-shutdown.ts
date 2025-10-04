import LOGGER from "./logging.js";

type CleanupFunction = () => Promise<void> | void;

/**
 * Registry of cleanup functions to run when the process exits.
 */
const cleanupFunctions: CleanupFunction[] = [];

/**
 * Flag to prevent multiple shutdown processes from running simultaneously.
 */
let isShuttingDown = false;

/**
 * Registers a cleanup function to be called when the process exits.
 * These functions will be called in reverse order (LIFO) of registration.
 *
 * @param cleanup - Function to call during shutdown
 *
 * @example
 * ```typescript
 * registerCleanup(async () => {
 *   await saveCache();
 *   LOGGER.info("Cache saved during shutdown");
 * });
 * ```
 */
export function registerCleanup(cleanup: CleanupFunction): void {
	cleanupFunctions.push(cleanup);
}

/**
 * Executes all registered cleanup functions and exits the process gracefully.
 * This function ensures that all async operations complete before the process terminates.
 */
async function gracefulShutdown(signal: string): Promise<void> {
	if (isShuttingDown) {
		LOGGER.warn("Shutdown already in progress, forcing exit...");
		process.exit(1);
	}

	isShuttingDown = true;
	LOGGER.info(`Received ${signal}. Performing graceful shutdown...`);

	try {
		// Set up a timeout to force exit if cleanup takes too long
		const forceExitTimeout = setTimeout(() => {
			LOGGER.warn("Graceful shutdown taking too long, forcing exit...");
			process.exit(1);
		}, 30000); // 30 seconds timeout

		// Execute cleanup functions in reverse order (LIFO)
		for (let i = cleanupFunctions.length - 1; i >= 0; i--) {
			const cleanup = cleanupFunctions[i];
			try {
				LOGGER.debug(`Executing cleanup function ${i + 1}/${cleanupFunctions.length}...`);
				await cleanup();
			} catch (error) {
				LOGGER.error(`Error during cleanup function ${i + 1}:`, error);
			}
		}

		// Clear the force exit timeout since we completed successfully
		clearTimeout(forceExitTimeout);

		LOGGER.info("Graceful shutdown completed successfully.");
		process.exit(0);
	} catch (error) {
		LOGGER.error("Error during graceful shutdown:", error);
		process.exit(1);
	}
}

/**
 * Sets up process signal handlers for graceful shutdown.
 * This should be called once at application startup.
 *
 * Handles the following signals:
 * - SIGINT (Ctrl+C)
 * - SIGTERM (termination signal)
 * - SIGBREAK (Windows Ctrl+Break)
 */
export function setupGracefulShutdown(): void {
	// Handle Ctrl+C (SIGINT)
	process.on("SIGINT", () => {
		gracefulShutdown("SIGINT");
	});

	// Handle termination signal (SIGTERM)
	process.on("SIGTERM", () => {
		gracefulShutdown("SIGTERM");
	});

	// Handle Windows Ctrl+Break (SIGBREAK)
	if (process.platform === "win32") {
		process.on("SIGBREAK", () => {
			gracefulShutdown("SIGBREAK");
		});
	}

	// Handle uncaught exceptions
	process.on("uncaughtException", (error) => {
		LOGGER.fatal("Uncaught exception:", error);
		gracefulShutdown("uncaughtException");
	});

	// Handle unhandled promise rejections
	process.on("unhandledRejection", (reason) => {
		LOGGER.fatal("Unhandled promise rejection:", reason);
		gracefulShutdown("unhandledRejection");
	});

	LOGGER.debug("Graceful shutdown handlers registered.");
}

/**
 * Forces immediate exit without cleanup.
 * This should only be used in extreme cases where graceful shutdown is not possible.
 */
export function forceExit(): never {
	LOGGER.warn("Forcing immediate exit...");
	process.exit(1);
}
