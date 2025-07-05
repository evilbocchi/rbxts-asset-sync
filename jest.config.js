export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    globals: {
        'ts-jest': {
            tsconfig: 'test/tsconfig.test.json',
        },
    },
    testMatch: [
        '<rootDir>/test/**/*.test.ts',
    ]
};