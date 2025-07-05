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
    ],
    moduleNameMapper: {
        // Only map .js to .ts for relative imports (./ or ../)
        '^\./(.*)\\.js$': '<rootDir>/$1.ts',
        '^\.\./(.*)\\.js$': '<rootDir>/../$1.ts',
    },
};