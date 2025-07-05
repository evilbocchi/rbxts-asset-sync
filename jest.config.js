/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.ts'],
    verbose: false,
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        "^.+\\.ts$": ["ts-jest", { useESM: true }],
    },
    moduleNameMapper: {
        '(.+)\\.js': '$1'
    },
};