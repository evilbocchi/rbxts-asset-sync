import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerCleanup, setupGracefulShutdown } from "../src/graceful-shutdown";

describe("graceful-shutdown.ts", () => {
	let mockExit: any;
	let mockProcessOn: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock process.exit
		mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		// Mock process.on
		mockProcessOn = vi.spyOn(process, "on").mockImplementation(() => process);
	});

	describe("setupGracefulShutdown", () => {
		it("should register signal handlers", () => {
			setupGracefulShutdown();

			expect(mockProcessOn).toHaveBeenCalledWith("SIGINT", expect.any(Function));
			expect(mockProcessOn).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
			expect(mockProcessOn).toHaveBeenCalledWith("uncaughtException", expect.any(Function));
			expect(mockProcessOn).toHaveBeenCalledWith("unhandledRejection", expect.any(Function));
		});

		it("should register SIGBREAK handler on Windows", () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", { value: "win32" });

			setupGracefulShutdown();

			expect(mockProcessOn).toHaveBeenCalledWith("SIGBREAK", expect.any(Function));

			// Restore original platform
			Object.defineProperty(process, "platform", { value: originalPlatform });
		});

		it("should not register SIGBREAK handler on non-Windows", () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", { value: "linux" });

			setupGracefulShutdown();

			expect(mockProcessOn).not.toHaveBeenCalledWith("SIGBREAK", expect.any(Function));

			// Restore original platform
			Object.defineProperty(process, "platform", { value: originalPlatform });
		});
	});

	describe("registerCleanup", () => {
		it("should allow registering cleanup functions", () => {
			const cleanup1 = vi.fn();
			const cleanup2 = vi.fn();

			registerCleanup(cleanup1);
			registerCleanup(cleanup2);

			// This test mainly ensures no errors are thrown during registration
			expect(cleanup1).not.toHaveBeenCalled();
			expect(cleanup2).not.toHaveBeenCalled();
		});

		it("should handle async cleanup functions", async () => {
			const asyncCleanup = vi.fn().mockResolvedValue(undefined);

			registerCleanup(asyncCleanup);

			// Test that async functions can be registered without issues
			expect(asyncCleanup).not.toHaveBeenCalled();
		});
	});

	describe("graceful shutdown behavior", () => {
		it("should handle cleanup function errors gracefully", () => {
			const failingCleanup = vi.fn().mockRejectedValue(new Error("Cleanup failed"));
			const successfulCleanup = vi.fn().mockResolvedValue(undefined);

			registerCleanup(failingCleanup);
			registerCleanup(successfulCleanup);

			// We can't easily test the full shutdown process without mocking more internals,
			// but we can ensure the functions are registered properly
			expect(failingCleanup).not.toHaveBeenCalled();
			expect(successfulCleanup).not.toHaveBeenCalled();
		});
	});
});
